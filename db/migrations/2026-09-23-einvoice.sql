-- ════════════════════════════════════════════════════════════════════════════
-- Sevenda — Outbox per l'emissione della fattura elettronica (SDI via Aruba)
--                                                        (staging hxht → prod jqxx)
-- ════════════════════════════════════════════════════════════════════════════
-- Accompagna stripe-webhook v17 e la nuova Edge Function aruba-einvoice-submit.
--
-- PERCHÉ UNA OUTBOX E NON UNA CHIAMATA DIRETTA DA handleInvoice.
-- handleInvoice deve restare veloce e non può dipendere dall'esito di un
-- servizio esterno: se la chiamata ad Aruba fallisse o fosse lenta, l'errore
-- diventerebbe un 500, Stripe ritenterebbe l'intero evento webhook, e si
-- rischierebbe di rieseguire tutto il resto di handleInvoice (comunicazioni
-- comprese) solo per un problema di rete verso un servizio terzo. Lo stesso
-- principio che regge sendEmail() qui diventa una tabella: handleInvoice si
-- limita a SCRIVERE l'intenzione ("questa fattura va emessa verso SDI"), un
-- worker separato (aruba-einvoice-submit) la legge ed esegue, con i propri
-- retry e la propria gestione d'errore, senza toccare l'idempotenza del
-- webhook Stripe.
--
-- COSA SCRIVE handleInvoice: una riga per ogni invoice.id con provider='aruba'
-- e status='paid' — cioè le sole fatture italiane (il provider è già 'aruba'
-- solo per country='IT', vedi handleInvoice). UNIQUE su invoice_id: un retry
-- dell'evento Stripe (o un secondo invoice.paid sulla stessa fattura, che non
-- dovrebbe accadere ma non è impedito lato Stripe) non accoda un secondo job.
--
-- IL NUMERO PROGRESSIVO SI ASSEGNA QUI, NON NEL WORKER. einvoice_number_seq è
-- una sequence Postgres: atomica per costruzione, quindi due invocazioni
-- concorrenti di handleInvoice non possono mai ricevere lo stesso numero. Il
-- numero si assegna alla CREAZIONE del job (quindi quando la fattura risulta
-- pagata), non al momento dell'invio ad Aruba: se il worker fallisse e
-- riprovasse più tardi, il documento deve mantenere lo stesso numero già
-- comunicato nell'eventuale tentativo precedente, non uno nuovo. Una sequence
-- non torna mai indietro nemmeno se la transazione che l'ha letta fallisce
-- (comportamento Postgres di default): è un buco nella numerazione, non un
-- duplicato — l'unico dei due errori che la normativa tollera.
--
-- STATI: pending (creato, mai tentato) → submitted (Aruba ha preso in carico
-- il file, esito SDI non ancora noto) → delivered | rejected | error. La
-- risoluzione fra submitted e l'esito finale (Consegnata / Scartata / Recapito
-- impossibile) NON è ancora implementata: aruba-einvoice-submit si ferma a
-- 'submitted' e la riconciliazione (polling findInvoices o callback push
-- createNotification) è il prossimo passo, non questo.
--
-- dry_run REGISTRATO SULLA RIGA, non solo passato ad Aruba: un job creato con
-- ARUBA_DRY_RUN=true non deve mai essere confuso con un invio vero in una
-- query successiva. Il valore è quello ATTIVO al momento del tentativo, letto
-- dal worker dal proprio secret — qui si registra solo cosa è successo
-- davvero, a scopo di audit.
--
-- xml_base64 SI CONSERVA: è il documento legale così come è stato firmato e
-- trasmesso (o che sarebbe stato trasmesso, in dry run). Ricostruirlo al
-- volo per un controllo a posteriori — dopo un cambio nel builder, per
-- esempio — darebbe un XML diverso da quello realmente inviato.
--
-- ESECUZIONE: le tre sezioni vanno lanciate SEPARATAMENTE. L'editor SQL di
-- Supabase mostra un solo result set per esecuzione, quindi lanciando tutto
-- insieme le diagnosi non si vedrebbero.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 1 — DIAGNOSI (sola lettura, nessuna scrittura)
-- ════════════════════════════════════════════════════════════════════════════

