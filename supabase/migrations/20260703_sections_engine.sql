-- Motor de secciones configurable para bodas
-- Incluye:
-- - tipos_seccion (plantillas + privilegios/precio)
-- - bodas_secciones (instancias ordenadas por boda, con visibilidad por rol)
-- - secciones_items (contenido ordenado por seccion)
-- - secciones_items_media (imagenes/videos, preparado para Google Drive)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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

create trigger tr_tipos_seccion_updated_at
before update on public.tipos_seccion
for each row execute function public.set_updated_at();

create trigger tr_bodas_secciones_updated_at
before update on public.bodas_secciones
for each row execute function public.set_updated_at();

create trigger tr_secciones_items_updated_at
before update on public.secciones_items
for each row execute function public.set_updated_at();

create trigger tr_secciones_items_media_updated_at
before update on public.secciones_items_media
for each row execute function public.set_updated_at();

alter table public.tipos_seccion enable row level security;
alter table public.bodas_secciones enable row level security;
alter table public.secciones_items enable row level security;
alter table public.secciones_items_media enable row level security;

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

insert into public.tipos_seccion (slug, nombre, descripcion, acceso_nivel, precio_cents, es_predefinido, schema_items, schema_layout)
values
  (
    'historia_lista',
    'Historia en lista',
    'Entradas cronologicas para la historia de la pareja',
    'public',
    0,
    true,
    '{
      "required": ["fecha", "titulo", "descripcion"],
      "properties": {
        "fecha": {"type":"string"},
        "titulo": {"type":"string"},
        "descripcion": {"type":"string"},
        "imagen": {"type":"string"},
        "lado": {"type":"string", "enum":["izquierda","derecha"]}
      }
    }'::jsonb,
    '{"desktop":{"variant":"timeline-cards"},"mobile":{"variant":"stack"}}'::jsonb
  ),
  (
    'timeline_lista',
    'Timeline del gran dia',
    'Secuencia de eventos del dia de la boda',
    'public',
    0,
    true,
    '{
      "required": ["hora", "titulo", "descripcion", "icono"],
      "properties": {
        "hora": {"type":"string"},
        "titulo": {"type":"string"},
        "descripcion": {"type":"string"},
        "icono": {"type":"string"},
        "enlaceMaps": {"type":"string"}
      }
    }'::jsonb,
    '{"desktop":{"variant":"timeline-horizontal"},"mobile":{"variant":"timeline-vertical"}}'::jsonb
  )
on conflict (slug) do update
set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  schema_items = excluded.schema_items,
  schema_layout = excluded.schema_layout,
  acceso_nivel = excluded.acceso_nivel,
  precio_cents = excluded.precio_cents,
  es_predefinido = excluded.es_predefinido,
  activo = true,
  updated_at = now();

with historia_tipo as (
  select id from public.tipos_seccion where slug = 'historia_lista'
),
linea_tiempo_tipo as (
  select id from public.tipos_seccion where slug = 'timeline_lista'
)
insert into public.bodas_secciones (boda_id, tipo_seccion_id, clave_config, titulo, subtitulo, orden, visible, audiencia_roles, idioma)
select b.id, ht.id, 'historia', 'Nuestra historia', 'El camino hasta aqui', 20, true, array['*']::text[], 'es'
from public.bodas b
cross join historia_tipo ht
where jsonb_typeof(b.config_json -> 'historia') = 'array'
on conflict (boda_id, clave_config, idioma) do update
set
  tipo_seccion_id = excluded.tipo_seccion_id,
  titulo = excluded.titulo,
  subtitulo = excluded.subtitulo,
  visible = true,
  updated_at = now();

with historia_secciones as (
  select bs.id as seccion_id, b.config_json -> 'historia' as items
  from public.bodas_secciones bs
  join public.bodas b on b.id = bs.boda_id
  where bs.clave_config = 'historia'
    and jsonb_typeof(b.config_json -> 'historia') = 'array'
)
insert into public.secciones_items (seccion_id, orden, payload, visible)
select hs.seccion_id, ord::integer,
  jsonb_build_object(
    'id', coalesce(item->>'id', 'h' || ord::text),
    'fecha', coalesce(item->>'fecha', ''),
    'titulo', coalesce(item->>'titulo', ''),
    'descripcion', coalesce(item->>'descripcion', ''),
    'imagen', coalesce(item->>'imagen', ''),
    'lado', coalesce(item->>'lado', 'derecha')
  ),
  true
from historia_secciones hs,
     lateral jsonb_array_elements(hs.items) with ordinality as arr(item, ord)
on conflict (seccion_id, orden) do update
set payload = excluded.payload,
    visible = excluded.visible,
    updated_at = now();

with linea_tiempo_tipo as (
  select id from public.tipos_seccion where slug = 'timeline_lista'
)
insert into public.bodas_secciones (boda_id, tipo_seccion_id, clave_config, titulo, subtitulo, orden, visible, audiencia_roles, idioma)
select b.id, lt.id, 'timeline', 'El gran dia', 'Cronologia del evento', 30, true, array['*']::text[], 'es'
from public.bodas b
cross join linea_tiempo_tipo lt
where jsonb_typeof(b.config_json -> 'timeline') = 'array'
on conflict (boda_id, clave_config, idioma) do update
set
  tipo_seccion_id = excluded.tipo_seccion_id,
  titulo = excluded.titulo,
  subtitulo = excluded.subtitulo,
  visible = true,
  updated_at = now();

with timeline_secciones as (
  select bs.id as seccion_id, b.config_json -> 'timeline' as items
  from public.bodas_secciones bs
  join public.bodas b on b.id = bs.boda_id
  where bs.clave_config = 'timeline'
    and jsonb_typeof(b.config_json -> 'timeline') = 'array'
)
insert into public.secciones_items (seccion_id, orden, payload, visible)
select ts.seccion_id, ord::integer,
  jsonb_build_object(
    'id', coalesce(item->>'id', 't' || ord::text),
    'hora', coalesce(item->>'hora', ''),
    'titulo', coalesce(item->>'titulo', ''),
    'descripcion', coalesce(item->>'descripcion', ''),
    'icono', coalesce(item->>'icono', 'rings'),
    'enlaceMaps', coalesce(item->>'enlaceMaps', '')
  ),
  true
from timeline_secciones ts,
     lateral jsonb_array_elements(ts.items) with ordinality as arr(item, ord)
on conflict (seccion_id, orden) do update
set payload = excluded.payload,
    visible = excluded.visible,
    updated_at = now();