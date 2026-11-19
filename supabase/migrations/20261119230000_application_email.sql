-- Gidan Daya — an email address on every application
--
-- Applying needs no account, so until now the secretariat had no way to reach
-- an applicant: the row carried a name and a cooperative ID number and the
-- receipt told them to keep a reference. Every application now records one
-- email address, supplied by the applicant, so a query on a payment, a size
-- correction or an allocation can be raised without waiting for a sign-in.
--
-- The address is recorded, not verified: nothing is sent from the app, and the
-- secretariat still matches payments against the bank narration. It is
-- nullable only so the rows that already exist stay valid; both creation
-- functions require it, and the form asks for it.

alter table public.applications
  add column if not exists applicant_email text;

alter table public.applications
  add constraint applications_email_shape check (
    applicant_email is null
    or applicant_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  );

comment on column public.applications.applicant_email is
  'Contact address the applicant supplied, lower-cased and trimmed. Recorded, not verified; the app does not send mail.';

-- Both functions take the address as an argument, and a changed argument list
-- is a new signature, so they are dropped and rebuilt.
drop function public.create_plot_application(
  integer,
  public.house_design,
  text,
  public.member_grade,
  public.member_category,
  text[],
  text
);

drop function public.create_public_application(
  integer,
  public.house_design,
  text,
  public.member_grade,
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
  p_terms_version text,
  p_applicant_email text
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
  v_email text := lower(btrim(coalesce(p_applicant_email, '')));
begin
  if v_member is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if v_email = '' then
    raise exception 'APPLICANT_EMAIL_REQUIRED' using errcode = '22023';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'APPLICANT_EMAIL_INVALID' using errcode = '22023';
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
    applicant_email,
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
    v_email,
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

revoke all on function public.create_plot_application(integer, public.house_design, text, public.member_grade, public.member_category, text[], text, text) from public;
grant execute on function public.create_plot_application(integer, public.house_design, text, public.member_grade, public.member_category, text[], text, text) to authenticated;

create or replace function public.create_public_application(
  p_size_sqm integer,
  p_house_design public.house_design,
  p_member_number text,
  p_cadre public.member_grade,
  p_member_category public.member_category,
  p_applicant_name text,
  p_accepted_clauses text[],
  p_terms_version text,
  p_applicant_email text
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
  v_email text := lower(btrim(coalesce(p_applicant_email, '')));
begin
  if char_length(v_name) < 3 then
    raise exception 'APPLICANT_NAME_REQUIRED' using errcode = '22023';
  end if;

  if v_number = '' then
    raise exception 'MEMBER_NUMBER_REQUIRED' using errcode = '22023';
  end if;

  if v_email = '' then
    raise exception 'APPLICANT_EMAIL_REQUIRED' using errcode = '22023';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'APPLICANT_EMAIL_INVALID' using errcode = '22023';
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
    applicant_email,
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
    v_email,
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

revoke all on function public.create_public_application(integer, public.house_design, text, public.member_grade, public.member_category, text, text[], text, text) from public;
grant execute on function public.create_public_application(integer, public.house_design, text, public.member_grade, public.member_category, text, text[], text, text) to anon, authenticated;
