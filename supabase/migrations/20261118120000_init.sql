-- Gidan Daya — initial schema
-- One estate, four plot sizes, plot applications, payment evidence, an audit
-- trail and a configurable allocation rule. Access rules live in the database
-- (RLS), not in the browser.
--
-- NOTE: this migration has never been executed. No Supabase project exists for
-- this workspace, so nothing here has been run or tested against Postgres.

create type public.member_role as enum ('member', 'admin');
create type public.cadre as enum ('Clerk', 'Executive Officer', 'Assistant Manager', 'Manager', 'Senior Manager');
create type public.house_design as enum ('semi-detached', 'detached');
create type public.application_status as enum ('reserved', 'deposit-paid', 'fully-paid', 'allocated');
create type public.payment_kind as enum ('application-fee', 'deposit', 'balance');
create type public.evidence_status as enum ('pending', 'verified', 'rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  member_number text not null unique check (member_number ~ '^[A-Z0-9/._-]{4,24}$'),
  cadre public.cadre not null default 'Clerk',
  role public.member_role not null default 'member',
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per cooperative member, keyed to auth.users.';

-- Single-row table: the published terms of this scheme, plus the allocation
-- rule the secretariat has chosen.
create table public.scheme (
  id boolean primary key default true check (id),
  name text not null,
  price_per_sqm numeric(12, 2) not null check (price_per_sqm > 0),
  application_fee numeric(12, 2) not null check (application_fee >= 0),
  opens_on date not null,
  closes_on date not null,
  deposit_due_on date not null,
  balance_due_on date not null,
  allocation_policy text not null default 'cadre-priority-same-day'
    check (allocation_policy in ('first-come', 'cadre-priority-same-day', 'cadre-priority')),
  constraint scheme_closes_after_opens check (closes_on > opens_on),
  constraint scheme_deposit_before_balance check (balance_due_on > deposit_due_on)
);

comment on column public.scheme.allocation_policy is
  'first-come = payment date only; cadre-priority-same-day = date then lower cadre; cadre-priority = lower cadre first regardless of date.';

insert into public.scheme (id, name, price_per_sqm, application_fee, opens_on, closes_on, deposit_due_on, balance_due_on)
values (true, 'Gidan Daya residential plots', 27000, 20000, '2026-11-03', '2026-12-30', '2027-01-30', '2027-06-30');

create table public.plot_tiers (
  id uuid primary key default gen_random_uuid(),
  size_sqm integer not null unique check (size_sqm between 100 and 1000),
  total_plots integer not null check (total_plots > 0),
  allocated integer not null default 0 check (allocated >= 0),
  created_at timestamptz not null default now(),
  constraint plot_tiers_allocated_within_total check (allocated <= total_plots)
);

comment on table public.plot_tiers is 'Plot inventory from the call: 4 x 200sqm, 44 x 300sqm, 44 x 400sqm, 10 x 500sqm.';

insert into public.plot_tiers (size_sqm, total_plots) values (200, 4), (300, 44), (400, 44), (500, 10);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  -- Null when the application was submitted without signing in and the ID
  -- number did not match a profile. Set when it did, so the member later sees
  -- the application on their own page.
  member_id uuid references public.profiles (id) on delete set null,
  applicant_name text not null,
  member_number text not null,
  cadre public.cadre not null,
  size_sqm integer not null check (size_sqm between 100 and 1000),
  house_design public.house_design not null,
  amount numeric(14, 2) not null check (amount > 0),
  paid numeric(14, 2) not null default 0 check (paid >= 0),
  fee_paid boolean not null default true,
  status public.application_status not null default 'reserved',
  -- Date the deposit (or full price) was confirmed; fixes queue position.
  confirmed_on date,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  accepted_clauses text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_paid_within_amount check (paid <= amount),
  constraint applications_clauses_present check (
    accepted_clauses @> array['refunds', 'default', 'variation', 'title']::text[]
  )
);

comment on table public.applications is 'A member plot application, priced server-side from the scheme rate, with the acceptance record attached.';

