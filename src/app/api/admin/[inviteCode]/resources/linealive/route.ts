import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { createServerClient } from "@/lib/supabase/server";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import { detectLineAliveAspectRatioFromHtml } from "@/lib/linealive/utils";
import { generateLineAliveAnimation } from "@/lib/linealive/client";
import { downloadDriveFile, ensureDriveSubfolder, getDriveFileMetadata, uploadFileToDrive } from "@/lib/google-drive";
import sharp from "sharp";

export const runtime = "nodejs";

function getBaseFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function normalizeImageName(fileName: string): string {
  const base = getBaseFileName(fileName).trim() || "image";
  return `${base}_la.jpg`;
}

async function optimizeImageForLineAlive(input: {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  const MAX_DIMENSION = 1600;
  const MAX_BYTES = 450_000;

  try {
    const instance = sharp(input.buffer, { failOn: "none", sequentialRead: true });
    const metadata = await instance.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const shouldResize = width > MAX_DIMENSION || height > MAX_DIMENSION;
    const shouldCompress = input.buffer.byteLength > MAX_BYTES;

    if (!shouldResize && !shouldCompress) {
      return input;
    }

    const processed = await instance
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    return {
      buffer: processed,
      contentType: "image/jpeg",
      fileName: normalizeImageName(input.fileName),
    };
  } catch {
    // Si falla el optimizador, mantenemos el flujo original para no bloquear la generación.
    return input;
  }
}

async function ensureLineAliveFolder(parentFolderId: string, sharedDriveId?: string): Promise<{ folderId: string; effectiveSharedDriveId?: string }> {
  try {
    const folderId = await ensureDriveSubfolder({
      parentFolderId,
      folderName: "LineAlive",
      sharedDriveId,
    });
    return { folderId, effectiveSharedDriveId: sharedDriveId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (sharedDriveId && message.includes("Shared drive not found")) {
      const folderId = await ensureDriveSubfolder({
        parentFolderId,
        folderName: "LineAlive",
      });
      return { folderId };
    }
    throw error;
  }
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
    const body = (await request.json()) as { resourceId?: string; detail?: string };
    const resourceId = typeof body.resourceId === "string" ? body.resourceId.trim() : "";
    const detail = typeof body.detail === "string" ? body.detail.trim() : "";

    if (!resourceId) {
      return NextResponse.json({ error: "Falta resourceId" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: resource, error } = await supabase
      .from("multimedia")
      .select("id, nombre, mime_type, google_drive_id, folder_tipo")
      .eq("id", resourceId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!resource || resource.folder_tipo !== "recursos_web" || !resource.google_drive_id) {
      return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 });
    }

    if (!resource.mime_type?.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se pueden animar imagenes" }, { status: 400 });
    }

    const config = await getWeddingConfig();
    const sourceFile = await downloadDriveFile(resource.google_drive_id);
    const sourceMetadata = await getDriveFileMetadata(resource.google_drive_id);
    const parentFolderId = sourceMetadata.parents?.[0];

    if (!parentFolderId) {
      return NextResponse.json({ error: "No se pudo localizar la carpeta de origen en Drive" }, { status: 500 });
    }

    const preparedImage = await optimizeImageForLineAlive({
      buffer: sourceFile.buffer,
      contentType: resource.mime_type || sourceFile.contentType,
      fileName: resource.nombre,
    });

    const generated = await generateLineAliveAnimation({
      image: new File([new Uint8Array(preparedImage.buffer)], preparedImage.fileName, { type: preparedImage.contentType }),
      detail: detail || undefined,
    });

    const htmlBuffer = Buffer.from(generated.animation_html ?? generated.demo_html ?? "", "utf-8");
    const { folderId, effectiveSharedDriveId } = await ensureLineAliveFolder(
      parentFolderId,
      sourceMetadata.driveId || config.drive.recursosWeb.sharedDriveId,
    );
    const htmlFileName = `${getBaseFileName(resource.nombre)}_LA.html`;
    const uploaded = await uploadFileToDrive({
      folderId,
      sharedDriveId: effectiveSharedDriveId,
      filename: htmlFileName,
      mimeType: "text/html",
      buffer: htmlBuffer,
    });

    return NextResponse.json({
      ok: true,
      lineAlive: {
        enabled: true,
        sourceResourceId: resource.id,
        sourceDriveFileId: resource.google_drive_id,
        htmlDriveFileId: uploaded.id,
        htmlFileName,
        detail: generated.detail || detail || "medium",
        aspectRatio: detectLineAliveAspectRatioFromHtml(generated.animation_html ?? generated.demo_html ?? ""),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generando animacion LineAlive" },
      { status: 500 },
    );
  }
}