import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import MediaView from "@/components/admin/MediaView";

async function getData() {
  const supabase = createServerClient();

  const { data: media } = await supabase
    .from("multimedia")
    .select("id, wedding_id, invitation_id, folder_tipo, nombre, tipo, google_drive_id, url_publica, subido_por, mime_type, file_size, featured, visible_public, created_at")
    .order("created_at", { ascending: false });

  const { data: invitaciones } = await supabase
    .from("invitaciones")
    .select("id, invite_code, nombre_visible, estado, tipo_invitacion")
    .neq("tipo_invitacion", "admin")
    .order("nombre_visible");

  const { data: mensajes } = await supabase
    .from("invitaciones_mensajes")
    .select("id, invitation_id, author_role, author_name, contenido, read_at_admin, read_at_guest, created_at")
    .order("created_at", { ascending: false });

  return {
    media: media ?? [],
    invitaciones: invitaciones ?? [],
    mensajes: mensajes ?? [],
  };
}

export default async function MediosPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;

  if (!(await validateAdminCode(inviteCode))) {
    notFound();
  }

  const config = await getWeddingConfig();
  const data = await getData();

  return <MediaView inviteCode={inviteCode} drive={config.drive} media={data.media} invitaciones={data.invitaciones} mensajes={data.mensajes} />;
}