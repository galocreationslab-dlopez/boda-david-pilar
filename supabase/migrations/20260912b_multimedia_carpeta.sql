-- Añade la carpeta de Drive (historia, timeline, intro, general, etc.) a cada
-- recurso para poder acotar los selectores de imagen por sección.
alter table public.multimedia add column if not exists carpeta text;
