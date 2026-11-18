-- Gidan Daya — initial schema
-- One estate, four plot sizes, plot applications. Access rules live in the
-- database (RLS), not in the browser.
--
-- NOTE: this migration has never been executed: no Supabase project exists yet,
-- so nothing here has been run or tested against Postgres.

create type public.member_role as enum ('member', 'admin');
create type public.cadre as enum ('Clerk', 'Executive Officer', 'Assistant Manager', 'Manager', 'Senior Manager');
create type public.house_design as enum ('semi-detached', 'detached');
create type public.application_status as enum ('reserved', 'deposit-paid', 'fully-paid', 'allocated');

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

-- Single-row table: the published terms of this scheme.
create table public.scheme (
  id boolean primary key default true check (id),
  name text not null,
  price_per_sqm numeric(12, 2) not null check (price_per_sqm > 0),
  application_fee numeric(12, 2) not null check (application_fee >= 0),
  opens_on date not null,
  closes_on date not null,
  deposit_due_on date not null,
  balance_due_on date not null,
  constraint scheme_closes_after_opens check (closes_on > opens_on),
  constraint scheme_deposit_before_balance check (balance_due_on > deposit_due_on)
);

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
  member_id uuid not null references public.profiles (id) on delete cascade,
  member_number text not null,
  cadre public.cadre not null,
  size_sqm integer not null check (size_sqm between 100 and 1000),
  house_design public.house_design not null,
  amount numeric(14, 2) not null check (amount > 0),
  paid numeric(14, 2) not null default 0 check (paid >= 0),
  fee_paid boolean not null default true,
  status public.application_status not null default 'reserved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_paid_within_amount check (paid <= amount)
);

comment on table public.applications is 'A member plot application, priced server-side from the scheme rate.';

create index applications_member_idx on public.applications (member_id, created_at desc);
create index applications_size_idx on public.applications (size_sqm, created_at);
create index applications_open_idx on public.applications (status) where status <> 'allocated';

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

-- Scheme and plot tiers: readable by every signed-in member; only the
-- secretariat writes, and inventory counts are maintained by the function below.
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
grant update (paid, fee_paid, status) on public.applications to authenticated;

-- ---------------------------------------------------------------------------
-- Applying (atomic: capacity check, insert, allocation counter)
-- ---------------------------------------------------------------------------

create or replace function public.create_plot_application(
  p_size_sqm integer,
  p_house_design public.house_design,
  p_member_number text,
  p_cadre public.cadre
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
begin
  if v_member is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_size_sqm is null then
    raise exception 'INVALID_SIZE' using errcode = '22023';
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
    member_number,
    cadre,
    size_sqm,
    house_design,
    amount,
    paid,
    fee_paid,
    status
  )
  values (
    'GD-' || p_size_sqm || '-' || lpad((v_tier.allocated + 1)::text, 4, '0'),
    v_member,
    upper(btrim(p_member_number)),
    p_cadre,
    p_size_sqm,
    p_house_design,
    p_size_sqm * v_scheme.price_per_sqm,
    0,
    true,
    'reserved'
  )
  returning * into v_application;

  update public.plot_tiers
  set allocated = allocated + 1
  where id = v_tier.id;

  return v_application;
end;
$$;

revoke all on function public.create_plot_application(integer, public.house_design, text, public.cadre) from public;
grant execute on function public.create_plot_application(integer, public.house_design, text, public.cadre) to authenticated;

-- ---------------------------------------------------------------------------
-- Read grants (RLS still filters every row)
-- ---------------------------------------------------------------------------

grant select on public.scheme to authenticated;
grant select on public.plot_tiers to authenticated;
grant select on public.profiles to authenticated;
grant select on public.applications to authenticated;

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
  coalesce(sum(amount - paid), 0)::numeric(16, 2) as outstanding
from public.applications;

grant select on public.allocation_summary to authenticated;
