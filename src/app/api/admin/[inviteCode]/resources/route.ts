import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import {
  ensureDriveSubfolder,
  uploadFileToDrive,
  driveFilePublicUrl,
  deleteFileFromDrive,
  makeDriveFilePublic,
  listDriveSubfolders,
  listDriveImageFiles,
  getDriveFileMetadata,
} from "@/lib/google-drive";
import { getWeddingConfig } from "@/lib/wedding-config-server";

type ResourceSection = "historia" | "timeline" | "intro" | "general";

function parseSection(value: string | null): ResourceSection {
  if (value === "historia" || value === "timeline" || value === "intro") return value;
  return "general";
}

function inferMediaType(mimeType: string): "foto" | "video" | "audio" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "foto";
}

function isMissingCarpetaColumnError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("carpeta") && (message.includes("column") || message.includes("schema cache"));
}

/**
 * Recorre las subcarpetas de "Recursos" en Drive y:
 * - da de alta en Supabase cualquier imagen subida manualmente (fuera del
 *   panel de admin), etiquetada con la carpeta donde vive (para poder
 *   acotar los selectores por sección),
 * - borra de Supabase cualquier recurso cuyo archivo ya no exista en Drive,
 *   para que no se puedan seleccionar imágenes inexistentes.
 */
async function syncResourcesFromDrive(weddingId: string): Promise<Map<string, string>> {
  const config = await getWeddingConfig();
  const parentFolderId = config.drive.recursosWeb.folderId.trim();
  if (!parentFolderId) return new Map();

  const sharedDriveId = config.drive.recursosWeb.sharedDriveId;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("multimedia")
    .select("id, google_drive_id")
    .eq("folder_tipo", "recursos_web")
    .not("google_drive_id", "is", null);
  const existingRows = existing ?? [];
  const folderByFileId = new Map<string, string>();
  const knownIds = new Set(existingRows.map((row) => row.google_drive_id as string));

  try {
    const subfolders = await listDriveSubfolders({ parentFolderId, sharedDriveId });
    // Excluimos las subcarpetas "LineAlive" (contienen los HTML generados, no imágenes de origen).
    const sectionFolders = subfolders.filter((folder) => folder.name.toLowerCase() !== "linealive");

    const foundFolderByFileId = new Map<string, string>();
    const scannedFolders = new Set<string>();

    for (const folder of sectionFolders) {
      const carpeta = folder.name.trim().toLowerCase();
      let images;
      try {
        images = await listDriveImageFiles({ folderId: folder.id, sharedDriveId });
      } catch {
        // No pudimos leer esta carpeta: la excluimos de la limpieza de huérfanos por prudencia.
        continue;
      }
      scannedFolders.add(carpeta);
      for (const file of images) foundFolderByFileId.set(file.id, carpeta);

      const newImages = images.filter((file) => !knownIds.has(file.id));
      if (newImages.length === 0) continue;

      await makeFilesPublicBestEffort(newImages.map((file) => file.id));

      const mediaRows = newImages.map((file) => ({
          wedding_id: weddingId,
          folder_tipo: "recursos_web",
          nombre: file.name,
          tipo: inferMediaType(file.mimeType || "image/"),
          google_drive_id: file.id,
          url_publica: driveFilePublicUrl(file.id),
          subido_por: `drive-sync:${folder.name}`,
          mime_type: file.mimeType || "image/*",
          file_size: file.size ? Number(file.size) : null,
          carpeta,
          featured: false,
          visible_public: false,
        }));
      const { error: insertError } = await supabase.from("multimedia").insert(mediaRows);
      if (isMissingCarpetaColumnError(insertError)) {
        await supabase.from("multimedia").insert(mediaRows.map(({ carpeta: _carpeta, ...row }) => row));
      }
      newImages.forEach((file) => knownIds.add(file.id));
      newImages.forEach((file) => folderByFileId.set(file.id, carpeta));
    }

    // Recolocar/backfill de carpeta para filas ya existentes que hayan cambiado de sitio o no la tuvieran.
    for (const row of existingRows) {
      const carpeta = foundFolderByFileId.get(row.google_drive_id as string);
      if (carpeta) folderByFileId.set(row.google_drive_id as string, carpeta);
    }

    const staleIds = new Set<string>();
    for (const row of existingRows) {
      const driveId = row.google_drive_id as string | null;
      if (!driveId) continue;
      const isKnownInScannedFolders = foundFolderByFileId.has(driveId);
      if (isKnownInScannedFolders) continue;
      try {
        await getDriveFileMetadata(driveId);
      } catch {
        staleIds.add(row.id);
      }
    }
    if (staleIds.size > 0) {
      await supabase.from("multimedia").delete().in("id", [...staleIds]);
    }
  } catch (error) {
    // Si Drive no responde (token caducado, etc.) no tocamos lo ya guardado.
    console.error("[resources] No se pudo sincronizar recursos desde Drive", error);
  }
  return folderByFileId;
}

