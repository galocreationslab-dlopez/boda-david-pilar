import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { InviteRsvpForm } from "@/components/wedding/InviteRsvpForm";
import { getWeddingConfig } from "@/lib/wedding-config-server";

export const dynamic = "force-dynamic";

type InvitacionRow = {
  id: string;
  nombre_visible: string;
  adultos_estimados?: number | null;
  adolescentes_estimados?: number | null;
  ninos_estimados?: number | null;
  bebes_estimados?: number | null;
};

type AsistenteRow = {
  id: string;
  nombre: string;
  edad: number | null;
  tipo_persona: string;
  estado_asistencia: string;
  transporte: string[];
  necesidades: Record<string, unknown>;
  comentarios: string | null;
};

function buildPersonasFromInvitation(invitacion: InvitacionRow) {
  const personas: AsistenteRow[] = [];

  for (let index = 0; index < Number(invitacion.adultos_estimados || 0); index += 1) {
    personas.push({
      id: "",
      nombre: Number(invitacion.adultos_estimados || 0) === 1 ? invitacion.nombre_visible || "Invitado" : `${invitacion.nombre_visible || "Invitado"} - Adulto ${index + 1}`,
      edad: null,
      tipo_persona: "adulto",
      estado_asistencia: "pendiente",
      transporte: [],
      necesidades: {},
      comentarios: null,
    });
  }

  for (let index = 0; index < Number(invitacion.adolescentes_estimados || 0); index += 1) {
    personas.push({
      id: "",
      nombre: `${invitacion.nombre_visible || "Invitado"} - Adolescente ${index + 1}`,
      edad: null,
      tipo_persona: "adolescente",
      estado_asistencia: "pendiente",
      transporte: [],
      necesidades: {},
      comentarios: null,
    });
  }

  for (let index = 0; index < Number(invitacion.ninos_estimados || 0); index += 1) {
    personas.push({
      id: "",
      nombre: `${invitacion.nombre_visible || "Invitado"} - Niño ${index + 1}`,
      edad: null,
      tipo_persona: "nino",
      estado_asistencia: "pendiente",
      transporte: [],
      necesidades: {},
      comentarios: null,
    });
  }

  for (let index = 0; index < Number(invitacion.bebes_estimados || 0); index += 1) {
    personas.push({
      id: "",
      nombre: `${invitacion.nombre_visible || "Invitado"} - Bebé ${index + 1}`,
      edad: null,
      tipo_persona: "bebe",
      estado_asistencia: "pendiente",
      transporte: [],
      necesidades: {},
      comentarios: null,
    });
  }

  return personas;
}

async function getInvitation(inviteCode: string) {
  const supabase = createServerClient();

  const { data: invitacion, error } = await supabase
    .from("invitaciones")
    .select("id, invite_code, nombre_visible, tipo_invitacion, nombre1, nombre2, adultos_estimados, adolescentes_estimados, ninos_estimados, bebes_estimados")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (error || !invitacion) {
    return null;
  }

  const { data: asistentes } = await supabase
    .from("asistentes")
    .select("id, nombre, edad, tipo_persona, estado_asistencia, transporte, necesidades, comentarios")
    .eq("invitation_id", invitacion.id)
    .order("created_at", { ascending: true });

  const personas = asistentes?.length
    ? asistentes.map((asistente: AsistenteRow) => ({
        id: asistente.id,
        nombre: asistente.nombre,
        edad: asistente.edad,
        tipo_persona: asistente.tipo_persona,
        estado_asistencia: asistente.estado_asistencia,
      transporte: Array.isArray(asistente.transporte) ? asistente.transporte.filter((item): item is string => typeof item === "string") : [],
        necesidades: asistente.necesidades,
        comentarios: asistente.comentarios,
      }))
    : buildPersonasFromInvitation(invitacion);

  return { invitacion, personas };
}

export default async function InviteCodePage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  const data = await getInvitation(inviteCode);
  const config = await getWeddingConfig();

  if (!data) {
    notFound();
  }

  const galeriaSection = config.diseno?.secciones?.find((section) => section.tipo === "galeria");

  return (
    <InviteRsvpForm
      inviteCode={inviteCode}
      invitacion={data.invitacion}
      personas={data.personas}
      galeriaConfig={{
        mostrarSeleccionNovios: galeriaSection?.galeriaConfig?.mostrarSeleccionNovios ?? true,
        mostrarSubidasPorMi: galeriaSection?.galeriaConfig?.mostrarSubidasPorMi ?? true,
      }}
    />
  );
}
