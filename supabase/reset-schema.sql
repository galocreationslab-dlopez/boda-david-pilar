-- ⚠️ Script de reset para entorno local o base de datos nueva
-- Esto borra las tablas antiguas y recrea el esquema limpio.
-- Úsalo solo cuando quieras empezar desde cero.

-- Borrado de tablas antiguas
DROP TABLE IF EXISTS public.acompanantes CASCADE;
DROP TABLE IF EXISTS public.ninos CASCADE;
DROP TABLE IF EXISTS public.reservas_transporte CASCADE;
DROP TABLE IF EXISTS public.asistentes CASCADE;
DROP TABLE IF EXISTS public.invitaciones CASCADE;
DROP TABLE IF EXISTS public.multimedia CASCADE;
DROP TABLE IF EXISTS public.bodas CASCADE;

-- Extensión necesaria
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla principal de bodas
CREATE TABLE IF NOT EXISTS public.bodas (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  nombre_novio  text not null,
  nombre_novia  text not null,
  fecha         date not null,
  config_json   jsonb default '{}'::jsonb,
  activa        boolean default true,
  created_at    timestamptz default now()
);

-- Invitaciones
CREATE TABLE IF NOT EXISTS public.invitaciones (
  id                    uuid primary key default uuid_generate_v4(),
  wedding_id            uuid not null references public.bodas(id) on delete cascade,
  invite_code           text unique not null,
  nombre_visible        text not null,
  tipo_invitacion       text not null check (tipo_invitacion in ('individual','pareja','familia','otro')),
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

-- Asistentes (una fila por persona)
CREATE TABLE IF NOT EXISTS public.asistentes (
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

-- Multimedia
CREATE TABLE IF NOT EXISTS public.multimedia (
  id                uuid primary key default uuid_generate_v4(),
  wedding_id        uuid not null references public.bodas(id) on delete cascade,
  nombre            text not null,
  tipo              text not null check (tipo in ('foto','video','audio')),
  google_drive_id   text not null,
  url_publica       text,
  subido_por        text,
  created_at        timestamptz default now()
);

CREATE INDEX IF NOT EXISTS invitaciones_wedding_id_idx ON public.invitaciones(wedding_id);
CREATE INDEX IF NOT EXISTS asistentes_invitation_id_idx ON public.asistentes(invitation_id);
CREATE INDEX IF NOT EXISTS multimedia_wedding_id_idx ON public.multimedia(wedding_id);

ALTER TABLE public.bodas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multimedia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bodas activas son públicas"
  ON public.bodas FOR SELECT
  USING (activa = true);

CREATE POLICY "Invitaciones son accesibles públicamente"
  ON public.invitaciones FOR SELECT
  USING (true);

CREATE POLICY "Invitados pueden crear respuestas"
  ON public.asistentes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Invitados pueden actualizar respuestas"
  ON public.asistentes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Invitados pueden subir multimedia"
  ON public.multimedia FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Multimedia es pública"
  ON public.multimedia FOR SELECT
  USING (true);

INSERT INTO public.bodas (id, slug, nombre_novio, nombre_novia, fecha, config_json)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'pilar-y-david',
  'David',
  'Pilar',
  '2027-03-06',
  '{}'
) ON CONFLICT (slug) DO NOTHING;