select
  exists (select 1 from information_schema.sequences
    where sequence_schema = 'public' and sequence_name = 'einvoice_number_seq') as sequence_gia_presente,
  exists (select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'einvoice_job') as tabella_gia_presente;

-- Il tipo di invoice.id NON è verificabile da questo repo: la tabella invoice
-- non è mai stata creata da una migrazione qui dentro (esiste già in
-- produzione, creata altrove). La Sezione 2 assume 'uuid', coerente con
-- organization.owner_id (che rispecchia auth.users.id, uuid per Supabase Auth)
-- e con la convenzione delle chiavi primarie generate da Supabase. Se questa
-- query mostra un tipo diverso, correggere 'uuid' nella CREATE TABLE della
-- Sezione 2 PRIMA di eseguirla — altrimenti fallisce con un errore di tipo,
-- rumoroso e non distruttivo, ma va comunque sistemato qui.
select pg_typeof(id) as tipo_invoice_id from public.invoice limit 1;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 2 — MIGRAZIONE
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- Parte da 1: nessuna fattura elettronica è mai stata emessa su questo canale
-- prima di questa integrazione. Se risultasse falso (es. fatture emesse a mano
-- da continuare sulla stessa serie), la sequence va allineata con
-- setval('public.einvoice_number_seq', N, false) PRIMA del primo utilizzo —
-- farlo dopo significherebbe numeri già comunicati a SDI da recuperare a mano.
create sequence if not exists public.einvoice_number_seq
  as bigint
  start with 1
  increment by 1
  no cycle;

create table if not exists public.einvoice_job (
  id                bigint generated always as identity primary key,
  invoice_id        uuid not null references public.invoice(id),
  sdi_number        bigint not null default nextval('public.einvoice_number_seq'),
  status            text not null default 'pending'
                      check (status in ('pending', 'submitted', 'delivered', 'rejected', 'error')),
  -- Esito dei controlli sincroni di Aruba (upload) o del trasporto: NON è
  -- l'esito SDI, che arriverà con la riconciliazione (prossimo passo).
  aruba_error_code  text,
  aruba_error_detail text,
  -- Nome file che Aruba assegna alla fattura (uploadFileName) — la chiave con
  -- cui si cerca lo stato più avanti (findInvoices/getInvoiceDetail).
  upload_filename   text,
  -- Identificativo SDI, disponibile solo a invio riuscito.
  sdi_identification text,
  dry_run           boolean not null default true,
  xml_base64        text,
  attempt_count     int not null default 0,
  last_attempt_at   timestamptz,
  submitted_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (invoice_id)
);

create index if not exists einvoice_job_status_idx
  on public.einvoice_job (status)
  where status in ('pending', 'error');

comment on table public.einvoice_job is
  'Outbox per l''emissione della fattura elettronica verso SDI tramite Aruba. Una riga per fattura italiana pagata (invoice.provider = ''aruba''). Scritta da stripe-webhook (handleInvoice), letta ed eseguita da aruba-einvoice-submit. Lo stato copre solo submit/errore di trasporto: la risoluzione dell''esito SDI (consegnata/scartata) è un passo successivo, non ancora implementato.';

comment on column public.einvoice_job.sdi_number is
  'Numero progressivo del documento fiscale elettronico (tag <Numero> 1.2.1.2), assegnato da una sequence atomica alla CREAZIONE del job, non al momento dell''invio: un retry deve riusare lo stesso numero già eventualmente comunicato. Indipendente dal numero fattura Stripe (invoice.number) — nessun impatto sulla numerazione Stripe.';

comment on column public.einvoice_job.dry_run is
  'true se il tentativo più recente è stato eseguito con dryRun=true (validato ma non trasmesso a SDI). Riflette il secret ARUBA_DRY_RUN attivo al momento del tentativo, non una preferenza — serve a non confondere in query un invio vero con un test.';

commit;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 3 — VERIFICA (sola lettura)
-- ════════════════════════════════════════════════════════════════════════════

select nextval('public.einvoice_number_seq') as prossimo_numero;   -- atteso: 1
select setval('public.einvoice_number_seq', 1, false);              -- riporta la sequence a 1: la select sopra l'ha consumato solo per verificarla

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'einvoice_job'
order by ordinal_position;