create index applications_member_idx on public.applications (member_id, created_at desc);
create index applications_size_idx on public.applications (size_sqm, created_at);
create index applications_queue_idx on public.applications (confirmed_on, created_at);
create index applications_open_idx on public.applications (status) where status <> 'allocated';

create table public.payment_evidence (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  application_reference text not null,
  kind public.payment_kind not null,
  amount numeric(14, 2) not null check (amount > 0),
  file_name text not null,
  file_type text not null check (file_type in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  storage_path text not null,
  status public.evidence_status not null default 'pending',
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  uploaded_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  constraint payment_evidence_review_complete check (
    status = 'pending' or (reviewed_by is not null and reviewed_at is not null)
  )
);

comment on table public.payment_evidence is 'Receipts and bank evidence attached to an application, verified by the secretariat.';

create index payment_evidence_application_idx on public.payment_evidence (application_id, uploaded_at desc);
create index payment_evidence_pending_idx on public.payment_evidence (status) where status = 'pending';

-- Append-only: no update or delete grants are issued for this table.
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  actor text not null,
  action text not null,
  note text not null default '',
  at timestamptz not null default now()
);

comment on table public.audit_events is 'Who did what, when: submissions, uploads, verifications and allocation-rule changes.';

create index audit_events_application_idx on public.audit_events (application_id, at desc);
create index audit_events_action_idx on public.audit_events (action, at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Admin check as a security definer, so policies cannot recurse into profiles
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.scheme enable row level security;
alter table public.plot_tiers enable row level security;
alter table public.applications enable row level security;
alter table public.payment_evidence enable row level security;
alter table public.audit_events enable row level security;

-- Profiles: a member reads their own row; the secretariat reads the register.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- A member may change their name but never their own cadre or role.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Scheme: readable by every signed-in member; only the secretariat changes it.
create policy scheme_select_authenticated on public.scheme
  for select to authenticated
  using (true);

create policy scheme_update_admin on public.scheme
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy plot_tiers_select_authenticated on public.plot_tiers
  for select to authenticated
  using (true);

create policy plot_tiers_write_admin on public.plot_tiers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Applications: members see their own; the secretariat sees and verifies all.
create policy applications_select_own on public.applications
  for select to authenticated
  using (member_id = (select auth.uid()) or (select public.is_admin()));

create policy applications_update_admin on public.applications
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Inserts do not go through the table: they go through the function below,
-- which locks the tier row and prices the plot server-side.
revoke insert, update, delete on public.applications from authenticated;
grant update (paid, fee_paid, status, confirmed_on) on public.applications to authenticated;

-- Evidence: members attach to their own application and read their own files;
-- the secretariat reads every attachment.
create policy payment_evidence_select_own on public.payment_evidence
  for select to authenticated
  using (
    uploaded_by = (select auth.uid())
    or exists (
      select 1 from public.applications a
      where a.id = payment_evidence.application_id and a.member_id = (select auth.uid())
    )
    or (select public.is_admin())
  );

create policy payment_evidence_insert_own on public.payment_evidence
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.applications a
      where a.id = payment_evidence.application_id and a.member_id = (select auth.uid())
    )
  );

-- Reviews go through review_payment_evidence(), so no update grant is needed.
revoke update, delete on public.payment_evidence from authenticated;

create policy audit_select_own on public.audit_events
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.applications a
      where a.id = audit_events.application_id and a.member_id = (select auth.uid())
    )
    or application_id is null
  );

-- Members may append an entry to their own application; scheme-wide entries are
-- admin-only. Definitive entries are written by the security-definer functions.
create policy audit_insert_own_or_admin on public.audit_events
  for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      application_id is not null
      and exists (
        select 1 from public.applications a
        where a.id = audit_events.application_id and a.member_id = (select auth.uid())
      )
    )
  );

revoke update, delete on public.audit_events from authenticated;

-- ---------------------------------------------------------------------------
-- Storage: receipts live in a private bucket, one folder per application
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-evidence',
  'payment-evidence',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy payment_evidence_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-evidence'
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[1]
        and (a.member_id = (select auth.uid()) or (select public.is_admin()))
    )
  );

