-- Almacena el refresh token OAuth de Google Drive en base de datos para que
-- sobreviva a reinicios/redeploys y se pueda renovar desde el panel de admin
-- sin tener que editar variables de entorno manualmente.
create table if not exists public.google_drive_oauth_tokens (
  id              integer primary key default 1,
  refresh_token   text not null,
  access_token    text,
  access_token_expires_at timestamptz,
  last_verified_at timestamptz,
  last_error      text,
  updated_at      timestamptz default now(),
  constraint google_drive_oauth_tokens_singleton check (id = 1)
);
