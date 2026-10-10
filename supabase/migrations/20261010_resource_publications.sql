-- Publication metadata is private; images in the Blob store are public.
create table if not exists public.resource_publications (
  wedding_id uuid not null references public.bodas(id) on delete cascade,
  drive_file_id text not null,
  name text not null default '',
  source_version text,
  blob_url text,
  bytes bigint,
  sha256 text,
  published_at timestamptz,
  last_error text,
  lease_token uuid,
  lease_expires_at timestamptz,
  primary key (wedding_id, drive_file_id)
);
alter table public.resource_publications enable row level security;
revoke all on public.resource_publications from anon, authenticated;
grant select, insert, update on public.resource_publications to service_role;

create or replace function public.claim_resource_publication(
  p_wedding_id uuid, p_drive_file_id text, p_lease_token uuid
) returns boolean
language plpgsql
set search_path = public
as $$
declare claimed boolean;
begin
  insert into public.resource_publications (wedding_id, drive_file_id)
    values (p_wedding_id, p_drive_file_id) on conflict do nothing;
  update public.resource_publications
    set lease_token = p_lease_token, lease_expires_at = now() + interval '330 seconds'
    where wedding_id = p_wedding_id and drive_file_id = p_drive_file_id
      and (lease_expires_at is null or lease_expires_at < now());
  claimed := found;
  return claimed;
end;
$$;
revoke all on function public.claim_resource_publication(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_resource_publication(uuid, text, uuid) to service_role;
