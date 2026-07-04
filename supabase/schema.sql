-- ═══════════════════════════════════════════════════════════════
-- supabase/schema.sql
-- Esquema completo de base de datos
-- En este modelo se eliminan las tablas auxiliares y se usan solo dos
-- tablas principales: invitaciones y asistentes.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

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
  tipo_invitacion       text not null check (tipo_invitacion in ('individual','pareja','familia','otro','soltero','admin')),
  nombre1               text not null,
  nombre2               text,
  adultos_estimados     integer not null default 0 check (adultos_estimados >= 0),
  adolescentes_estimados integer not null default 0 check (adolescentes_estimados >= 0),
  ninos_estimados       integer not null default 0 check (ninos_estimados >= 0),
  bebes_estimados       integer not null default 0 check (bebes_estimados >= 0),
  estado                text not null default 'pendiente' check (estado in ('pendiente','confirmada','rechazada','pendiente_respondida')),
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
  invitation_id     uuid references public.invitaciones(id) on delete cascade,
  folder_tipo       text not null default 'recursos_web' check (folder_tipo in ('recursos_web','invitados')),
  nombre            text not null,
  tipo              text not null check (tipo in ('foto','video','audio')),
  google_drive_id   text not null,
  url_publica       text,
  subido_por        text,
  mime_type         text,
  file_size         bigint,
  featured          boolean not null default false,
  visible_public    boolean not null default false,
  created_at        timestamptz default now()
);

create table if not exists public.invitaciones_mensajes (
  id              uuid primary key default uuid_generate_v4(),
  wedding_id      uuid not null references public.bodas(id) on delete cascade,
  invitation_id   uuid not null references public.invitaciones(id) on delete cascade,
  author_role     text not null check (author_role in ('guest','admin')),
  author_name     text,
  contenido       text not null,
  read_at_admin   timestamptz,
  read_at_guest   timestamptz,
  created_at      timestamptz default now()
);

create index if not exists invitaciones_wedding_id_idx on public.invitaciones(wedding_id);
create index if not exists asistentes_invitation_id_idx on public.asistentes(invitation_id);
create index if not exists multimedia_wedding_id_idx on public.multimedia(wedding_id);
create index if not exists multimedia_invitation_id_idx on public.multimedia(invitation_id);
create index if not exists multimedia_visible_public_idx on public.multimedia(visible_public, featured);
create index if not exists mensajes_invitation_id_idx on public.invitaciones_mensajes(invitation_id);
create index if not exists mensajes_admin_unread_idx on public.invitaciones_mensajes(read_at_admin);

create table if not exists public.tipos_seccion (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  acceso_nivel text not null default 'public'
    check (acceso_nivel in ('public','basic','premium','custom','paid')),
  precio_cents integer not null default 0 check (precio_cents >= 0),
  es_predefinido boolean not null default true,
  schema_items jsonb not null default '{}'::jsonb,
  schema_layout jsonb not null default '{"desktop":{},"mobile":{}}'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bodas_secciones (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade,
  tipo_seccion_id uuid not null references public.tipos_seccion(id),
  clave_config text not null,
  titulo text,
  subtitulo text,
  idioma text not null default 'es',
  orden integer not null check (orden > 0),
  visible boolean not null default true,
  audiencia_roles text[] not null default array['*']::text[],
  config jsonb not null default '{}'::jsonb,
  layout_overrides jsonb not null default '{"desktop":{},"mobile":{}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (boda_id, orden),
  unique (boda_id, clave_config, idioma)
);

create table if not exists public.secciones_items (
  id uuid primary key default gen_random_uuid(),
  seccion_id uuid not null references public.bodas_secciones(id) on delete cascade,
  orden integer not null check (orden > 0),
  visible boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seccion_id, orden)
);

create table if not exists public.secciones_items_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.secciones_items(id) on delete cascade,
  orden integer not null default 1 check (orden > 0),
  media_kind text not null check (media_kind in ('imagen','video')),
  media_source text not null default 'google_drive'
    check (media_source in ('google_drive','supabase','externo')),
  google_drive_file_id text,
  media_url text,
  mime_type text,
  alt_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, orden),
  check (google_drive_file_id is not null or media_url is not null)
);

create index if not exists bodas_secciones_boda_idx on public.bodas_secciones(boda_id);
create index if not exists bodas_secciones_clave_idx on public.bodas_secciones(clave_config);
create index if not exists bodas_secciones_roles_idx on public.bodas_secciones using gin(audiencia_roles);
create index if not exists secciones_items_seccion_idx on public.secciones_items(seccion_id);
create index if not exists secciones_items_media_item_idx on public.secciones_items_media(item_id);

alter table public.bodas enable row level security;
alter table public.invitaciones enable row level security;
alter table public.asistentes enable row level security;
alter table public.multimedia enable row level security;
alter table public.invitaciones_mensajes enable row level security;
alter table public.tipos_seccion enable row level security;
alter table public.bodas_secciones enable row level security;
alter table public.secciones_items enable row level security;
alter table public.secciones_items_media enable row level security;

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

create policy "Mensajes de invitaciones son visibles para el backend"
  on public.invitaciones_mensajes for select
  using (true);

create policy "Mensajes de invitaciones pueden crearse"
  on public.invitaciones_mensajes for insert
  with check (true);

create policy "Mensajes de invitaciones pueden actualizarse"
  on public.invitaciones_mensajes for update
  using (true)
  with check (true);

create policy "tipos_seccion visibles"
  on public.tipos_seccion for select
  using (activo = true);

create policy "secciones visibles"
  on public.bodas_secciones for select
  using (visible = true);

create policy "items visibles"
  on public.secciones_items for select
  using (visible = true);

create policy "media visible"
  on public.secciones_items_media for select
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
