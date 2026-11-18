-- Local-only seed: the two demo accounts the app's sign-in screen documents.
-- `supabase db reset` applies this; `supabase db push` does not, so these
-- accounts never land in a hosted project unless someone passes --include-seed
-- on purpose.
--
-- Password for both accounts: gidandaya (the same demo password the sample
-- session uses). Change or delete these before the secretariat signs in for
-- real.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@coop.example',
    extensions.crypt('gidandaya', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Secretariat (demo)"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'member@coop.example',
    extensions.crypt('gidandaya', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Member (demo)"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002'
)
on conflict do nothing;

insert into public.profiles (id, full_name, member_number, cadre, role, joined_on)
values
  ('00000000-0000-4000-8000-000000000001', 'Secretariat (demo)', 'CBN/ADMIN/0001', 'Manager', 'admin', '2026-11-03'),
  ('00000000-0000-4000-8000-000000000002', 'Member (demo)', 'CBN/2019/0417', 'Assistant Manager', 'member', '2026-11-03')
on conflict (id) do nothing;
