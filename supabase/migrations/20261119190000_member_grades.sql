-- Gidan Daya — the cooperative's real grades
--
-- The application shipped five cadres (Clerk … Senior Manager) because the call
-- document names only the two ends of its priority band. The secretariat's "All
-- grades" table (19 November 2026) lists the actual structure: 17 grades, rank
-- 01 to rank 17, with priorities running down to Drivers. This migration
-- replaces the enum with those grades and rebuilds the two application
-- functions, which take the grade as an argument.
--
-- Rows 18–21 of that table (Pensioner, Retiree, Coop Staff, Undefined) are not
-- grades: `member_category` already records them, so they are not added here.
-- The table's money columns (credit limit, minimum contribution, global and
-- annual limits) are not part of this scheme and are not stored.

create type public.member_grade as enum (
  'Deputy Governor',
  'Director',
  'Deputy Director',
  'Assistant Director',
  'Principal Manager',
  'Senior Manager',
  'Manager',
  'Deputy Manager',
  'Assistant Manager',
  'Senior Supervisor 1',
  'Senior Supervisor 2',
  'Supervisor',
  'Senior Clerk',
  'Treasury Assistant',
  'Clerk',
  'Treasury Assistant 1',
  'Drivers'
);

-- Existing rows keep their place. 'Executive Officer' sat between Clerk and
-- Assistant Manager, so it maps to Supervisor (12); the secretariat can correct
-- any single record on the register.
alter table public.profiles alter column cadre drop default;

alter table public.profiles
  alter column cadre type public.member_grade
  using (
    case cadre::text
      when 'Clerk' then 'Clerk'
      when 'Executive Officer' then 'Supervisor'
      when 'Assistant Manager' then 'Assistant Manager'
      when 'Manager' then 'Manager'
      when 'Senior Manager' then 'Senior Manager'
    end::public.member_grade
  );

alter table public.profiles alter column cadre set default 'Clerk'::public.member_grade;

alter table public.applications
  alter column cadre type public.member_grade
  using (
    case cadre::text
      when 'Clerk' then 'Clerk'
      when 'Executive Officer' then 'Supervisor'
      when 'Assistant Manager' then 'Assistant Manager'
      when 'Manager' then 'Manager'
      when 'Senior Manager' then 'Senior Manager'
    end::public.member_grade
  );

-- The grade is an argument to both functions, so they are dropped and rebuilt
-- against the new type rather than altered in place.
drop function public.create_plot_application(
  integer,
  public.house_design,
  text,
  public.cadre,
  public.member_category,
  text[],
  text
);

drop function public.create_public_application(
  integer,
  public.house_design,
  text,
  public.cadre,
  public.member_category,
  text,
  text[],
  text
);

create or replace function public.create_plot_application(
  p_size_sqm integer,
  p_house_design public.house_design,
  p_member_number text,
  p_cadre public.member_grade,
  p_member_category public.member_category,
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
    member_category,
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
    p_member_category,
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

revoke all on function public.create_plot_application(integer, public.house_design, text, public.member_grade, public.member_category, text[], text) from public;
grant execute on function public.create_plot_application(integer, public.house_design, text, public.member_grade, public.member_category, text[], text) to authenticated;

create or replace function public.create_public_application(
  p_size_sqm integer,
  p_house_design public.house_design,
  p_member_number text,
  p_cadre public.member_grade,
  p_member_category public.member_category,
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
    member_category,
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
    p_member_category,
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

revoke all on function public.create_public_application(integer, public.house_design, text, public.member_grade, public.member_category, text, text[], text) from public;
grant execute on function public.create_public_application(integer, public.house_design, text, public.member_grade, public.member_category, text, text[], text) to anon, authenticated;

-- Nothing references the five-cadre type any more.
drop type public.cadre;
