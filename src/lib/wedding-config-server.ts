/**
 * lib/wedding-config-server.ts
 * Carga la configuración de la boda desde Supabase (config_json),
 * combinándola sobre los valores por defecto de wedding.config.ts.
 * Solo usar en Server Components o Route Handlers.
 */

import { createServerClient } from "@/lib/supabase/server";
import { weddingConfig, type WeddingConfig } from "@/config/wedding.config";
import { resolvePaletteRoleColors, resolvePaletteToThemeColors } from "@/lib/theme-roles";
import { unstable_noStore as noStore } from "next/cache";

type SectionRow = {
  id: string;
  clave_config: string;
  audiencia_roles: string[] | null;
};

type SectionItemRow = {
  id: string;
  seccion_id: string;
  orden: number;
  payload: Record<string, unknown> | null;
  visible: boolean;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asHistoriaItem(item: SectionItemRow): WeddingConfig["historia"][number] {
  const payload = isRecord(item.payload) ? item.payload : {};
  return {
    id: asString(payload.id, item.id),
    fecha: asString(payload.fecha),
    titulo: asString(payload.titulo),
    descripcion: asString(payload.descripcion),
    imagen: asString(payload.imagen) || undefined,
    lado: asString(payload.lado, "derecha") === "izquierda" ? "izquierda" : "derecha",
  };
}

function asTimelineItem(item: SectionItemRow): WeddingConfig["timeline"][number] {
  const payload = isRecord(item.payload) ? item.payload : {};
  return {
    id: asString(payload.id, item.id),
    hora: asString(payload.hora),
    titulo: asString(payload.titulo),
    descripcion: asString(payload.descripcion),
    icono: asString(payload.icono, "rings") as WeddingConfig["timeline"][number]["icono"],
  };
}

async function applySectionOverrides(
  supabase: ReturnType<typeof createServerClient>,
  bodaId: string,
  config: WeddingConfig,
): Promise<WeddingConfig> {
  const { data: sectionRows, error: sectionError } = await supabase
    .from("bodas_secciones")
    .select("id, clave_config, audiencia_roles")
    .eq("boda_id", bodaId)
    .eq("visible", true)
    .order("orden", { ascending: true });

  if (sectionError || !sectionRows || sectionRows.length === 0) {
    return config;
  }

  const publicSections = (sectionRows as SectionRow[]).filter((row) => {
    const roles = row.audiencia_roles ?? [];
    return roles.includes("*") || roles.includes("public");
  });

  if (publicSections.length === 0) return config;

  const sectionIds = publicSections.map((row) => row.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("secciones_items")
    .select("id, seccion_id, orden, payload, visible")
    .in("seccion_id", sectionIds)
    .eq("visible", true)
    .order("orden", { ascending: true });

  if (itemsError || !itemRows) {
    return config;
  }

  const itemsBySection = new Map<string, SectionItemRow[]>();
  for (const item of itemRows as SectionItemRow[]) {
    const current = itemsBySection.get(item.seccion_id) ?? [];
    current.push(item);
    itemsBySection.set(item.seccion_id, current);
  }

  const historiaItems: WeddingConfig["historia"] = [];
  const timelineItems: WeddingConfig["timeline"] = [];

  for (const section of publicSections) {
    const rows = itemsBySection.get(section.id) ?? [];
    if (section.clave_config === "historia") {
      historiaItems.push(...rows.map(asHistoriaItem));
    }
    if (section.clave_config === "timeline") {
      timelineItems.push(...rows.map(asTimelineItem));
    }
  }

  return {
    ...config,
    historia: historiaItems.length > 0 ? historiaItems : config.historia,
    timeline: timelineItems.length > 0 ? timelineItems : config.timeline,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Merge profundo: arrays se reemplazan por completo, objetos se fusionan. */
function deepMerge(
  target: Record<string, unknown>,
  source: unknown,
): Record<string, unknown> {
  if (!isRecord(source)) return target;

  const result = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val === null || val === undefined) continue;
    if (Array.isArray(val)) {
      result[key] = val;
    } else if (isRecord(val)) {
      const current = isRecord(target[key]) ? target[key] : {};
      result[key] = deepMerge(current, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export async function getWeddingConfig(): Promise<WeddingConfig> {
  // Evita servir una version cacheada cuando el admin cambia tema, fuentes o contenido.
  noStore();

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("bodas")
      .select("id, config_json")
      .eq("slug", weddingConfig.slug)
      .maybeSingle();

    const override = data?.config_json;
    const merged = isRecord(override) && Object.keys(override).length > 0
      ? (deepMerge(weddingConfig as unknown as Record<string, unknown>, override) as WeddingConfig)
      : weddingConfig;

    const bodaId = asString(data?.id);
    if (!bodaId) return merged;

    try {
      return await applySectionOverrides(supabase, bodaId, merged);
    } catch {
      // Si las tablas nuevas no existen todavía, mantenemos el comportamiento actual.
      return merged;
    }
  } catch {
    return weddingConfig;
  }
}

/** CSS variables a inyectar en :root a partir de tema.colores y tema.fuentes */
export function buildCssOverrides(config: WeddingConfig): string {
  const activePalette = config.tema.paletas?.find((p) => p.id === config.tema.paletaActivaId);
  const c = activePalette ? resolvePaletteToThemeColors(activePalette) : config.tema.colores;
  const roles = activePalette ? resolvePaletteRoleColors(activePalette) : null;
  const extraColors = activePalette?.coloresExtra ?? [];
  const f = config.tema.fuentes;
  const lines: string[] = [":root {"];
  if (roles) {
    lines.push(`  --role-fondo-principal: ${roles.fondoPrincipal};`);
    lines.push(`  --role-fondo-alterno: ${roles.fondoAlterno};`);
    lines.push(`  --role-texto-principal: ${roles.textoPrincipal};`);
    lines.push(`  --role-texto-secundario: ${roles.textoSecundario};`);
    lines.push(`  --role-titulos: ${roles.titulos};`);
    lines.push(`  --role-boton-fondo: ${roles.botonFondo};`);
    lines.push(`  --role-boton-texto: ${roles.botonTexto};`);
    lines.push(`  --role-bordes-divisores: ${roles.bordesDivisores};`);
    lines.push(`  --role-highlight-acento: ${roles.highlightAcento};`);
    lines.push(`  --bronze-pale: ${roles.bordesDivisores};`);
    lines.push(`  --cream-dark: ${roles.fondoAlterno};`);
    lines.push(`  --brown-mid: ${roles.textoSecundario};`);
  }
  if (c.bronze)       lines.push(`  --bronze: ${c.bronze};`);
  if (c.bronzeLight)  lines.push(`  --bronze-light: ${c.bronzeLight};`);
  if (c.olive)        lines.push(`  --olive: ${c.olive};`);
  if (c.oliveMuted)   lines.push(`  --olive-muted: ${c.oliveMuted};`);
  if (c.cream)        lines.push(`  --cream: ${c.cream};`);
  if (c.brownDark)    lines.push(`  --brown-dark: ${c.brownDark};`);
  if (c.white)        lines.push(`  --white: ${c.white};`);
  for (const color of extraColors) {
    const slug = color.nombre
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) continue;
    lines.push(`  --custom-${slug}: ${color.valor};`);
  }
  if (f.display)      lines.push(`  --font-display: ${f.display};`);
  if (f.body)         lines.push(`  --font-body: ${f.body};`);
  lines.push("}");
  return lines.join("\n");
}
