-- ═══════════════════════════════════════════════════════════════
-- supabase/schema.sql
-- Esquema completo de base de datos
-- IMPORTANTE: Todas las tablas incluyen wedding_id para soporte
-- multitenant desde el primer día. En fase A solo habrá una boda.
-- En fase SaaS, añadir bodas es tan simple como insertar filas.
-- ═══════════════════════════════════════════════════════════════

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- Tabla: bodas
-- Registro de cada boda (fase A: una sola fila)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.bodas (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,           -- URL-friendly: "carlos-y-maria"
  nombre_novio  text not null,
  nombre_novia  text not null,
  fecha         date not null,
  config_json   jsonb default '{}',             -- Toda la config dinámica
  activa         boolean default true,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- Tabla: asistentes
-- Un asistente = una persona que recibe invitación directa
-- ─────────────────────────────────────────────────────────────
create table if not exists public.asistentes (
  id                  uuid primary key default uuid_generate_v4(),
  wedding_id          uuid not null references public.bodas(id) on delete cascade,
  nombre              text not null,
  apellidos           text not null,
  email               text,
  telefono            text,
  confirma            boolean,                  -- null = sin responder
  tiene_acompanante   boolean default false,
  alergias            text,
  comentarios         text,
  transporte_id       text,                     -- ID del trayecto en config
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists asistentes_wedding_id_idx on public.asistentes(wedding_id);

-- ─────────────────────────────────────────────────────────────
-- Tabla: acompanantes
-- Acompañante de un asistente (pareja, amigo, etc.)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.acompanantes (
  id              uuid primary key default uuid_generate_v4(),
  wedding_id      uuid not null references public.bodas(id) on delete cascade,
  asistente_id    uuid not null references public.asistentes(id) on delete cascade,
  nombre          text not null,
  apellidos       text not null,
  alergias        text,
  comentarios     text,
  created_at      timestamptz default now()
);

create index if not exists acompanantes_asistente_id_idx on public.acompanantes(asistente_id);

-- ─────────────────────────────────────────────────────────────
-- Tabla: ninos
-- Niños que asisten con algún asistente
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ninos (
  id              uuid primary key default uuid_generate_v4(),
  wedding_id      uuid not null references public.bodas(id) on delete cascade,
  asistente_id    uuid not null references public.asistentes(id) on delete cascade,
  nombre          text not null,
  edad            integer not null check (edad >= 0 and edad <= 17),
  alergias        text,
  come_con_padres boolean not null default false,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- Tabla: reservas_transporte
-- Reserva de plaza en alguno de los trayectos configurados
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reservas_transporte (
  id              uuid primary key default uuid_generate_v4(),
  wedding_id      uuid not null references public.bodas(id) on delete cascade,
  asistente_id    uuid not null references public.asistentes(id) on delete cascade,
  trayecto_id     text not null,               -- ID del trayecto en wedding.config
  num_plazas      integer not null default 1 check (num_plazas > 0),
  created_at      timestamptz default now(),
  unique(asistente_id, trayecto_id)            -- Un asistente, un trayecto
);

-- ─────────────────────────────────────────────────────────────
-- Tabla: multimedia
-- Registro de archivos subidos a Google Drive
-- ─────────────────────────────────────────────────────────────
create table if not exists public.multimedia (
  id                uuid primary key default uuid_generate_v4(),
  wedding_id        uuid not null references public.bodas(id) on delete cascade,
  nombre            text not null,
  tipo              text not null check (tipo in ('foto', 'video', 'audio')),
  google_drive_id   text not null,             -- ID del archivo en Google Drive
  url_publica       text,                       -- URL pública si el archivo es compartido
  subido_por        text,                       -- Nombre o identificador del invitado
  created_at        timestamptz default now()
);

create index if not exists multimedia_wedding_id_idx on public.multimedia(wedding_id);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- En fase A: permiso público para RSVP, restringido para admin
-- ─────────────────────────────────────────────────────────────
alter table public.bodas enable row level security;
alter table public.asistentes enable row level security;
alter table public.acompanantes enable row level security;
alter table public.ninos enable row level security;
alter table public.reservas_transporte enable row level security;
alter table public.multimedia enable row level security;

-- Política de solo lectura pública para bodas activas
create policy "Bodas activas son públicas"
  on public.bodas for select
  using (activa = true);

-- Política de inserción pública para RSVP (cualquier invitado puede confirmar)
create policy "Invitados pueden crear asistentes"
  on public.asistentes for insert
  with check (true);

create policy "Invitados pueden crear acompañantes"
  on public.acompanantes for insert
  with check (true);

create policy "Invitados pueden registrar niños"
  on public.ninos for insert
  with check (true);

create policy "Invitados pueden reservar transporte"
  on public.reservas_transporte for insert
  with check (true);

create policy "Invitados pueden subir multimedia"
  on public.multimedia for insert
  with check (true);

-- Lectura pública de multimedia (galería)
create policy "Multimedia es pública"
  on public.multimedia for select
  using (true);

-- ─────────────────────────────────────────────────────────────
-- Datos iniciales — boda de fase A
-- ─────────────────────────────────────────────────────────────
insert into public.bodas (id, slug, nombre_novio, nombre_novia, fecha, config_json)
values (
  'a0000000-0000-0000-0000-000000000001',
  'pilar-y-david',
  'David',
  'Pilar',
  '2027-03-06',
  '{}'
) on conflict (slug) do nothing;
