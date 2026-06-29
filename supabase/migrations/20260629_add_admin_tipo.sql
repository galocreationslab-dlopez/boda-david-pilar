-- Migración: añadir 'admin' al check constraint de tipo_invitacion
ALTER TABLE public.invitaciones 
  DROP CONSTRAINT invitaciones_tipo_invitacion_check;

ALTER TABLE public.invitaciones 
  ADD CONSTRAINT invitaciones_tipo_invitacion_check 
  CHECK (tipo_invitacion IN ('individual','pareja','familia','otro','soltero','admin'));
