-- Rich-text announcements: TipTap JSON body + attachment storage.

-- ---------------------------------------------------------------------------
-- body_json (TipTap document) — source of truth; body stays as plain excerpt
-- ---------------------------------------------------------------------------

alter table public.announcements
  add column if not exists body_json jsonb;

-- Backfill plain-text bodies into a minimal TipTap doc.
update public.announcements
set body_json = jsonb_build_object(
  'type', 'doc',
  'content',
  case
    when coalesce(trim(body), '') = '' then
      jsonb_build_array(
        jsonb_build_object('type', 'paragraph')
      )
    else
      (
        select jsonb_agg(
          jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
              jsonb_build_object('type', 'text', 'text', line_text)
            )
          )
          order by ordinality
        )
        from unnest(string_to_array(body, E'\n'))
          with ordinality as t(line_text, ordinality)
      )
  end
)
where body_json is null;

alter table public.announcements
  alter column body_json set default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb;

alter table public.announcements
  alter column body_json set not null;

-- ---------------------------------------------------------------------------
-- Attachments metadata
-- ---------------------------------------------------------------------------

create table if not exists public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null
    references public.announcements (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  created_at timestamptz not null default now()
);

create index if not exists announcement_attachments_announcement_id_idx
  on public.announcement_attachments (announcement_id);

alter table public.announcement_attachments enable row level security;

drop policy if exists announcement_attachments_select on public.announcement_attachments;
drop policy if exists announcement_attachments_write on public.announcement_attachments;

create policy announcement_attachments_select
  on public.announcement_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.announcements a
      where a.id = announcement_id
        and (
          private.can_publish_announcements()
          or (
            a.is_active = true
            and private.matches_announcement_audience(
              a.audience_business_unit_ids,
              a.audience_work_types
            )
          )
        )
    )
  );

create policy announcement_attachments_write
  on public.announcement_attachments
  for all
  to authenticated
  using (private.can_publish_announcements())
  with check (private.can_publish_announcements());

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-attachments',
  'announcement-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: announcements/{announcementId}/{filename}

create or replace function private.storage_announcement_id(object_name text)
returns text
language sql
immutable
as $$
  select (storage.foldername(object_name))[2];
$$;

revoke all on function private.storage_announcement_id(text) from public;
grant execute on function private.storage_announcement_id(text) to authenticated;

create or replace function private.can_access_announcement_attachment(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (storage.foldername(object_name))[1] = 'announcements'
    and (
      private.can_publish_announcements()
      or exists (
        select 1
        from public.announcements a
        where a.id::text = private.storage_announcement_id(object_name)
          and a.is_active = true
          and private.matches_announcement_audience(
            a.audience_business_unit_ids,
            a.audience_work_types
          )
      )
    );
$$;

revoke all on function private.can_access_announcement_attachment(text) from public;
grant execute on function private.can_access_announcement_attachment(text) to authenticated;

drop policy if exists announcement_attachments_storage_select on storage.objects;
drop policy if exists announcement_attachments_storage_insert on storage.objects;
drop policy if exists announcement_attachments_storage_update on storage.objects;
drop policy if exists announcement_attachments_storage_delete on storage.objects;

create policy announcement_attachments_storage_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'announcement-attachments'
    and private.can_access_announcement_attachment(name)
  );

create policy announcement_attachments_storage_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'announcement-attachments'
    and private.can_publish_announcements()
    and (storage.foldername(name))[1] = 'announcements'
  );

create policy announcement_attachments_storage_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'announcement-attachments'
    and private.can_publish_announcements()
  )
  with check (
    bucket_id = 'announcement-attachments'
    and private.can_publish_announcements()
  );

create policy announcement_attachments_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'announcement-attachments'
    and private.can_publish_announcements()
  );
