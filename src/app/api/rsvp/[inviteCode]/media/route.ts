import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import { deleteFileFromDrive, driveFilePublicUrl, ensureDriveSubfolder, uploadFileToDrive } from "@/lib/google-drive";

function inferMediaType(mimeType: string): "foto" | "video" | "audio" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "foto";
}

async function getInvitationByCode(supabase: ReturnType<typeof createServerClient>, inviteCode: string) {
  return supabase
    .from("invitaciones")
    .select("id, invite_code, nombre_visible, wedding_id")
    .eq("invite_code", inviteCode)
    .maybeSingle();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  const supabase = createServerClient();
  const { data: invitacion, error } = await getInvitationByCode(supabase, inviteCode);

  if (error || !invitacion) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  const { data, error: mediaError } = await supabase
    .from("multimedia")
    .select("id, nombre, tipo, google_drive_id, url_publica, mime_type, file_size, featured, visible_public, created_at")
    .eq("invitation_id", invitacion.id)
    .eq("folder_tipo", "invitados")
    .order("created_at", { ascending: false });

  if (mediaError) {
    return NextResponse.json({ error: mediaError.message }, { status: 500 });
  }

  const { data: featured } = await supabase
    .from("multimedia")
    .select("id, nombre, tipo, url_publica, created_at")
    .eq("wedding_id", invitacion.wedding_id)
    .eq("visible_public", true)
    .eq("featured", true)
    .order("created_at", { ascending: false });

  return NextResponse.json({ media: data ?? [], featured: featured ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  const supabase = createServerClient();
  const { data: invitacion, error } = await getInvitationByCode(supabase, inviteCode);

  if (error || !invitacion) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  const config = await getWeddingConfig();
  const parentFolderId = config.drive.invitados.folderId.trim();
  if (!parentFolderId) {
    return NextResponse.json({ error: "La carpeta de invitados no está configurada" }, { status: 400 });
  }

  const formData = await request.formData();
  const rawFiles = formData.getAll("files");
  const files = (rawFiles.length > 0 ? rawFiles : [formData.get("file")]).filter((item): item is File => item instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Faltan archivos" }, { status: 400 });
  }

  const invalid = files.find((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"));
  if (invalid) {
    return NextResponse.json({ error: "Solo se permiten imágenes o vídeos" }, { status: 400 });
  }

  let effectiveSharedDriveId = config.drive.invitados.sharedDriveId;
  let invitationFolderId: string;
  try {
    invitationFolderId = await ensureDriveSubfolder({
      parentFolderId,
      folderName: invitacion.id,
      sharedDriveId: effectiveSharedDriveId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (effectiveSharedDriveId && message.includes("Shared drive not found")) {
      effectiveSharedDriveId = undefined;
      invitationFolderId = await ensureDriveSubfolder({
        parentFolderId,
        folderName: invitacion.id,
      });
    } else {
      throw error;
    }
  }

  const uploadedIds: string[] = [];
  const insertedRows: Array<Record<string, unknown>> = [];

  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadFileToDrive({
        folderId: invitationFolderId,
        sharedDriveId: effectiveSharedDriveId,
        filename: file.name,
        mimeType: file.type,
        buffer,
      });
      uploadedIds.push(uploaded.id);

      insertedRows.push({
        wedding_id: invitacion.wedding_id,
        invitation_id: invitacion.id,
        folder_tipo: "invitados",
        nombre: file.name,
        tipo: inferMediaType(file.type),
        google_drive_id: uploaded.id,
        url_publica: driveFilePublicUrl(uploaded.id),
        subido_por: invitacion.nombre_visible,
        mime_type: file.type,
        file_size: file.size,
        featured: false,
        visible_public: false,
      });
    }

    const { data: media, error: mediaError } = await supabase
      .from("multimedia")
      .insert(insertedRows)
      .select("id, nombre, google_drive_id, url_publica, created_at");

    if (mediaError) {
      throw mediaError;
    }

    return NextResponse.json({ ok: true, media: media ?? [] });
  } catch (error) {
    await Promise.all(uploadedIds.map((id) => deleteFileFromDrive(id).catch(() => undefined)));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron subir los archivos" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  const body = (await request.json()) as { mediaId?: string };
  if (!body.mediaId) {
    return NextResponse.json({ error: "Falta mediaId" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: invitacion, error } = await getInvitationByCode(supabase, inviteCode);
  if (error || !invitacion) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  const { data: media, error: mediaError } = await supabase
    .from("multimedia")
    .select("id, google_drive_id")
    .eq("id", body.mediaId)
    .eq("invitation_id", invitacion.id)
    .maybeSingle();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  await deleteFileFromDrive(media.google_drive_id).catch(() => undefined);

  const { error: deleteError } = await supabase.from("multimedia").delete().eq("id", body.mediaId).eq("invitation_id", invitacion.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}