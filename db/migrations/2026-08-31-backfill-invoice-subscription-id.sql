-- ════════════════════════════════════════════════════════════════════════════
-- Sevenda — backfill di invoice.subscription_id            (produzione, jqxx)
-- ════════════════════════════════════════════════════════════════════════════
-- Accompagna la v11 di stripe-webhook. La v11 corregge il percorso per gli
-- eventi FUTURI; questo script ripara le righe già scritte.
--
-- Perché servono entrambi: handleInvoice leggeva inv.subscription, campo che
-- l'API 2026-04-22.dahlia non invia più. Le fatture sono quindi state scritte
-- correttamente in tutto tranne che nel legame con l'abbonamento.
--
-- Perché la fonte è stripe_event e non Stripe: questo script gira in dashboard,
-- senza accesso all'API. Il payload integrale di ogni evento è però già
-- persistito in stripe_event.payload dall'entry point del webhook, quindi il
-- dato non va recuperato da nessuna parte — va solo letto dove è sempre stato.
--
-- Perché il percorso JSON è IDENTICO a quello di invoiceSubscriptionId() nella
-- v11: se il percorso fosse sbagliato, questo script non troverebbe nulla e il
-- difetto salterebbe fuori qui invece di restare nascosto in un backfill che
-- "sembra" aver funzionato. Due implementazioni divergenti darebbero l'effetto
-- opposto: un backfill che riempie le righe e un webhook che continua a
-- lasciarle vuote.
--
-- NESSUN DELETE, in nessun blocco. La sola scrittura è una UPDATE ristretta
-- alle righe con subscription_id IS NULL: rieseguire lo script è un no-op.
--
-- ESECUZIONE: le tre sezioni vanno lanciate SEPARATAMENTE. L'editor SQL di
-- Supabase mostra un solo result set per esecuzione, quindi lanciando tutto
-- insieme le diagnosi non si vedrebbero.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 1 — DIAGNOSI (sola lettura, nessuna scrittura)
-- ════════════════════════════════════════════════════════════════════════════
-- Da lanciare per prima. Dice quante righe sono scollegate e, per ognuna, se
-- l'evento che la riguarda è ancora in stripe_event e quale subscription
-- nomina. Una riga con stripe_subscription_id NULL qui NON verrà riparata
-- dalla Sezione 2: o l'evento è stato ripulito, o il payload usa un percorso
-- ancora diverso, e in entrambi i casi va guardata a mano prima di procedere.

WITH ev AS (
  -- Aggregata PER FATTURA, non per evento: la stessa invoice ha in genere sia
  -- invoice.finalized sia invoice.paid, e senza il GROUP BY comparirebbe due
  -- volte nel referto. max() ignora i NULL, quindi restituisce l'id anche se
  -- solo uno dei due eventi lo porta; n_subscription_distinte segnala il caso
  -- che non deve esistere, cioè una fattura che ne nomina più di una.
  SELECT
    e.payload->'data'->'object'->>'id' AS stripe_invoice_id,
    -- stesso ordine di invoiceSubscriptionId(): prima l'API corrente, poi il
    -- campo storico. COALESCE ignora i NULL, quindi il fallback scatta solo
    -- quando il primo percorso non c'è.
    max(COALESCE(
      e.payload->'data'->'object'->'parent'->'subscription_details'->>'subscription',
      e.payload->'data'->'object'->>'subscription'
    )) AS stripe_subscription_id,
    count(DISTINCT COALESCE(
      e.payload->'data'->'object'->'parent'->'subscription_details'->>'subscription',
      e.payload->'data'->'object'->>'subscription'
    )) AS n_subscription_distinte,
    count(*) AS n_eventi
  FROM public.stripe_event e
  WHERE e.type IN ('invoice.paid', 'invoice.finalized', 'invoice.payment_failed')
    AND e.payload->'data'->'object'->>'object' = 'invoice'
  GROUP BY 1
)
SELECT
  i.stripe_invoice_id,
  i.number,
  i.status,
  i.subscription_id                        AS subscription_id_attuale,
  ev.n_eventi                              AS eventi_in_stripe_event,
  ev.stripe_subscription_id                AS subscription_stripe_dal_payload,
  s.id                                     AS subscription_id_risolto,
  CASE
    WHEN i.subscription_id IS NOT NULL          THEN 'già collegata'
    WHEN ev.n_subscription_distinte > 1         THEN 'AMBIGUA: piu subscription negli eventi, la Sezione 2 si fermera'
    WHEN ev.stripe_subscription_id IS NULL      THEN 'NON RIPARABILE: evento assente o percorso diverso'
    WHEN s.id IS NULL                           THEN 'NON RIPARABILE: subscription non presente in DB'
    ELSE 'riparabile'
  END                                      AS esito_previsto
