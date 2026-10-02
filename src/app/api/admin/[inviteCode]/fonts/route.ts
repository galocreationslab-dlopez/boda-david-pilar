/**
 * app/api/admin/[inviteCode]/fonts/route.ts
 * POST: sube un archivo de fuente al bucket público "fonts" de Supabase Storage.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { FONT_FORMATS, sanitizeFontFamily } from "@/lib/theme-fonts";

const BUCKET = "fonts";
const MAX_BYTES = 5 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const formato = FONT_FORMATS[ext];
  if (!formato) {
    return NextResponse.json({ error: "Formato no admitido (usa woff2, woff, ttf u otf)" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo debe pesar entre 1 byte y 5 MB" }, { status: 400 });
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const rawNombre = typeof form.get("nombre") === "string" ? (form.get("nombre") as string) : baseName;
  const familia = sanitizeFontFamily(rawNombre) || sanitizeFontFamily(baseName);
  if (!familia) {
    return NextResponse.json({ error: "Nombre de fuente no válido" }, { status: 400 });
  }

  const slug = familia.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "fuente";
  const path = `${Date.now()}-${slug}.${ext}`;

  const supabase = createServerClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: CONTENT_TYPES[ext],
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: `No se pudo subir la fuente: ${error.message}` }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({
    font: {
      id: `fuente-${Date.now().toString(36)}`,
      nombre: familia,
      familia,
      url: data.publicUrl,
      formato,
    },
  });
}
