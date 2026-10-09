/**
 * app/api/admin/[inviteCode]/config/reset/route.ts
 * DELETE: restaura solo el estilo por defecto, con copia visual recuperable.
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { weddingConfig } from "@/config/wedding.config";
import { captureVisualSnapshot } from "@/lib/visual-versions";
import { inspectVisualResources, loadVisualContext, persistVisualApplication, VisualVersionError } from "@/lib/visual-versions-server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;
  try {
    const context = await loadVisualContext(inviteCode);
    const snapshot = captureVisualSnapshot(weddingConfig);
    const resources = await inspectVisualResources(snapshot);
    if (resources.some((resource) => resource.status === "missing")) {
      return NextResponse.json({ error: "El diseno por defecto contiene recursos ausentes; no se ha restaurado.", resources }, { status: 409 });
    }
    const result = await persistVisualApplication(context, snapshot, context.revision, "restaurar estilo por defecto");
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...result, resources });
  } catch (error) {
    console.error("visual-reset:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo restaurar." },
      { status: error instanceof VisualVersionError ? error.status : 500 });
  }
}
