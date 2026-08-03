-- Employee documents in Supabase Storage (replaces Cloudinary).

-- ---------------------------------------------------------------------------
-- Schema: storage path instead of Cloudinary ids
-- ---------------------------------------------------------------------------

alter table public.documents
  add column if not exists storage_path text;

drop index if exists documents_cloudinary_public_id_idx;

alter table public.documents
  drop column if exists cloudinary_public_id,
  drop column if exists cloudinary_resource_type;

create index if not exists documents_storage_path_idx
  on public.documents (storage_path)
  where storage_path is not null;

-- ---------------------------------------------------------------------------
-- Bucket (private — access via signed URLs / authenticated downloads)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
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

-- ---------------------------------------------------------------------------
-- Storage RLS — path: employees/{employeeId}/{filename}
-- Self or org admin may read/write that employee folder.
-- ---------------------------------------------------------------------------

create or replace function private.storage_employee_id(object_name text)
returns text
language sql
immutable
as $$
  select (storage.foldername(object_name))[2];
$$;

revoke all on function private.storage_employee_id(text) from public;
grant execute on function private.storage_employee_id(text) to authenticated;

create or replace function private.can_access_employee_document(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (storage.foldername(object_name))[1] = 'employees'
    and (
      private.storage_employee_id(object_name) = (select auth.uid())::text
      or private.is_org_admin()
    );
$$;

revoke all on function private.can_access_employee_document(text) from public;
grant execute on function private.can_access_employee_document(text) to authenticated;

drop policy if exists documents_storage_select on storage.objects;
drop policy if exists documents_storage_insert on storage.objects;
drop policy if exists documents_storage_update on storage.objects;
drop policy if exists documents_storage_delete on storage.objects;

create policy documents_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and private.can_access_employee_document(name)
  );

create policy documents_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and private.can_access_employee_document(name)
  );

-- Upsert needs SELECT + UPDATE in addition to INSERT
create policy documents_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and private.can_access_employee_document(name)
  )
  with check (
    bucket_id = 'documents'
    and private.can_access_employee_document(name)
  );

create policy documents_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and private.can_access_employee_document(name)
  );
