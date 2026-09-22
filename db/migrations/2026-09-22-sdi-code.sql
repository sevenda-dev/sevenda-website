-- ════════════════════════════════════════════════════════════════════════════
-- Sevenda — Codice Destinatario SDI                    (staging hxht → prod jqxx)
-- ════════════════════════════════════════════════════════════════════════════
-- Accompagna create-subscription v13 e stripe-webhook v16.
--
-- COSA AGGIUNGE
--   billing_profile.sdi_code — il codice in anagrafica, accanto a vat_id. Lo
--     scrive resolveOrg alla creazione dell'organization e handleCustomer a
--     ogni customer.updated, esattamente come già fa per la partita IVA.
--   invoice.sdi_code — lo snapshot al momento dell'emissione. Per un documento
--     fiscale conta il valore che sta stampato su QUELLA fattura, non quello
--     che il cliente ha in anagrafica oggi: il webhook lo legge quindi dai
--     custom_fields della fattura, che Stripe congela alla finalizzazione, e
--     ripiega sul metadata del Customer solo per le fatture emesse prima della
--     v13.
--
-- ENTRAMBE NULLABLE, E SENZA CHECK SUL FORMATO. Non è pigrizia, è la lezione
-- della v13 del webhook: una colonna NOT NULL, o un CHECK violato, produce un
-- SQLSTATE di classe 23, che dbFail() classifica come NonRetryableError. Il
-- risultato non sarebbe "campo fiscale rifiutato" ma "intera riga invoice
-- persa", cioè un danno molto più grande di quello che il vincolo voleva
-- prevenire. Il formato (sette caratteri alfanumerici, oppure 0000000) è
-- imposto in due punti che possono fallire senza distruggere nulla:
-- checkout.html sul form, e create-subscription v13 prima di qualunque
-- scrittura su Stripe.
--
-- NESSUN BACKFILL, e non è una dimenticanza: il dato non esisteva da nessuna
-- parte prima della v13. I metadata dei Customer già creati non hanno la chiave
-- sdiCode e le fatture già emesse non hanno il custom field, quindi non c'è
-- sorgente da cui recuperarlo. Le righe preesistenti restano NULL e i clienti
-- italiani già attivi andranno ricontattati quando l'emissione elettronica
-- verrà costruita — oppure il codice arriverà da solo al primo customer.updated
-- successivo a un passaggio dal checkout.
--
-- IDEMPOTENTE: `add column if not exists` non fa nulla la seconda volta, e non
-- c'è alcuna scrittura sui dati. Rieseguire lo script è un no-op.
--
-- ESECUZIONE: le tre sezioni vanno lanciate SEPARATAMENTE. L'editor SQL di
-- Supabase mostra un solo result set per esecuzione, quindi lanciando tutto
-- insieme le diagnosi non si vedrebbero.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 1 — DIAGNOSI (sola lettura, nessuna scrittura)
-- ════════════════════════════════════════════════════════════════════════════
-- Da lanciare per prima. Dice se le colonne esistono già — per esempio se lo
-- script è stato applicato su staging e si sta rilanciando su produzione.
-- Due righe con exists = false è lo stato atteso prima della migrazione.

select
  t.table_name,
  exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name   = t.table_name
      and c.column_name  = 'sdi_code'
  ) as colonna_gia_presente
from (values ('billing_profile'), ('invoice')) as t(table_name);


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 2 — MIGRAZIONE
-- ════════════════════════════════════════════════════════════════════════════
-- Le due ALTER sono in una transazione sola: o il modello dati si muove tutto
-- insieme, o non si muove. Un webhook che trovasse invoice.sdi_code ma non
-- billing_profile.sdi_code fallirebbe a metà scrittura.

begin;

alter table public.billing_profile
  add column if not exists sdi_code text;

alter table public.invoice
  add column if not exists sdi_code text;

comment on column public.billing_profile.sdi_code is
  'Codice Destinatario SDI dell''anagrafica cliente: 7 caratteri alfanumerici, oppure 0000000 per il recapito nel cassetto fiscale. Valorizzato solo per le aziende italiane. Scritto da stripe-webhook v16 da customer.metadata.sdiCode.';

comment on column public.invoice.sdi_code is
  'Codice Destinatario SDI al momento dell''emissione di QUESTA fattura, letto dai custom_fields Stripe congelati alla finalizzazione. NULL sulle fatture precedenti a create-subscription v13. Non allineare a billing_profile: sono due fatti diversi.';

commit;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 3 — VERIFICA (sola lettura)
-- ════════════════════════════════════════════════════════════════════════════
-- Attese: due righe, data_type 'text', is_nullable 'YES'.

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name  = 'sdi_code'
order by table_name;