FROM public.invoice i
LEFT JOIN ev
  ON ev.stripe_invoice_id = i.stripe_invoice_id
LEFT JOIN public.subscription s
  ON s.stripe_subscription_id = ev.stripe_subscription_id
ORDER BY i.stripe_invoice_id;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 2 — BACKFILL (transazione unica, idempotente)
-- ════════════════════════════════════════════════════════════════════════════
-- Da lanciare dopo aver letto la Sezione 1. Se qualcosa non torna, la
-- transazione si interrompe da sola e non scrive nulla.

BEGIN;

-- Guardia. Un'invoice che nel suo storico eventi nomina DUE subscription
-- diverse non è un caso previsto: significherebbe che il percorso JSON pesca
-- qualcosa che non è il legame della fattura. In quel caso è meglio fermarsi
-- che scrivere il primo valore che capita — la UPDATE più sotto non avrebbe un
-- criterio per scegliere.
DO $$
DECLARE
  ambigue int;
BEGIN
  SELECT count(*) INTO ambigue
  FROM (
    SELECT e.payload->'data'->'object'->>'id' AS inv_id
    FROM public.stripe_event e
    WHERE e.type IN ('invoice.paid', 'invoice.finalized', 'invoice.payment_failed')
      AND e.payload->'data'->'object'->>'object' = 'invoice'
      AND COALESCE(
            e.payload->'data'->'object'->'parent'->'subscription_details'->>'subscription',
            e.payload->'data'->'object'->>'subscription'
          ) IS NOT NULL
    GROUP BY 1
    HAVING count(DISTINCT COALESCE(
             e.payload->'data'->'object'->'parent'->'subscription_details'->>'subscription',
             e.payload->'data'->'object'->>'subscription'
           )) > 1
  ) t;

  IF ambigue > 0 THEN
    RAISE EXCEPTION
      'backfill interrotto: % invoice nominano piu di una subscription nei loro eventi', ambigue;
  END IF;
END $$;

-- L'unica scrittura. Il filtro su subscription_id IS NULL è ciò che rende lo
-- script rieseguibile: una riga già collegata non viene toccata, nemmeno per
-- riscriverle lo stesso valore.
WITH ev AS (
  SELECT DISTINCT
    e.payload->'data'->'object'->>'id' AS stripe_invoice_id,
    COALESCE(
      e.payload->'data'->'object'->'parent'->'subscription_details'->>'subscription',
      e.payload->'data'->'object'->>'subscription'
    ) AS stripe_subscription_id
  FROM public.stripe_event e
  WHERE e.type IN ('invoice.paid', 'invoice.finalized', 'invoice.payment_failed')
    AND e.payload->'data'->'object'->>'object' = 'invoice'
    AND COALESCE(
          e.payload->'data'->'object'->'parent'->'subscription_details'->>'subscription',
          e.payload->'data'->'object'->>'subscription'
        ) IS NOT NULL
)
UPDATE public.invoice i
   SET subscription_id = s.id
  FROM ev
  JOIN public.subscription s
    ON s.stripe_subscription_id = ev.stripe_subscription_id
 WHERE ev.stripe_invoice_id = i.stripe_invoice_id
   AND i.subscription_id IS NULL;

-- Riepilogo prima del COMMIT: se le righe ancora scollegate non sono zero,
-- confrontarle con l'esito_previsto della Sezione 1 prima di confermare.
DO $$
DECLARE
  collegate   int;
  scollegate  int;
BEGIN
  SELECT count(*) FILTER (WHERE subscription_id IS NOT NULL),
         count(*) FILTER (WHERE subscription_id IS NULL)
    INTO collegate, scollegate
  FROM public.invoice;
  RAISE NOTICE 'invoice collegate: % · ancora scollegate: %', collegate, scollegate;
END $$;

COMMIT;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 3 — VERIFICA (sola lettura, dopo il COMMIT)
-- ════════════════════════════════════════════════════════════════════════════

SELECT
  i.stripe_invoice_id,
  i.number,
  i.status,
  i.total_cents,
  i.subscription_id,
  s.stripe_subscription_id,
  s.plan_id,
  s.status AS subscription_status
FROM public.invoice i
LEFT JOIN public.subscription s ON s.id = i.subscription_id
ORDER BY i.subscription_id NULLS FIRST, i.stripe_invoice_id;
