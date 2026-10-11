alter table public.invitaciones
  add column if not exists enviada boolean not null default false;
