/**
 * app/api/admin/[inviteCode]/config/route.ts
 * GET: devuelve la configuración actual (merged default + BD).
 * POST: guarda el patch de configuración en bodas.config_json.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import { weddingConfig } from "@/config/wedding.config";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const config = await getWeddingConfig();
  return NextResponse.json({ config });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const supabase = createServerClient();

  // Obtener config_json existente
  const { data: boda } = await supabase
    .from("bodas")
    .select("id, config_json")
    .eq("slug", weddingConfig.slug)
    .maybeSingle();

  if (!boda) {
    return NextResponse.json({ error: "Boda no encontrada" }, { status: 404 });
  }

  const existing = boda.config_json ?? {};
  // Merge patch sobre existing (reemplazamos arrays, fusionamos objetos)
  function deepMerge(target: any, source: any): any {
    if (!source || typeof source !== "object") return target;
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const val = source[key];
      if (val === null || val === undefined) continue;
      if (Array.isArray(val)) {
        result[key] = val;
      } else if (typeof val === "object") {
        result[key] = deepMerge(target[key] ?? {}, val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  const newConfigJson = deepMerge(existing, body);

  const { error } = await supabase
    .from("bodas")
    .update({ config_json: newConfigJson })
    .eq("id", boda.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
