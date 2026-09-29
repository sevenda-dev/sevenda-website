-- ════════════════════════════════════════════════════════════════════════════
-- Sevenda — Iscritti newsletter e codice sconto di benvenuto  (staging hxht → prod jqxx)
-- ════════════════════════════════════════════════════════════════════════════
-- Accompagna la Edge Function newsletter-subscribe v1 e create-subscription v14.
--
-- COSA AGGIUNGE
--   newsletter_subscriber — una riga per email iscritta dalla modale della
--     landing page (index.html). Oltre all'anagrafica minima (nome, cognome,
--     telefono facoltativo, lingua) conserva il codice sconto di benvenuto:
--     promo_code è il testo che il cliente digita al checkout,
--     stripe_promotion_code_id è l'oggetto Stripe (promo_…) che lo rappresenta,
--     promo_expires_at la sua scadenza. Il codice è UNO PER EMAIL: una seconda
--     iscrizione con la stessa email non ne genera un altro, riceve lo stesso.
--
-- CHI SCRIVE E CHI LEGGE
--   Solo la Edge Function newsletter-subscribe, con la service role. La RLS è
--   attiva e NON esistono policy: dal client (anon key) la tabella non è né
--   leggibile né scrivibile, quindi nessuno può enumerare gli iscritti o
--   leggere i codici altrui. È lo stesso schema di einvoice_job.
--
-- NESSUN CHECK SUL FORMATO, per la stessa lezione della migrazione
-- 2026-09-22: un vincolo violato produrrebbe una riga persa (un lead perso)
-- invece di un campo rifiutato. Email, telefono e lingua sono validati e
-- normalizzati dalla Edge Function prima di qualunque scrittura
-- (email in minuscolo, lingua fra it/en/es/fr).
--
-- IDEMPOTENTE: `create table if not exists`, `create index if not exists` e
-- `alter table … enable row level security` sono no-op alla seconda esecuzione.
--
-- ESECUZIONE: le tre sezioni vanno lanciate SEPARATAMENTE nell'editor SQL di
-- Supabase, così ogni result set è visibile.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 1 — DIAGNOSI (sola lettura, nessuna scrittura)
-- ════════════════════════════════════════════════════════════════════════════
-- Atteso prima della migrazione: tabella_gia_presente = false.

select exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'newsletter_subscriber'
) as tabella_gia_presente;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 2 — MIGRAZIONE
-- ════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.newsletter_subscriber (
  id                        uuid primary key default gen_random_uuid(),
  -- Sempre in minuscolo (normalizzata dalla Edge Function): è la chiave con
  -- cui si decide se un'iscrizione è nuova o ripetuta.
  email                     text not null,
  first_name                text not null,
  last_name                 text not null,
  -- Facoltativo per scelta di prodotto: prefisso internazionale + numero,
  -- così com'è stato digitato (spazi rimossi), es. "+393331234567".
  phone                     text,
  -- Lingua dell'interfaccia al momento dell'iscrizione (it/en/es/fr): decide
  -- la lingua dell'email con il codice e delle comunicazioni successive.
  locale                    text not null default 'en',
  -- Da dove arriva l'iscrizione ("landing-modal" per la modale di index.html).
  source                    text not null default 'landing-modal',
  -- Codice di benvenuto: NULL finché Stripe non lo ha creato (es. Stripe non
  -- raggiungibile al momento dell'iscrizione: il lead resta, il codice arriva
  -- al tentativo successivo con la stessa email).
  promo_code                text,
  stripe_promotion_code_id  text,
  promo_expires_at          timestamptz,
  -- Momento in cui l'utente ha premuto "Iscriviti" accettando l'informativa:
  -- è la prova del consenso alle comunicazioni commerciali.
  consent_at                timestamptz not null default now(),
  unsubscribed_at           timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint newsletter_subscriber_email_key unique (email)
);

create index if not exists newsletter_subscriber_promo_code_idx
  on public.newsletter_subscriber (promo_code)
  where promo_code is not null;

-- RLS attiva, nessuna policy: solo la service role (Edge Function) passa.
alter table public.newsletter_subscriber enable row level security;

comment on table public.newsletter_subscriber is
  'Iscritti alla newsletter dalla modale della landing page. Una riga per email; conserva il codice sconto di benvenuto (promotion code Stripe, monouso). Scritta e letta SOLO da newsletter-subscribe con la service role: RLS attiva senza policy.';

comment on column public.newsletter_subscriber.promo_code is
  'Codice sconto di benvenuto, così come lo digita il cliente al checkout (es. SEVENDA-7K2QXD). Corrisponde a un Promotion Code Stripe monouso sul coupon STRIPE_NEWSLETTER_COUPON_ID. NULL se Stripe non l''ha ancora creato.';

comment on column public.newsletter_subscriber.stripe_promotion_code_id is
  'Id dell''oggetto Promotion Code su Stripe (promo_…). È quello che create-subscription v14 applica alla subscription (discounts[0][promotion_code]).';

comment on column public.newsletter_subscriber.promo_expires_at is
  'Scadenza del codice, la stessa impostata su Stripe (expires_at). Dopo questa data il codice non è più applicabile e non ne viene generato un altro per la stessa email.';

commit;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 3 — VERIFICA (sola lettura)
-- ════════════════════════════════════════════════════════════════════════════
-- Attese: 14 colonne; rowsecurity = true; nessuna policy.

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'newsletter_subscriber'
order by ordinal_position;

select relrowsecurity as rowsecurity
from pg_class
where oid = 'public.newsletter_subscriber'::regclass;

select count(*) as policy_count
from pg_policies
where schemaname = 'public' and tablename = 'newsletter_subscriber';
