import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { ensureDriveSubfolder, uploadFileToDrive, driveFilePublicUrl, deleteFileFromDrive } from "@/lib/google-drive";
import { getWeddingConfig } from "@/lib/wedding-config-server";

type ResourceSection = "historia" | "timeline" | "general";

function parseSection(value: string | null): ResourceSection {
  if (value === "historia" || value === "timeline") return value;
  return "general";
}

function inferMediaType(mimeType: string): "foto" | "video" | "audio" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "foto";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("multimedia")
    .select("id, nombre, url_publica, mime_type, subido_por, created_at")
    .eq("folder_tipo", "recursos_web")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ resources: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const section = parseSection(typeof formData.get("section") === "string" ? (formData.get("section") as string) : null);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
    }

    const config = await getWeddingConfig();
    const parentFolderId = config.drive.recursosWeb.folderId.trim();
    if (!parentFolderId) {
      return NextResponse.json({ error: "Configura primero la carpeta de recursos en Drive" }, { status: 400 });
    }

    const sectionFolderName = section === "historia" ? "historia" : section === "timeline" ? "timeline" : "general";
    let effectiveSharedDriveId = config.drive.recursosWeb.sharedDriveId;
    let targetFolderId: string;
    try {
      targetFolderId = await ensureDriveSubfolder({
        parentFolderId,
        folderName: sectionFolderName,
        sharedDriveId: effectiveSharedDriveId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (effectiveSharedDriveId && message.includes("Shared drive not found")) {
        // Si la carpeta pertenece a Mi unidad, ignoramos sharedDriveId y reintentamos.
        effectiveSharedDriveId = undefined;
        targetFolderId = await ensureDriveSubfolder({
          parentFolderId,
          folderName: sectionFolderName,
        });
      } else {
        throw error;
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFileToDrive({
      folderId: targetFolderId,
      sharedDriveId: effectiveSharedDriveId,
      filename: file.name,
      mimeType: file.type,
      buffer,
    });

    const supabase = createServerClient();
    const { data: boda } = await supabase
      .from("bodas")
      .select("id")
      .eq("slug", config.slug)
      .maybeSingle();

    if (!boda?.id) {
      await deleteFileFromDrive(uploaded.id).catch(() => undefined);
      return NextResponse.json({ error: "No se encontró la boda" }, { status: 404 });
    }

    const { data: media, error } = await supabase
      .from("multimedia")
      .insert({
        wedding_id: boda.id,
        folder_tipo: "recursos_web",
        nombre: file.name,
        tipo: inferMediaType(file.type),
        google_drive_id: uploaded.id,
        url_publica: driveFilePublicUrl(uploaded.id),
        subido_por: `admin:${section}`,
        mime_type: file.type,
        file_size: file.size,
        featured: false,
        visible_public: false,
      })
      .select("id, nombre, url_publica, mime_type, subido_por, created_at")
      .single();

    if (error) {
      await deleteFileFromDrive(uploaded.id).catch(() => undefined);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, resource: media });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al subir recurso";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
