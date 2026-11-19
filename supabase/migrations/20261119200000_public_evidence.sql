-- Gidan Daya — evidence from the public application form
--
-- Applying does not require an account, but the call asks for evidence of the
-- ₦20,000 fee. Until now only a signed-in member could attach it. This migration
-- gives the anonymous form a narrow, checked path:
--
--   1. an anon upload into the private bucket, only under `public/<reference>/`;
--   2. a security-definer function that finds the application by reference and
--      member ID, prices the fee from the scheme row, and writes the record.
--
-- `uploaded_by` becomes nullable because an applicant without an account has no
-- profile to point at. The row is still tied to the application, and the
-- secretariat's review decides whether the payment counts.

alter table public.payment_evidence alter column uploaded_by drop not null;
alter table public.payment_evidence alter column uploaded_by drop default;

create policy payment_evidence_upload_public on storage.objects
  for insert to anon
  with check (
    bucket_id = 'payment-evidence'
    and (storage.foldername(name))[1] = 'public'
  );

create or replace function public.record_public_fee_evidence(
  p_reference text,
  p_member_number text,
  p_file_name text,
  p_file_type text,
  p_file_size integer,
  p_storage_path text
)
returns public.payment_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.applications;
  v_fee numeric(12, 2);
  v_evidence public.payment_evidence;
begin
  select * into v_application
  from public.applications
  where upper(reference) = upper(btrim(coalesce(p_reference, '')))
    and upper(member_number) = upper(btrim(coalesce(p_member_number, '')))
  limit 1;

  if not found then
    raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_file_type is null
     or p_file_type not in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf') then
    raise exception 'EVIDENCE_TYPE_INVALID' using errcode = '22023';
  end if;

  if p_file_size is null or p_file_size <= 0 or p_file_size > 5242880 then
    raise exception 'EVIDENCE_SIZE_INVALID' using errcode = '22023';
  end if;

  -- The file must sit in the folder the anonymous policy allows for this very
  -- application, so an upload cannot be claimed against someone else's record.
  if p_storage_path is null
     or p_storage_path not like 'public/' || v_application.reference || '/%' then
    raise exception 'EVIDENCE_PATH_MISMATCH' using errcode = '22023';
  end if;

  select application_fee into v_fee from public.scheme where id;
  if v_fee is null then
    raise exception 'SCHEME_NOT_CONFIGURED' using errcode = 'P0002';
  end if;

  insert into public.payment_evidence (
    application_id,
    application_reference,
    kind,
    amount,
    file_name,
    file_type,
    file_size,
    storage_path,
    status,
    uploaded_by
  )
  values (
    v_application.id,
    v_application.reference,
    'application-fee',
    v_fee,
    left(coalesce(nullif(btrim(p_file_name), ''), 'receipt'), 200),
    p_file_type,
    p_file_size,
    p_storage_path,
    'pending',
    null
  )
  returning * into v_evidence;

  insert into public.audit_events (application_id, actor, action, note)
  values (
    v_application.id,
    v_application.applicant_name,
    'Payment evidence uploaded',
    v_evidence.file_name || ' for ' || v_application.reference || ' (fee), attached without signing in.'
  );

  return v_evidence;
end;
$$;

revoke all on function public.record_public_fee_evidence(text, text, text, text, integer, text) from public;
grant execute on function public.record_public_fee_evidence(text, text, text, text, integer, text) to anon, authenticated;
