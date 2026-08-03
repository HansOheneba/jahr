-- Cloudinary document storage metadata + HR document kinds.

alter type public.document_kind add value if not exists 'appointment_letter';
alter type public.document_kind add value if not exists 'nda';

alter table public.documents
  add column if not exists cloudinary_public_id text,
  add column if not exists cloudinary_resource_type text not null default 'raw';

create index if not exists documents_cloudinary_public_id_idx
  on public.documents (cloudinary_public_id)
  where cloudinary_public_id is not null;
