-- Drive uploads, guest media and private invitation chat

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

alter table if exists public.multimedia
  add column if not exists invitation_id uuid references public.invitaciones(id) on delete cascade,
  add column if not exists folder_tipo text not null default 'recursos_web',
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists featured boolean not null default false,
  add column if not exists visible_public boolean not null default false;

alter table public.multimedia
  drop constraint if exists multimedia_folder_tipo_check;

alter table public.multimedia
  add constraint multimedia_folder_tipo_check
  check (folder_tipo in ('recursos_web', 'invitados'));

update public.multimedia
set folder_tipo = 'recursos_web'
where folder_tipo is null;

create table if not exists public.invitaciones_mensajes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.bodas(id) on delete cascade,
  invitation_id uuid not null references public.invitaciones(id) on delete cascade,
  author_role text not null check (author_role in ('guest','admin')),
  author_name text,
  contenido text not null,
  read_at_admin timestamptz,
  read_at_guest timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists multimedia_invitation_id_idx on public.multimedia(invitation_id);
create index if not exists multimedia_visible_public_idx on public.multimedia(visible_public, featured);
create index if not exists mensajes_invitation_id_idx on public.invitaciones_mensajes(invitation_id);
create index if not exists mensajes_admin_unread_idx on public.invitaciones_mensajes(read_at_admin);

alter table public.invitaciones_mensajes enable row level security;

DO $$
BEGIN
  CREATE POLICY "Mensajes de invitaciones son visibles para el backend"
    ON public.invitaciones_mensajes FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Mensajes de invitaciones pueden crearse"
    ON public.invitaciones_mensajes FOR INSERT
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Mensajes de invitaciones pueden actualizarse"
    ON public.invitaciones_mensajes FOR UPDATE
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
