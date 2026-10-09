-- Immutable visual-only snapshots. Browser clients cannot access this table or RPC.
create table if not exists public.visual_versions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.bodas(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('named', 'backup')),
  schema_version integer not null check (schema_version = 1),
  snapshot jsonb not null check (
    snapshot->>'schema' = 'wedding-visual'
    and snapshot->>'schemaVersion' = '1'
    and snapshot->>'rolesModel' = 'legacy-v1'
  )
);
create index if not exists visual_versions_wedding_date_idx
  on public.visual_versions(wedding_id, created_at desc);
alter table public.visual_versions enable row level security;
revoke all on public.visual_versions from anon, authenticated, service_role;
grant select, insert, delete on public.visual_versions to service_role;

create or replace function public.apply_visual_version(
  p_wedding_id uuid,
  p_expected_config jsonb,
  p_next_config jsonb,
  p_backup jsonb,
  p_name text
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_config jsonb;
  backup_id uuid;
begin
  select config_json into current_config from public.bodas
    where id = p_wedding_id for update;
  if not found then raise exception 'Boda no encontrada'; end if;
  if current_config is distinct from p_expected_config then
    raise exception 'La configuracion ha cambiado. Previsualiza de nuevo.' using errcode = '40001';
  end if;
  insert into public.visual_versions(wedding_id, name, kind, schema_version, snapshot)
    values (p_wedding_id, p_name, 'backup', 1, p_backup)
    returning id into backup_id;
  update public.bodas set config_json = p_next_config where id = p_wedding_id;
  return backup_id;
end;
$$;
revoke all on function public.apply_visual_version(uuid, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.apply_visual_version(uuid, jsonb, jsonb, jsonb, text) to service_role;
