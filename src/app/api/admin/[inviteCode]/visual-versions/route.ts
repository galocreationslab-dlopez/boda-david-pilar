import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { applyVisualSnapshot, assertVisualSnapshot, captureVisualSnapshot, compareVisualSnapshots, isRecord } from "@/lib/visual-versions";
import { inspectVisualResources, loadVisualContext, loadVisualVersion, persistVisualApplication, VisualVersionError } from "@/lib/visual-versions-server";

type RouteContext = { params: Promise<{ inviteCode: string }> };
function failure(error: unknown) {
  console.error("visual-versions:", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : "Error de versiones visuales." },
    { status: error instanceof VisualVersionError ? error.status : 500 });
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { inviteCode } = await params;
    const context = await loadVisualContext(inviteCode);
    const id = new URL(req.url).searchParams.get("id");
    if (id) {
      const version = await loadVisualVersion(context, id);
      const applied = applyVisualSnapshot(context.config, version.snapshot);
      return NextResponse.json({
        version, revision: context.revision, warnings: applied.warnings,
        changes: compareVisualSnapshots(captureVisualSnapshot(context.config), captureVisualSnapshot(applied.config)),
        resources: await inspectVisualResources(version.snapshot),
      }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const { data, error } = await context.supabase.from("visual_versions")
      .select("id, name, created_at, kind, schema_version").eq("wedding_id", context.bodaId).order("created_at", { ascending: false });
    if (error) throw new VisualVersionError("No se pueden cargar versiones. Aplica la migracion 20261009_visual_versions.sql. " + error.message, 503);
    return NextResponse.json({ versions: data, revision: context.revision }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { inviteCode } = await params;
    const context = await loadVisualContext(inviteCode);
    let body: unknown;
    try { body = await req.json(); }
    catch { throw new VisualVersionError("JSON invalido.", 400); }
    if (!isRecord(body)) throw new VisualVersionError("Solicitud invalida.", 400);
    if (body.action === "save") {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120) throw new VisualVersionError("Nombre obligatorio (1-120 caracteres).", 400);
      const snapshot = body.snapshot ?? captureVisualSnapshot(context.config);
      try { assertVisualSnapshot(snapshot); }
      catch (error) { throw new VisualVersionError(error instanceof Error ? error.message : "Version invalida.", 400); }
      const { data, error } = await context.supabase.from("visual_versions").insert({
        wedding_id: context.bodaId, name: body.name.trim(), kind: "named", schema_version: 1, snapshot,
      }).select("id, name, created_at, kind, schema_version").single();
      if (error) throw new VisualVersionError("No se guardo la version: " + error.message, 503);
      return NextResponse.json({ version: data }, { status: 201 });
    }
    if (body.action !== "apply" || typeof body.id !== "string" || typeof body.expectedRevision !== "string") throw new VisualVersionError("Accion invalida. Guardar y aplicar son operaciones distintas.", 400);
    const version = await loadVisualVersion(context, body.id);
    const resources = await inspectVisualResources(version.snapshot);
    if (resources.length && body.acknowledgeResources !== true) return NextResponse.json({ error: "Confirma los recursos ausentes o no verificables antes de aplicar.", resources }, { status: 409 });
    const result = await persistVisualApplication(context, version.snapshot, body.expectedRevision, version.name);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...result, resources });
  } catch (error) { return failure(error); }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { inviteCode } = await params;
    const context = await loadVisualContext(inviteCode);
    let body: unknown;
    try { body = await req.json(); }
    catch { throw new VisualVersionError("JSON invalido.", 400); }
    if (!isRecord(body) || typeof body.id !== "string") throw new VisualVersionError("Selecciona una version para eliminar.", 400);
    await loadVisualVersion(context, body.id);
    const { data, error } = await context.supabase.from("visual_versions")
      .delete().eq("wedding_id", context.bodaId).eq("id", body.id).select("id").maybeSingle();
    if (error) throw new VisualVersionError("No se pudo eliminar la version: " + error.message, 503);
    if (!data) throw new VisualVersionError("La version ya no existe o no pertenece a esta boda.", 404);
    return NextResponse.json({ ok: true, id: body.id });
  } catch (error) { return failure(error); }
}