async function makeFilesPublicBestEffort(fileIds: string[]): Promise<void> {
  await Promise.all(fileIds.map((id) => makeDriveFilePublic(id).catch(() => undefined)));
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

  const config = await getWeddingConfig();
  const { data: boda } = await supabase
    .from("bodas")
    .select("id")
    .eq("slug", config.slug)
    .maybeSingle();

  const folderByFileId = boda?.id ? await syncResourcesFromDrive(boda.id) : new Map<string, string>();

  const sectionParam = parseSection(new URL(_request.url).searchParams.get("section"));
  const query = supabase
    .from("multimedia")
    .select("id, nombre, google_drive_id, url_publica, mime_type, subido_por, created_at")
    .eq("folder_tipo", "recursos_web");

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resources = (data ?? []).filter((resource) => {
    if (sectionParam === "general") return true;
    const folder = folderByFileId.get(resource.google_drive_id);
    return folder === sectionParam || resource.subido_por === `admin:${sectionParam}` || resource.subido_por === `drive-sync:${sectionParam}`;
  }).map((resource) => ({
    ...resource,
    carpeta: folderByFileId.get(resource.google_drive_id) ?? resource.subido_por?.replace(/^(?:admin|drive-sync):/i, "") ?? null,
    url_publica: resource.url_publica && (resource.mime_type === "image/svg+xml" || /\.svg$/i.test(resource.nombre))
      ? `/api/resources/preview?src=${encodeURIComponent(resource.url_publica)}`
      : resource.url_publica,
  }));

  return NextResponse.json({ resources });
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

    const sectionFolderName = section === "historia"
      ? "historia"
      : section === "timeline"
        ? "timeline"
        : section === "intro"
          ? "intro"
          : "general";
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

    await makeDriveFilePublic(uploaded.id);

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

    const mediaInsert = {
      wedding_id: boda.id,
      folder_tipo: "recursos_web",
      nombre: file.name,
      tipo: inferMediaType(file.type),
      google_drive_id: uploaded.id,
      url_publica: driveFilePublicUrl(uploaded.id),
      subido_por: `admin:${section}`,
      mime_type: file.type,
      file_size: file.size,
      carpeta: sectionFolderName,
      featured: false,
      visible_public: false,
    };
    let { data: media, error } = await supabase
      .from("multimedia")
      .insert(mediaInsert)
      .select("id, nombre, google_drive_id, url_publica, mime_type, subido_por, created_at")
      .single();

    if (isMissingCarpetaColumnError(error)) {
      const { carpeta: _carpeta, ...legacyInsert } = mediaInsert;
      ({ data: media, error } = await supabase
        .from("multimedia")
        .insert(legacyInsert)
        .select("id, nombre, google_drive_id, url_publica, mime_type, subido_por, created_at")
        .single());
    }

    if (error) {
      await deleteFileFromDrive(uploaded.id).catch(() => undefined);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resource = media
      ? {
          ...media,
          carpeta: sectionFolderName,
          url_publica: file.type === "image/svg+xml" && media.url_publica
            ? `/api/resources/preview?src=${encodeURIComponent(media.url_publica)}`
            : media.url_publica,
        }
      : media;
    return NextResponse.json({ ok: true, resource });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al subir recurso";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
