-- Platform-wide donation settings and a public QRIS image bucket.
-- Only the verified platform administrator can change these values.

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'thors622@gmail.com'
on conflict (user_id) do nothing;

create table public.donation_settings (
  id boolean primary key default true check (id),
  bank_name text check (char_length(bank_name) <= 100),
  account_number text check (char_length(account_number) <= 50),
  account_holder text check (char_length(account_holder) <= 150),
  qris_path text check (char_length(qris_path) <= 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.donation_settings (id) values (true)
on conflict (id) do nothing;

alter table public.platform_admins enable row level security;
alter table public.donation_settings enable row level security;

create policy "platform admins: user can view own membership"
  on public.platform_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "donation settings: public can view"
  on public.donation_settings for select
  to anon, authenticated
  using (true);

create policy "donation settings: platform admin can insert"
  on public.donation_settings for insert
  to authenticated
  with check (
    exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
  );

create policy "donation settings: platform admin can update"
  on public.donation_settings for update
  to authenticated
  using (
    exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
  );

grant select on public.donation_settings to anon, authenticated;
grant insert, update on public.donation_settings to authenticated;
grant select on public.platform_admins to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'donation-assets',
  'donation-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "donation assets: admin can insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'donation-assets'
    and exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
  );

create policy "donation assets: admin can select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'donation-assets'
    and exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
  );

create policy "donation assets: admin can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'donation-assets'
    and exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
  )
  with check (
    bucket_id = 'donation-assets'
    and exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
  );

create policy "donation assets: admin can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'donation-assets'
    and exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
  );