create policy payment_evidence_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-evidence'
    and (
      (select public.is_admin())
      or exists (
        select 1 from public.applications a
        where a.id::text = (storage.foldername(name))[1]
          and a.member_id = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Applying (atomic: capacity check, acceptance record, audit entry)
-- ---------------------------------------------------------------------------

create or replace function public.create_plot_application(
  p_size_sqm integer,
  p_house_design public.house_design,
  p_member_number text,
  p_cadre public.cadre,
  p_accepted_clauses text[],
  p_terms_version text
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid := (select auth.uid());
  v_scheme public.scheme;
  v_tier public.plot_tiers;
  v_application public.applications;
  v_actor text;
begin
  if v_member is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_size_sqm is null then
    raise exception 'INVALID_SIZE' using errcode = '22023';
  end if;

  if p_accepted_clauses is null
     or not (p_accepted_clauses @> array['refunds', 'default', 'variation', 'title']::text[]) then
    raise exception 'TERMS_NOT_ACCEPTED' using errcode = '22023';
  end if;

  if coalesce(btrim(p_terms_version), '') = '' then
    raise exception 'TERMS_VERSION_REQUIRED' using errcode = '22023';
  end if;

  -- The member number on the application must be the member's own, not one
  -- supplied by the browser as a claim.
  if not exists (
    select 1
    from public.profiles p
    where p.id = v_member
      and upper(p.member_number) = upper(btrim(p_member_number))
  ) then
    raise exception 'MEMBER_NUMBER_MISMATCH' using errcode = '22023';
  end if;

  select coalesce(full_name, 'member') into v_actor from public.profiles where id = v_member;

  select * into v_scheme from public.scheme where id;
  if not found then
    raise exception 'SCHEME_NOT_CONFIGURED' using errcode = 'P0002';
  end if;

  if current_date > v_scheme.closes_on then
    raise exception 'APPLICATIONS_CLOSED' using errcode = '22023';
  end if;

  -- Lock the tier row so two members cannot take the same last plot.
  select * into v_tier from public.plot_tiers where size_sqm = p_size_sqm for update;
  if not found then
    raise exception 'TIER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_tier.allocated >= v_tier.total_plots then
    raise exception 'TIER_EXHAUSTED' using errcode = '22023';
  end if;

  insert into public.applications (
    reference,
    member_id,
    applicant_name,
    member_number,
    cadre,
    size_sqm,
    house_design,
    amount,
    paid,
    fee_paid,
    status,
    terms_version,
    terms_accepted_at,
    accepted_clauses
  )
  values (
    'GD-' || p_size_sqm || '-' || lpad((v_tier.allocated + 1)::text, 4, '0'),
    v_member,
    v_actor,
    upper(btrim(p_member_number)),
    p_cadre,
    p_size_sqm,
    p_house_design,
    p_size_sqm * v_scheme.price_per_sqm,
    0,
    true,
    'reserved',
    btrim(p_terms_version),
    now(),
    p_accepted_clauses
  )
  returning * into v_application;

  update public.plot_tiers
  set allocated = allocated + 1
  where id = v_tier.id;

  insert into public.audit_events (application_id, actor, action, note)
  values
    (
      v_application.id,
      v_actor,
      'Application submitted',
      v_application.reference || ' for ' || p_size_sqm || ' sqm.'
    ),
    (
      v_application.id,
      v_actor,
      'Terms accepted',
      btrim(p_terms_version) || ' — ' || array_length(p_accepted_clauses, 1) || ' conditions acknowledged.'
    );

  return v_application;
end;
$$;

revoke all on function public.create_plot_application(integer, public.house_design, text, public.cadre, text[], text) from public;
grant execute on function public.create_plot_application(integer, public.house_design, text, public.cadre, text[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- Applying without an account
--
-- The call asks members to fill an online form; it does not require a portal
-- account. The applicant states their ID number and name, and the secretariat
-- verifies both against the register and the fee evidence before anything is
-- allocated. A matching ID number links the application to that profile so the
-- member sees it if they sign in later; it is not proof of identity.
-- ---------------------------------------------------------------------------

create or replace function public.create_public_application(
  p_size_sqm integer,
  p_house_design public.house_design,
  p_member_number text,
  p_cadre public.cadre,
  p_applicant_name text,
  p_accepted_clauses text[],
  p_terms_version text
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid;
  v_member_name text;
  v_scheme public.scheme;
  v_tier public.plot_tiers;
  v_application public.applications;
  v_name text := btrim(coalesce(p_applicant_name, ''));
  v_number text := upper(btrim(coalesce(p_member_number, '')));
begin
  if char_length(v_name) < 3 then
    raise exception 'APPLICANT_NAME_REQUIRED' using errcode = '22023';
  end if;

  if v_number = '' then
    raise exception 'MEMBER_NUMBER_REQUIRED' using errcode = '22023';
  end if;

  if p_size_sqm is null then
    raise exception 'INVALID_SIZE' using errcode = '22023';
  end if;

  if p_accepted_clauses is null
     or not (p_accepted_clauses @> array['refunds', 'default', 'variation', 'title']::text[]) then
    raise exception 'TERMS_NOT_ACCEPTED' using errcode = '22023';
  end if;

  if coalesce(btrim(p_terms_version), '') = '' then
    raise exception 'TERMS_VERSION_REQUIRED' using errcode = '22023';
  end if;

  select id, full_name into v_member, v_member_name
  from public.profiles
  where upper(member_number) = v_number
  limit 1;

  select * into v_scheme from public.scheme where id;
  if not found then
    raise exception 'SCHEME_NOT_CONFIGURED' using errcode = 'P0002';
  end if;

  if current_date > v_scheme.closes_on then
    raise exception 'APPLICATIONS_CLOSED' using errcode = '22023';
  end if;

  -- Lock the tier row so two applicants cannot take the same last plot.
  select * into v_tier from public.plot_tiers where size_sqm = p_size_sqm for update;
  if not found then
    raise exception 'TIER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_tier.allocated >= v_tier.total_plots then
    raise exception 'TIER_EXHAUSTED' using errcode = '22023';
  end if;

  insert into public.applications (
    reference,
    member_id,
    applicant_name,
    member_number,
    cadre,
    size_sqm,
    house_design,
    amount,
    paid,
    fee_paid,
    status,
    terms_version,
    terms_accepted_at,
    accepted_clauses
  )
  values (
    'GD-' || p_size_sqm || '-' || lpad((v_tier.allocated + 1)::text, 4, '0'),
    v_member,
    coalesce(v_member_name, v_name),
    v_number,
    p_cadre,
    p_size_sqm,
    p_house_design,
    p_size_sqm * v_scheme.price_per_sqm,
    0,
    true,
    'reserved',
    btrim(p_terms_version),
    now(),
    p_accepted_clauses
  )
  returning * into v_application;

  update public.plot_tiers
  set allocated = allocated + 1
  where id = v_tier.id;

  insert into public.audit_events (application_id, actor, action, note)
  values
    (
      v_application.id,
      v_name,
      'Application submitted',
      v_application.reference || ' for ' || p_size_sqm || ' sqm, submitted online without signing in.'
    ),
    (
      v_application.id,
      v_name,
      'Terms accepted',
      btrim(p_terms_version) || ' — ' || array_length(p_accepted_clauses, 1) || ' conditions acknowledged.'
    );

  return v_application;
end;
$$;

revoke all on function public.create_public_application(integer, public.house_design, text, public.cadre, text, text[], text) from public;
grant execute on function public.create_public_application(integer, public.house_design, text, public.cadre, text, text[], text) to anon, authenticated;

-- Opening a receipt needs the reference and the ID number on it; neither is
-- enough on its own. Returns at most the one matching row.
create or replace function public.get_public_application(
  p_reference text,
  p_member_number text
)
returns setof public.applications
language sql
security definer
set search_path = ''
stable
as $$
  select *
  from public.applications
  where upper(reference) = upper(btrim(coalesce(p_reference, '')))
    and upper(member_number) = upper(btrim(coalesce(p_member_number, '')))
  limit 1;
$$;

revoke all on function public.get_public_application(text, text) from public;
grant execute on function public.get_public_application(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verifying payment evidence (atomic: status, payment, audit trail)
-- ---------------------------------------------------------------------------

create or replace function public.review_payment_evidence(
  p_evidence_id uuid,
  p_decision public.evidence_status,
  p_note text
)
returns public.payment_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evidence public.payment_evidence;
  v_application public.applications;
  v_actor text;
  v_paid numeric(14, 2);
  v_status public.application_status;
  v_confirmed date;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not (select public.is_admin()) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_decision not in ('verified', 'rejected') then
    raise exception 'INVALID_DECISION' using errcode = '22023';
  end if;

  if p_decision = 'rejected' and coalesce(char_length(v_note), 0) < 8 then
    raise exception 'NOTE_REQUIRED' using errcode = '22023';
  end if;

  select coalesce(full_name, 'secretariat') into v_actor from public.profiles where id = (select auth.uid());

  select * into v_evidence from public.payment_evidence where id = p_evidence_id for update;
  if not found then
    raise exception 'EVIDENCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_evidence.status <> 'pending' then
    raise exception 'EVIDENCE_ALREADY_REVIEWED' using errcode = '22023';
  end if;

  update public.payment_evidence
  set status = p_decision,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      review_note = v_note
  where id = p_evidence_id
  returning * into v_evidence;

  if p_decision = 'verified' then
    select * into v_application from public.applications where id = v_evidence.application_id for update;
    if not found then
      raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0002';
    end if;

    v_paid := least(v_application.amount, v_application.paid + v_evidence.amount);
    v_status := case
      when v_paid >= v_application.amount then 'fully-paid'::public.application_status
      when v_paid > 0 then 'deposit-paid'::public.application_status
      else 'reserved'::public.application_status
    end;
    v_confirmed := coalesce(
      v_application.confirmed_on,
      case when v_paid >= v_application.amount / 2 then current_date else null end
    );

    update public.applications
    set paid = v_paid,
        status = v_status,
        confirmed_on = v_confirmed
    where id = v_application.id;

    insert into public.audit_events (application_id, actor, action, note)
    values (
      v_application.id,
      v_actor,
      'Payment recorded',
      v_evidence.amount::text || ' recorded on ' || v_application.reference || ' from ' || v_evidence.file_name || '.'
    );
  end if;

  insert into public.audit_events (application_id, actor, action, note)
  values (
    v_evidence.application_id,
    v_actor,
    case when p_decision = 'verified' then 'Payment evidence verified' else 'Payment evidence rejected' end,
    coalesce(v_note, v_evidence.file_name)
  );

  return v_evidence;
end;
$$;

revoke all on function public.review_payment_evidence(uuid, public.evidence_status, text) from public;
grant execute on function public.review_payment_evidence(uuid, public.evidence_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Read grants (RLS still filters every row)
-- ---------------------------------------------------------------------------

grant select on public.scheme to authenticated;
grant select on public.plot_tiers to authenticated;
grant select on public.profiles to authenticated;
grant select on public.applications to authenticated;
grant select on public.payment_evidence to authenticated;
grant insert on public.payment_evidence to authenticated;
grant select, insert on public.audit_events to authenticated;

-- ---------------------------------------------------------------------------
-- Allocation summary for the reports screen
-- ---------------------------------------------------------------------------

create view public.allocation_summary
with (security_invoker = true)
as
select
  count(*)::bigint as application_count,
  coalesce(sum(amount), 0)::numeric(16, 2) as committed,
  coalesce(sum(paid), 0)::numeric(16, 2) as collected,
  coalesce(sum(amount - paid), 0)::numeric(16, 2) as outstanding,
  count(*) filter (where confirmed_on is not null)::bigint as confirmed_applications
from public.applications;

grant select on public.allocation_summary to authenticated;
