-- Gidan Daya — one anonymous receipt per application
--
-- The public form attaches the ₦20,000 fee receipt without an account. Its first
-- version let an anonymous visitor upload any file into any `public/…` folder, so
-- one visitor could fill the bucket. Size and type were already enforced by the
-- bucket (5 MB, PNG/JPEG/WebP/PDF); what was missing was a limit on how many.
--
-- The guard is a reservation made before the upload:
--
--   1. `reserve_public_evidence()` finds the application by reference + member
--      ID, checks the declared type and size, and writes the single fee receipt
--      row for that application, locking the application so two calls cannot
--      both take the slot;
--   2. storage accepts an anonymous upload only at the exact path that row holds,
--      so a visitor cannot choose a folder of their own;
--   3. `settle_public_evidence()` confirms the bytes arrived and records the audit
--      entry; when they did not, it removes the reservation so the secretariat
--      never sees a receipt that cannot be opened.
--
-- A verified receipt cannot be replaced; a rejected one frees the slot.
--
-- Abuse stays bounded by the scheme itself: an application consumes a plot slot
-- (102 in total), so one file per application caps anonymous uploads at the
-- inventory instead of whatever a script can loop.

-- The anon role cannot read `payment_evidence`, so the storage policy asks this
-- definer function whether a path has been reserved.
create or replace function public.is_reserved_evidence_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.payment_evidence e
    where e.storage_path = p_name
      and e.status = 'pending'
      and e.uploaded_by is null
  );
$$;

revoke all on function public.is_reserved_evidence_path(text) from public;
grant execute on function public.is_reserved_evidence_path(text) to anon, authenticated;

-- Anonymous uploads: under `public/`, and only at a reserved path.
drop policy if exists payment_evidence_upload_public on storage.objects;
create policy payment_evidence_upload_public on storage.objects
  for insert to anon
  with check (
    bucket_id = 'payment-evidence'
    and (storage.foldername(name))[1] = 'public'
    and public.is_reserved_evidence_path(name)
  );

-- A member who applies while signed in goes through the same reserved slot; the
-- per-application folder upload stays as it was.
drop policy if exists payment_evidence_upload on storage.objects;
create policy payment_evidence_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-evidence'
    and (
      public.is_reserved_evidence_path(name)
      or exists (
        select 1 from public.applications a
        where a.id::text = (storage.foldername(name))[1]
          and (a.member_id = (select auth.uid()) or (select public.is_admin()))
      )
    )
  );

create or replace function public.reserve_public_evidence(
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
  limit 1
  for update;

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

  -- The file must sit in the folder that belongs to this very application.
  if p_storage_path is null
     or p_storage_path not like 'public/' || v_application.reference || '/%' then
    raise exception 'EVIDENCE_PATH_MISMATCH' using errcode = '22023';
  end if;

  select * into v_evidence
  from public.payment_evidence
  where application_id = v_application.id
    and kind = 'application-fee'
    and status <> 'rejected'
  order by uploaded_at desc
  limit 1;

  if found then
    if v_evidence.status <> 'pending' then
      raise exception 'EVIDENCE_ALREADY_VERIFIED' using errcode = '23505';
    end if;

    if exists (
      select 1 from storage.objects o
      where o.bucket_id = 'payment-evidence'
        and o.name = v_evidence.storage_path
    ) then
      -- The earlier file arrived: this application already holds its receipt.
      return v_evidence;
    end if;

    -- The earlier attempt never delivered a file, so its slot is reused rather
    -- than stacking a second receipt on the same application.
    delete from public.payment_evidence where id = v_evidence.id;
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

  return v_evidence;
end;
$$;

revoke all on function public.reserve_public_evidence(text, text, text, text, integer, text) from public;
grant execute on function public.reserve_public_evidence(text, text, text, text, integer, text) to anon, authenticated;

create or replace function public.settle_public_evidence(p_evidence_id uuid)
returns public.payment_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evidence public.payment_evidence;
begin
  select * into v_evidence
  from public.payment_evidence
  where id = p_evidence_id
    and uploaded_by is null
    and status = 'pending';

  if not found then
    return null;
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'payment-evidence'
      and o.name = v_evidence.storage_path
  ) then
    -- Nothing arrived: give the slot back instead of leaving a record of a
    -- receipt the secretariat can never open.
    delete from public.payment_evidence where id = v_evidence.id;
    return null;
  end if;

  insert into public.audit_events (application_id, actor, action, note)
  select
    v_evidence.application_id,
    a.applicant_name,
    'Payment evidence uploaded',
    v_evidence.file_name || ' for ' || a.reference || ' (fee), attached without signing in.'
  from public.applications a
  where a.id = v_evidence.application_id;

  return v_evidence;
end;
$$;

revoke all on function public.settle_public_evidence(uuid) from public;
grant execute on function public.settle_public_evidence(uuid) to anon, authenticated;

-- The upload-then-record function is replaced by the reservation pair above; it
-- is dropped so the old, unlimited shape cannot be called again.
drop function if exists public.record_public_fee_evidence(text, text, text, text, integer, text);
