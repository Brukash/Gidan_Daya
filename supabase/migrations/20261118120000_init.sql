-- Gidan Daya — initial schema
-- Cooperative project subscriptions: profiles, projects, subscriptions.
-- Access rules live in the database (RLS), not in the browser.

create type public.member_role as enum ('member', 'admin');
create type public.subscription_status as enum ('active', 'due', 'completed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  role public.member_role not null default 'member',
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per cooperative member, keyed to auth.users.';

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^GD-[0-9]{2}$'),
  name text not null check (char_length(btrim(name)) between 3 and 160),
  summary text not null default '',
  category text not null check (char_length(btrim(category)) between 2 and 40),
  unit_price numeric(14, 2) not null check (unit_price > 0),
  total_units integer not null check (total_units > 0),
  units_taken integer not null default 0 check (units_taken >= 0),
  opens_on date not null,
  closes_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_units_within_total check (units_taken <= total_units),
  constraint projects_closes_after_opens check (closes_on > opens_on)
);

comment on table public.projects is 'Projects members can subscribe to, with unit price and closing date.';

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  project_id uuid not null references public.projects (id) on delete restrict,
  member_id uuid not null references public.profiles (id) on delete cascade,
  units integer not null check (units between 1 and 50),
  amount numeric(14, 2) not null check (amount > 0),
  paid numeric(14, 2) not null default 0 check (paid >= 0),
  status public.subscription_status not null default 'active',
  next_due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_paid_within_amount check (paid <= amount)
);

comment on table public.subscriptions is 'A member commitment to a project, priced from the project unit price.';

create index subscriptions_member_idx on public.subscriptions (member_id, created_at desc);
create index subscriptions_project_idx on public.subscriptions (project_id);
create index subscriptions_open_idx on public.subscriptions (status) where status <> 'completed';
create index projects_closes_on_idx on public.projects (closes_on);

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

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
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
alter table public.projects enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles: a member reads their own row; the secretariat reads the register.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- A member may change their name but never their own role: the grant below
-- limits update to the full_name column.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Projects: readable by every signed-in member; only the secretariat writes.
create policy projects_select_authenticated on public.projects
  for select to authenticated
  using (true);

create policy projects_insert_admin on public.projects
  for insert to authenticated
  with check ((select public.is_admin()));

create policy projects_update_admin on public.projects
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy projects_delete_admin on public.projects
  for delete to authenticated
  using ((select public.is_admin()));

-- Subscriptions: members see their own; the secretariat sees everything.
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (member_id = (select auth.uid()) or (select public.is_admin()));

create policy subscriptions_update_admin on public.subscriptions
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Writes do not go through the table: they go through the function below,
-- which locks the project row and recalculates the amount server-side.
revoke insert, update, delete on public.subscriptions from authenticated;

-- ---------------------------------------------------------------------------
-- Subscribing (atomic: capacity check, insert, counter update)
-- ---------------------------------------------------------------------------

create or replace function public.subscribe_to_project(p_project_id uuid, p_units integer)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid := (select auth.uid());
  v_project public.projects;
  v_subscription public.subscriptions;
begin
  if v_member is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_units is null or p_units < 1 or p_units > 50 then
    raise exception 'INVALID_UNITS' using errcode = '22023';
  end if;

  -- Lock the project row so two members cannot take the same last units.
  select * into v_project from public.projects where id = p_project_id for update;

  if not found then
    raise exception 'PROJECT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_project.closes_on < current_date then
    raise exception 'PROJECT_CLOSED' using errcode = '22023';
  end if;

  if v_project.units_taken + p_units > v_project.total_units then
    raise exception 'INSUFFICIENT_UNITS' using errcode = '22023';
  end if;

  insert into public.subscriptions (reference, project_id, member_id, units, amount, paid, status, next_due_on)
  values (
    v_project.code || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    v_project.id,
    v_member,
    p_units,
    p_units * v_project.unit_price,
    0,
    'active',
    current_date + 30
  )
  returning * into v_subscription;

  update public.projects
  set units_taken = units_taken + p_units
  where id = v_project.id;

  return v_subscription;
end;
$$;

revoke all on function public.subscribe_to_project(uuid, integer) from public;
grant execute on function public.subscribe_to_project(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Read grants (RLS still filters every row)
-- ---------------------------------------------------------------------------

grant select on public.projects to authenticated;
grant select on public.subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Cycle summary for the reports screen
-- ---------------------------------------------------------------------------

create view public.cycle_summary
with (security_invoker = true)
as
select
  count(*)::bigint as subscription_count,
  coalesce(sum(amount), 0)::numeric(16, 2) as committed,
  coalesce(sum(paid), 0)::numeric(16, 2) as collected,
  coalesce(sum(amount - paid), 0)::numeric(16, 2) as outstanding
from public.subscriptions;

grant select on public.cycle_summary to authenticated;
