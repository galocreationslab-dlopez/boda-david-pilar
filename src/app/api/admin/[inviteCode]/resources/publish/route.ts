import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import { listResourcePublications, publishResource, ResourcePublicationError } from "@/lib/resource-publication-server";

export const runtime = "nodejs";
export const maxDuration = 300;

function failure(error: unknown) {
  console.error("[resources/publish]", error);
  return NextResponse.json({
    error: error instanceof Error ? error.message : "No se pudieron publicar los recursos.",
  }, { status: error instanceof ResourcePublicationError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    return NextResponse.json({
      items: await listResourcePublications(await getWeddingConfig()),
      storageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("fileId" in body) ||
    typeof body.fileId !== "string" || !/^[\w-]{1,200}$/.test(body.fileId)) {
    return NextResponse.json({ error: "Recurso invalido" }, { status: 400 });
  }
  try {
    return NextResponse.json(await publishResource(await getWeddingConfig(), body.fileId),
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
