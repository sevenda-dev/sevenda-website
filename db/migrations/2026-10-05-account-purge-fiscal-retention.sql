-- ════════════════════════════════════════════════════════════════════════════
-- Sevenda — Conservazione delle fatture elettroniche all'eliminazione account
--                                                        (staging hxht → prod jqxx)
-- ════════════════════════════════════════════════════════════════════════════
-- Accompagna aruba-einvoice-submit v2. Nessuna modifica a delete-account.
--
-- IL BUG. fn_account_db_purge cancellava TUTTE le invoice dell'organization.
-- Dalla migrazione 2026-09-23-einvoice.sql ogni fattura italiana pagata ha una
-- riga in einvoice_job con FK NO ACTION su invoice: il DELETE fallisce con
-- "violates foreign key constraint einvoice_job_invoice_id_fkey", la
-- transazione si annulla e il job di eliminazione si ferma su db_purge — per
-- QUALUNQUE utente italiano con almeno una fattura pagata. Riprodotto in prod
-- (jqxx) il 2026-10-05, job d2c2395b-2a1d-483f-9de0-fffe03269af7.
--
-- PERCHÉ NON ON DELETE CASCADE. Sbloccherebbe l'eliminazione cancellando
-- einvoice_job: numero progressivo SDI e XML del documento fiscale trasmesso.
-- La fattura va conservata 10 anni (art. 2220 c.c.) e il GDPR esclude dalla
-- cancellazione i dati soggetti a obbligo legale (art. 17.3.b). Un job ancora
-- 'pending' perderebbe anche l'emissione stessa: la fattura è pagata, va
-- emessa comunque. Cancellarli creerebbe inoltre buchi nella numerazione già
-- comunicata a SDI.
--
-- LA CORREZIONE. Le invoice con un einvoice_job (e le loro credit_note) NON si
-- cancellano più: si SGANCIANO dall'account (org_id e subscription_id a null).
-- Il resto del purge resta invariato.
--   → invoice.org_id diventa nullable. Le policy RLS che filtrano per org_id
--     non vedono più queste righe: restano leggibili solo con la service role.
--   → billing_profile, subscription e plan — da cui aruba-einvoice-submit
--     ricava cessionario e descrizione — spariscono col purge (o non sono più
--     raggiungibili). Prima di cancellarli se ne copia il necessario in
--     einvoice_job.billing_snapshot, così un job ancora 'pending' (o da
--     ri-emettere dopo uno scarto) resta costruibile. Il worker v2 usa lo
--     snapshot quando c'è, altrimenti legge le tabelle come prima.
--   → Lo snapshot contiene solo dati già presenti nel documento fiscale
--     (denominazione, P.IVA, indirizzo): nessun dato personale in più rispetto
--     a quanto la legge impone di conservare.
--
-- RILANCIO DEI JOB FALLITI. delete-account è ri-eseguibile per job_id e lo
-- step db_purge, fallito, non è marcato done: dopo questa migrazione basta il
-- percorso operatore
--   POST /functions/v1/delete-account   (Authorization: Bearer <service role>)
--   { "action": "resume", "job_id": "<id>" }
-- Non far ripartire l'eliminazione dal sito: aprirebbe un secondo job.
--
-- ESECUZIONE: le tre sezioni vanno lanciate SEPARATAMENTE. L'editor SQL di
-- Supabase mostra un solo result set per esecuzione.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 1 — DIAGNOSI (sola lettura, nessuna scrittura)
-- ════════════════════════════════════════════════════════════════════════════

-- Job di eliminazione fermi su db_purge: sono quelli da rilanciare dopo la
-- Sezione 2.
select id, status, last_error, steps -> 'db_purge' as db_purge
from public.account_deletion_jobs
where status = 'failed' and last_error like 'db_purge:%'
order by id;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 2 — MIGRAZIONE
-- ════════════════════════════════════════════════════════════════════════════

begin;

