/**
 * types/database.ts
 * ─────────────────────────────────────────────────────────────
 * Tipos que reflejan el esquema de Supabase.
 * TODAS las tablas incluyen wedding_id para multitenant desde el inicio.
 */

// ─── Invitado / RSVP ───────────────────────────────────────────
export type Asistente = {
  id: string;
  wedding_id: string; // clave multitenant
  nombre: string;
  apellidos: string;
  email?: string;
  telefono?: string;
  confirma: boolean;
  tiene_acompanante: boolean;
  alergias?: string;
  comentarios?: string;
  transporte_id?: string; // FK a trayecto
  created_at: string;
  updated_at: string;
};

export type Acompanante = {
  id: string;
  wedding_id: string;
  asistente_id: string; // FK al asistente principal
  nombre: string;
  apellidos: string;
  alergias?: string;
  comentarios?: string;
  created_at: string;
};

export type Nino = {
  id: string;
  wedding_id: string;
  asistente_id: string; // FK al asistente responsable
  nombre: string;
  edad: number;
  alergias?: string;
  come_con_padres: boolean; // obligatorio si edad < 6
  created_at: string;
};

// ─── Transporte ────────────────────────────────────────────────
export type ReservaTransporte = {
  id: string;
  wedding_id: string;
  asistente_id: string;
  trayecto_id: string; // ID del trayecto en wedding.config
  num_plazas: number;
  created_at: string;
};

// ─── Multimedia ────────────────────────────────────────────────
export type ArchivoMultimedia = {
  id: string;
  wedding_id: string;
  nombre: string;
  tipo: "foto" | "video" | "audio";
  google_drive_id: string;
  invitation_id?: string;
  folder_tipo?: "recursos_web" | "invitados";
  url_publica?: string;
  subido_por?: string;
  mime_type?: string;
  file_size?: number;
  featured?: boolean;
  visible_public?: boolean;
  created_at: string;
};

export type MensajeInvitacion = {
  id: string;
  wedding_id: string;
  invitation_id: string;
  author_role: "guest" | "admin";
  author_name?: string;
  contenido: string;
  read_at_admin?: string | null;
  read_at_guest?: string | null;
  created_at: string;
};

// ─── Boda (para fase SaaS) ────────────────────────────────────
export type Boda = {
  id: string;
  slug: string;
  nombre_novio: string;
  nombre_novia: string;
  fecha: string;
  config_json: Record<string, unknown>; // Toda la config de wedding.config.ts
  activa: boolean;
  created_at: string;
};

// ─── Tipos de formularios (React) ─────────────────────────────
export type RSVPFormData = {
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  confirma: boolean;
  alergias?: string;
  comentarios?: string;
  tiene_acompanante: boolean;
  acompanante?: {
    nombre: string;
    apellidos: string;
    alergias?: string;
  };
  ninos: Array<{
    nombre: string;
    edad: number;
    alergias?: string;
    come_con_padres: boolean;
  }>;
  transporte_id?: string;
};
