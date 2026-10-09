import "server-only";
import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@/lib/supabase/server";
import { getDriveFileMetadata } from "@/lib/google-drive";
import { weddingConfig } from "@/config/wedding.config";
import { resolveWeddingConfig } from "@/lib/wedding-config-server";
import { applyVisualSnapshot, assertVisualSnapshot, captureVisualSnapshot, collectVisualResources, isRecord, mergeVisualIntoStoredConfig, type ResourceIssue, type VisualSnapshot } from "@/lib/visual-versions";

export class VisualVersionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function loadVisualContext(inviteCode: string) {
  const supabase = createServerClient();
  const { data: admin, error: authError } = await supabase.from("invitaciones")
    .select("wedding_id").eq("invite_code", inviteCode).eq("tipo_invitacion", "admin").maybeSingle();
  if (authError) throw new VisualVersionError("No se pudo verificar la autorizacion administrativa.", 503);
  if (!admin) throw new VisualVersionError("No autorizado", 403);
  const { data: boda, error } = await supabase.from("bodas").select("id, config_json")
    .eq("id", admin.wedding_id).eq("slug", weddingConfig.slug).maybeSingle();
  if (error) throw new VisualVersionError("No se pudo cargar la configuracion: " + error.message, 503);
  if (!boda) throw new VisualVersionError("Boda no encontrada", 404);
  const raw: unknown = boda.config_json;
  const revision = createHash("sha256").update(JSON.stringify(raw)).digest("hex");
  return { supabase, bodaId: String(boda.id), raw, revision, config: resolveWeddingConfig(raw) };
}
export type VisualContext = Awaited<ReturnType<typeof loadVisualContext>>;

export async function loadVisualVersion(context: VisualContext, id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new VisualVersionError("Identificador invalido.", 400);
  const { data, error } = await context.supabase.from("visual_versions").select("*")
    .eq("wedding_id", context.bodaId).eq("id", id).maybeSingle();
  if (error) throw new VisualVersionError("No se pudo cargar la version. Aplica la migracion de versiones visuales. " + error.message, 503);
  if (!data) throw new VisualVersionError("Version no encontrada.", 404);
  assertVisualSnapshot(data.snapshot);
  return { ...data, snapshot: data.snapshot };
}

export async function inspectVisualResources(snapshot: VisualSnapshot): Promise<ResourceIssue[]> {
  const references = collectVisualResources(snapshot);
  const issues: ResourceIssue[] = [];
  // Only known local/Drive references are resolved server-side; arbitrary URLs never trigger SSRF.
  for (const reference of references) {
    if (reference.startsWith("data:") || reference.trim().startsWith("<")) {
      issues.push({ reference, status: "unverified", detail: "Recurso embebido no comprobable." });
      continue;
    }
    let url: URL | undefined;
    try { url = new URL(reference, "https://visual.local"); }
    catch {
      issues.push({ reference, status: "missing", detail: "Referencia invalida." });
      continue;
    }
    const driveHosts = ["drive.google.com", "drive.usercontent.google.com", "lh3.googleusercontent.com"];
    const driveId = driveHosts.includes(url.hostname)
      ? (url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get("id"))
      : (url.hostname === "visual.local" && url.pathname === "/api/media/drive" ? url.searchParams.get("id") : null);
    if (driveId) {
      try { await getDriveFileMetadata(driveId); }
      catch (error) {
        const message = error instanceof Error ? error.message : "Error de Drive";
        issues.push({ reference, status: /\b404\b/.test(message) ? "missing" : "unverified",
          detail: /\b404\b/.test(message) ? "Archivo ausente o inaccesible en Drive." : "No se pudo verificar el acceso a Drive." });
      }
    } else if (url.hostname === "visual.local") {
      let local: string;
      try { local = decodeURIComponent(url.pathname); }
      catch { issues.push({ reference, status: "missing", detail: "Ruta invalida." }); continue; }
      const root = path.resolve(process.cwd(), "public");
      const candidate = path.resolve(root, "." + local.replaceAll("/", path.sep));
      if (!candidate.startsWith(root + path.sep)) {
        issues.push({ reference, status: "missing", detail: "Ruta fuera de public." });
        continue;
      }
      try { await access(candidate); }
      catch (error) {
        const code = isRecord(error) ? error.code : undefined;
        issues.push({ reference, status: code === "ENOENT" ? "missing" : "unverified", detail: "Recurso local ausente o inaccesible." });
      }
    } else {
      issues.push({ reference, status: "unverified", detail: "URL externa: comprobar en la previsualizacion (no se consulta desde el servidor)." });
    }
  }
  return issues;
}

export async function persistVisualApplication(context: VisualContext, snapshot: VisualSnapshot, expectedRevision: string, label: string) {
  if (context.revision !== expectedRevision) throw new VisualVersionError("La configuracion ha cambiado. Previsualiza de nuevo.", 409);
  const backup = captureVisualSnapshot(context.config);
  const applied = applyVisualSnapshot(context.config, snapshot);
  const next = mergeVisualIntoStoredConfig(context.raw, applied.config);
  const { data, error } = await context.supabase.rpc("apply_visual_version", {
    p_wedding_id: context.bodaId, p_expected_config: context.raw,
    p_next_config: next, p_backup: backup, p_name: `Antes de ${label}`.slice(0, 120),
  });
  if (error) throw new VisualVersionError("No se aplico la version: " + error.message, error.code === "40001" ? 409 : 503);
  if (typeof data !== "string") throw new VisualVersionError("No se recibio el identificador de la copia recuperable.", 503);
  return { backupId: data, warnings: applied.warnings };
}
