/**
 * lib/wedding-config-server.ts
 * Carga la configuración de la boda desde Supabase (config_json),
 * combinándola sobre los valores por defecto de wedding.config.ts.
 * Solo usar en Server Components o Route Handlers.
 */

import { createServerClient } from "@/lib/supabase/server";
import { weddingConfig, type WeddingConfig } from "@/config/wedding.config";

/** Merge profundo: arrays se reemplazan por completo, objetos se fusionan. */
function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== "object") return target;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val === null || val === undefined) continue;
    if (Array.isArray(val)) {
      result[key] = val;
    } else if (typeof val === "object" && !Array.isArray(val)) {
      result[key] = deepMerge(target[key] ?? {}, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export async function getWeddingConfig(): Promise<WeddingConfig> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("bodas")
      .select("config_json")
      .eq("slug", weddingConfig.slug)
      .maybeSingle();

    const override = data?.config_json;
    if (!override || Object.keys(override).length === 0) return weddingConfig;
    return deepMerge(weddingConfig, override) as WeddingConfig;
  } catch {
    return weddingConfig;
  }
}

/** CSS variables a inyectar en :root a partir de tema.colores y tema.fuentes */
export function buildCssOverrides(config: WeddingConfig): string {
  const c = config.tema.colores;
  const f = config.tema.fuentes;
  const lines: string[] = [":root {"];
  if (c.bronze)       lines.push(`  --bronze: ${c.bronze};`);
  if (c.bronzeLight)  lines.push(`  --bronze-light: ${c.bronzeLight};`);
  if (c.olive)        lines.push(`  --olive: ${c.olive};`);
  if (c.oliveMuted)   lines.push(`  --olive-muted: ${c.oliveMuted};`);
  if (c.cream)        lines.push(`  --cream: ${c.cream};`);
  if (c.brownDark)    lines.push(`  --brown-dark: ${c.brownDark};`);
  if (c.white)        lines.push(`  --white: ${c.white};`);
  if (f.display)      lines.push(`  --font-display: ${f.display};`);
  if (f.body)         lines.push(`  --font-body: ${f.body};`);
  lines.push("}");
  return lines.join("\n");
}
