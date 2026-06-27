export type InvitacionTipo = "individual" | "pareja" | "familia" | "otro" | "soltero";
export type PersonaTipo = "adulto" | "adolescente" | "nino" | "bebe";
export type EstadoInvitacion = "pendiente" | "confirmada" | "rechazada" | "pendiente_respondida";
export type EstadoAsistencia = "si" | "no" | "pendiente";

export type Invitacion = {
  id: string;
  wedding_id: string;
  invite_code: string;
  nombre_visible: string;
  tipo_invitacion: InvitacionTipo;
  adultos_estimados: number;
  adolescentes_estimados: number;
  ninos_estimados: number;
  bebes_estimados: number;
  estado: EstadoInvitacion;
  created_at?: string;
  updated_at?: string;
};

export type Asistente = {
  id: string;
  invitation_id: string;
  nombre: string;
  edad?: number | null;
  tipo_persona: PersonaTipo;
  estado_asistencia: EstadoAsistencia;
  transporte?: Array<string>;
  necesidades?: Record<string, unknown>;
  comentarios?: string | null;
  created_at?: string;
  updated_at?: string;
};
