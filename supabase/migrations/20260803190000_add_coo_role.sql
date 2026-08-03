-- Group COO as a distinct org-admin role (Jude remains the only CEO).

alter type public.app_role add value if not exists 'coo';
