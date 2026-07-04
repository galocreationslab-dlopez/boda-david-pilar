import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import { deleteFileFromDrive, driveFilePublicUrl, uploadFileToDrive } from "@/lib/google-drive";

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
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
    .select("id, wedding_id, invitation_id, folder_tipo, nombre, tipo, google_drive_id, url_publica, subido_por, mime_type, file_size, featured, visible_public, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const config = await getWeddingConfig();
  const folderId = config.drive.recursosWeb.folderId.trim();
  if (!folderId) {
    return NextResponse.json({ error: "Configura primero la carpeta de recursos web" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  if (!isImageMimeType(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imágenes en recursos web" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: boda } = await supabase
    .from("bodas")
    .select("id")
    .eq("slug", config.slug)
    .maybeSingle();

  if (!boda?.id) {
    return NextResponse.json({ error: "No se encontró la boda" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFileToDrive({
    folderId,
    sharedDriveId: config.drive.recursosWeb.sharedDriveId,
    filename: file.name,
    mimeType: file.type || "image/*",
    buffer,
  });

  const { data: media, error } = await supabase
    .from("multimedia")
    .insert({
      wedding_id: boda.id,
      folder_tipo: "recursos_web",
      nombre: file.name,
      tipo: inferMediaType(file.type),
      google_drive_id: uploaded.id,
      url_publica: driveFilePublicUrl(uploaded.id),
      subido_por: "admin",
      mime_type: file.type,
      file_size: file.size,
      featured: true,
      visible_public: true,
    })
    .select("id, nombre, google_drive_id, url_publica, created_at")
    .single();

  if (error) {
    await deleteFileFromDrive(uploaded.id).catch(() => undefined);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true, media });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body: unknown = await request.json();
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const mediaId = typeof (body as Record<string, unknown>).mediaId === "string" ? (body as Record<string, unknown>).mediaId : "";
  if (!mediaId) {
    return NextResponse.json({ error: "Falta mediaId" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof (body as Record<string, unknown>).featured === "boolean") patch.featured = (body as Record<string, unknown>).featured;
  if (typeof (body as Record<string, unknown>).visible_public === "boolean") patch.visible_public = (body as Record<string, unknown>).visible_public;

  const supabase = createServerClient();
  const { error } = await supabase.from("multimedia").update(patch).eq("id", mediaId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { mediaId } = (await request.json()) as { mediaId?: string };
  if (!mediaId) {
    return NextResponse.json({ error: "Falta mediaId" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: media, error } = await supabase
    .from("multimedia")
    .select("id, google_drive_id")
    .eq("id", mediaId)
    .maybeSingle();

  if (error || !media) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  await deleteFileFromDrive(media.google_drive_id).catch(() => undefined);

  const { error: deleteError } = await supabase.from("multimedia").delete().eq("id", mediaId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true });
}