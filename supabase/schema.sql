-- ═══════════════════════════════════════════════════════════════
-- supabase/schema.sql
-- Esquema completo de base de datos
-- En este modelo se eliminan las tablas auxiliares y se usan solo dos
-- tablas principales: invitaciones y asistentes.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

create table if not exists public.bodas (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  nombre_novio  text not null,
  nombre_novia  text not null,
  fecha         date not null,
  config_json   jsonb default '{}'::jsonb,
  activa        boolean default true,
  created_at    timestamptz default now()
);

create table if not exists public.invitaciones (
  id                    uuid primary key default uuid_generate_v4(),
  wedding_id            uuid not null references public.bodas(id) on delete cascade,
  invite_code           text unique not null,
  nombre_visible        text not null,
  tipo_invitacion       text not null check (tipo_invitacion in ('individual','pareja','familia','otro','soltero')),
  personas_json         jsonb not null default '[]'::jsonb,
  adultos_estimados     integer not null default 0 check (adultos_estimados >= 0),
  adolescentes_estimados integer not null default 0 check (adolescentes_estimados >= 0),
  ninos_estimados       integer not null default 0 check (ninos_estimados >= 0),
  bebes_estimados       integer not null default 0 check (bebes_estimados >= 0),
  estado                text not null default 'pendiente' check (estado in ('pendiente','confirmada','rechazada','pendiente_respondida')),
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create table if not exists public.asistentes (
  id                  uuid primary key default uuid_generate_v4(),
  invitation_id       uuid not null references public.invitaciones(id) on delete cascade,
  nombre              text not null,
  edad                integer,
  tipo_persona        text not null default 'adulto' check (tipo_persona in ('adulto','adolescente','nino','bebe')),
  estado_asistencia   text not null default 'pendiente' check (estado_asistencia in ('si','no','pendiente')),
  transporte          jsonb not null default '[]'::jsonb,
  necesidades         jsonb not null default '{}'::jsonb,
  comentarios         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists public.multimedia (
  id                uuid primary key default uuid_generate_v4(),
  wedding_id        uuid not null references public.bodas(id) on delete cascade,
  nombre            text not null,
  tipo              text not null check (tipo in ('foto','video','audio')),
  google_drive_id   text not null,
  url_publica       text,
  subido_por        text,
  created_at        timestamptz default now()
);

create index if not exists invitaciones_wedding_id_idx on public.invitaciones(wedding_id);
create index if not exists asistentes_invitation_id_idx on public.asistentes(invitation_id);
create index if not exists multimedia_wedding_id_idx on public.multimedia(wedding_id);

alter table public.bodas enable row level security;
alter table public.invitaciones enable row level security;
alter table public.asistentes enable row level security;
alter table public.multimedia enable row level security;

create policy "Bodas activas son públicas"
  on public.bodas for select
  using (activa = true);

create policy "Invitaciones son accesibles públicamente"
  on public.invitaciones for select
  using (true);

create policy "Invitados pueden crear respuestas"
  on public.asistentes for insert
  with check (true);

create policy "Invitados pueden actualizar respuestas"
  on public.asistentes for update
  using (true)
  with check (true);

create policy "Invitados pueden subir multimedia"
  on public.multimedia for insert
  with check (true);

create policy "Multimedia es pública"
  on public.multimedia for select
  using (true);

insert into public.bodas (id, slug, nombre_novio, nombre_novia, fecha, config_json)
values (
  'a0000000-0000-0000-0000-000000000001',
  'pilar-y-david',
  'David',
  'Pilar',
  '2027-03-06',
  '{}'
) on conflict (slug) do nothing;