alter table public.invoice alter column org_id drop not null;

comment on column public.invoice.org_id is
  'Organization a cui appartiene la fattura. NULL = account eliminato: la riga è conservata solo perché documento fiscale con einvoice_job (fn_account_db_purge, migrazione 2026-10-05).';

alter table public.einvoice_job
  add column if not exists billing_snapshot jsonb;

comment on column public.einvoice_job.billing_snapshot is
  'Copia dei dati di billing_profile e del nome piano, scritta da fn_account_db_purge prima di eliminare l''account. Se valorizzata, aruba-einvoice-submit la usa al posto di billing_profile/subscription/plan, che non esistono più.';

create or replace function public.fn_account_db_purge(p_user_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_block      jsonb;
  v_org_ids    uuid[];
  v_storage_ws uuid[] := '{}';
  n_solo_views int := 0; n_solo_comments int := 0; n_solo_sessions int := 0;
  n_views int := 0; n_comments int := 0; n_shared int := 0;
  n_ws_memb int := 0; n_org_memb int := 0; n_usage int := 0;
  n_credit int := 0; n_sub_events int := 0; n_invoices int := 0;
  n_subs int := 0; n_workspaces int := 0; n_orgs int := 0;
  n_inv_retained int := 0; n_snapshots int := 0;
begin
  v_block := fn_account_deletion_blocked(p_user_id);
  if (v_block ->> 'blocked')::boolean then
    raise exception 'db_purge bloccato: owner con membri attivi (%)', v_block
      using errcode = 'P0001';
  end if;

  select coalesce(array_agg(id), '{}') into v_org_ids
  from organization where owner_id = p_user_id;

  select coalesce(array_agg(id), '{}') into v_storage_ws
  from (
    select w.id from workspaces w where w.owner_id = p_user_id
    union
    select w.id
    from workspaces w
    join workspace_members wm on wm.workspace_id = w.id
    where wm.user_id = p_user_id
      and (select count(*) from workspace_members x
           where x.workspace_id = w.id and x.user_id is not null) = 1
  ) s;

  delete from session_views sv using shared_sessions ss
   where sv.shared_session_id = ss.id and ss.workspace_id = any(v_storage_ws);
  get diagnostics n_solo_views = row_count;

  delete from comments c using shared_sessions ss
   where c.shared_session_id = ss.id and ss.workspace_id = any(v_storage_ws);
  get diagnostics n_solo_comments = row_count;

  delete from shared_sessions where workspace_id = any(v_storage_ws);
  get diagnostics n_solo_sessions = row_count;

  delete from session_views where user_id = p_user_id;
  get diagnostics n_views = row_count;

  update comments set user_id = null where user_id = p_user_id;
  get diagnostics n_comments = row_count;

  update shared_sessions set shared_by = null where shared_by = p_user_id;
  get diagnostics n_shared = row_count;

  update workspace_members set invited_by = null where invited_by = p_user_id;
  delete from workspace_members where user_id = p_user_id;
  get diagnostics n_ws_memb = row_count;

  delete from workspaces where owner_id = p_user_id;
  get diagnostics n_workspaces = row_count;

  delete from usage_counter
   where subject_id = p_user_id
      or (array_length(v_org_ids, 1) is not null and subject_id = any(v_org_ids));
  get diagnostics n_usage = row_count;

  if array_length(v_org_ids, 1) is not null then

    -- 2026-10-05 — fatture elettroniche: snapshot dei dati di emissione PRIMA
    -- che billing_profile, subscription e plan diventino irraggiungibili.
    -- Non sovrascrive uno snapshot già presente (rilancio del job).
    update einvoice_job ej
       set billing_snapshot = jsonb_build_object(
             'legal_name',    bp.legal_name,
             'vat_id',        bp.vat_id,
             'address_line1', bp.address_line1,
             'address_line2', bp.address_line2,
             'city',          bp.city,
             'state',         bp.state,
             'postal_code',   bp.postal_code,
             'country',       bp.country,
             'plan_name',     p.name,
             'captured_at',   now()
           ),
           updated_at = now()
      from invoice i
      left join billing_profile bp on bp.org_id = i.org_id
      left join subscription s     on s.id = i.subscription_id
      left join plan p             on p.id = s.plan_id
     where ej.invoice_id = i.id
       and i.org_id = any(v_org_ids)
       and ej.billing_snapshot is null;
    get diagnostics n_snapshots = row_count;

    -- Le note di credito si cancellano solo per le fatture che si cancellano:
    -- quelle collegate a una fattura conservata sono documenti fiscali anch'esse.
    delete from credit_note cn using invoice i
     where cn.invoice_id = i.id and i.org_id = any(v_org_ids)
       and not exists (select 1 from einvoice_job ej where ej.invoice_id = i.id);
    get diagnostics n_credit = row_count;

    delete from subscription_event where org_id = any(v_org_ids);
    get diagnostics n_sub_events = row_count;

    -- Fatture con einvoice_job: conservate e sganciate dall'account.
    -- subscription_id va azzerato perché la FK verso subscription è NO ACTION.
    update invoice i
       set org_id = null, subscription_id = null
     where i.org_id = any(v_org_ids)
       and exists (select 1 from einvoice_job ej where ej.invoice_id = i.id);
    get diagnostics n_inv_retained = row_count;

    delete from invoice where org_id = any(v_org_ids);
    get diagnostics n_invoices = row_count;

    delete from subscription where org_id = any(v_org_ids);
    get diagnostics n_subs = row_count;

    delete from manual_grant where org_id = any(v_org_ids);

    delete from billing_profile where org_id = any(v_org_ids);

    delete from organization_member where org_id = any(v_org_ids);
    delete from organization where id = any(v_org_ids);
    get diagnostics n_orgs = row_count;
  end if;

  update manual_grant set granted_by = null where granted_by = p_user_id;

  delete from organization_member where user_id = p_user_id;
  get diagnostics n_org_memb = row_count;

  return jsonb_build_object(
    'storage_workspace_ids',      to_jsonb(v_storage_ws),
    'storage_scope_available',    't'::boolean,
    'schema_skipped',             '[]'::jsonb,
    'solo_ws_views_deleted',      n_solo_views,
    'solo_ws_comments_deleted',   n_solo_comments,
    'solo_ws_sessions_deleted',   n_solo_sessions,
    'session_views_deleted',      n_views,
    'comments_anonymized',        n_comments,
    'shared_sessions_anonymized', n_shared,
    'workspace_memberships',      n_ws_memb,
    'workspaces_deleted',         n_workspaces,
    'usage_counters_deleted',     n_usage,
    'org_memberships',            n_org_memb,
    'credit_notes_deleted',       n_credit,
    'subscription_events',        n_sub_events,
    'invoices_deleted',           n_invoices,
    'invoices_retained',          n_inv_retained,
    'einvoice_snapshots',         n_snapshots,
    'subscriptions_deleted',      n_subs,
    'organizations_deleted',      n_orgs
  );
end
$function$;

commit;


-- ════════════════════════════════════════════════════════════════════════════
-- SEZIONE 3 — VERIFICA (sola lettura)
-- ════════════════════════════════════════════════════════════════════════════

-- Attesi: org_id is_nullable = YES e la colonna billing_snapshot presente.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'invoice' and column_name = 'org_id')
    or (table_name = 'einvoice_job' and column_name = 'billing_snapshot'));

-- Dopo il rilancio di un job: la fattura conservata è sganciata e il suo
-- einvoice_job ha lo snapshot.
--   select i.id, i.number, i.org_id, i.subscription_id, ej.status, ej.billing_snapshot
--   from public.invoice i join public.einvoice_job ej on ej.invoice_id = i.id
--   where i.org_id is null;
