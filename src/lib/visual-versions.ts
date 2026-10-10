import type {
  WeddingConfig, SeccionDiseno, PortadaLibreConfig, PortadaElementoLayout,
  PortadaDispositivoConfig, IntroEnvelopeConfig, NavegacionDiseno,
  TimelineDispositivoConfig, TimelineZona, TimelinePlantillaConfig,
} from "@/config/wedding.config";
import { getComponentSizeKind } from "@/lib/component-size";
import { normalizeTimelinePlantilla } from "@/lib/timeline-layout";

export const VISUAL_SCHEMA = "wedding-visual" as const;
export const VISUAL_SCHEMA_VERSION = 1 as const;
const designKeys = ["fondoPaginaColor", "fondoPaginaImagen", "fondoPaginaTexturaTamanoPx", "tratamientosImagenes"] as const;
const sectionKeys = ["paletaId", "usarPaletaGlobal", "componentRoles", "componentBorders", "componentFonts", "fondos", "selloUrl"] as const;
const layoutKeys = ["opacidad", "colorModo", "colorRol", "colorHex", "fuenteRol", "tamano", "negrita", "cursiva"] as const;
const canvasKeys = ["fondoModo", "fondoRol", "fondoHex"] as const;
const timelineKeys = ["marcoVisible", "fondoRol", "bordeRol"] as const;
const timelineZoneKeys = ["colorRol", "fuenteRol"] as const;
const separatorKeys = ["imagenUrl", "tintMode", "imagenColorRole"] as const;
const navigationKeys = ["logoUrl", "logoColor", "textoColor", "textoTamanoPx", "fondoColor"] as const satisfies readonly (keyof NavegacionDiseno)[];
const envelopeKeys = [
  "acabadoPaleta", "modoFondo", "imagenUrl", "selloSecoUrl", "selloSecoMezclaImagen",
  "selloSecoRelieveSvg", "colorBase", "colorTrasera", "colorBorde", "colorSolapaInterior",
  "colorCostura", "sombraColor", "colorSombraApertura", "intensidadSombraAperturaPorcentaje",
  "colorGrosorPapel", "intensidadGrosorPapelPorcentaje", "fondoExteriorColor", "fondoExteriorImagenUrl",
] as const satisfies readonly (keyof IntroEnvelopeConfig)[];

type Design = NonNullable<WeddingConfig["diseno"]>;
type LayoutStyle = Partial<Pick<PortadaElementoLayout, typeof layoutKeys[number]>>;
type CanvasStyle = Partial<Pick<PortadaDispositivoConfig, typeof canvasKeys[number]>> & {
  layout: Record<string, LayoutStyle>;
};
type FreeStyle = { pc: CanvasStyle; movil: CanvasStyle };
type TimelineStyle = Record<"pc" | "movil", Partial<Pick<TimelineDispositivoConfig, typeof timelineKeys[number]>> & {
  zonas: Record<string, Partial<Pick<TimelineZona, "colorRol" | "fuenteRol" | "tamano">>>;
}>;
type SectionStyle = Partial<Pick<SeccionDiseno, typeof sectionKeys[number]>> & {
  componentSizes: Record<string, number>;
  separadorInterno?: Partial<Pick<NonNullable<SeccionDiseno["separadorInterno"]>, typeof separatorKeys[number]>>;
  portadaLibre?: FreeStyle;
  pie?: FreeStyle;
  timelinePlantilla?: TimelineStyle;
  intro?: {
    lacreUrl?: string;
    pc?: Partial<Pick<IntroEnvelopeConfig, typeof envelopeKeys[number]>>;
    movil?: Partial<Pick<IntroEnvelopeConfig, typeof envelopeKeys[number]>>;
  };
};
export type VisualSnapshot = {
  schema: typeof VISUAL_SCHEMA;
  schemaVersion: typeof VISUAL_SCHEMA_VERSION;
  rolesModel: "legacy-v1";
  theme: WeddingConfig["tema"];
  design: Partial<Pick<Design, typeof designKeys[number]>> & {
    separador?: Partial<Pick<NonNullable<Design["separador"]>, typeof separatorKeys[number]>>;
    navegacion?: Partial<Pick<NavegacionDiseno, typeof navigationKeys[number]>>;
  };
  sections: { id: string; type: SeccionDiseno["tipo"]; style: SectionStyle }[];
};
export type VisualVersionSummary = {
  id: string; name: string; created_at: string; kind: "named" | "backup";
  schema_version: number;
};
export type ResourceIssue = { reference: string; status: "missing" | "unverified"; detail: string };
export class VisualSnapshotError extends Error {}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pick<T extends object, K extends keyof T>(value: T | undefined, keys: readonly K[]): Partial<Pick<T, K>> {
  return Object.fromEntries(keys.filter((key) => value?.[key] !== undefined).map((key) => [key, value![key]])) as Partial<Pick<T, K>>;
}

function freeStyle(config: PortadaLibreConfig): FreeStyle {
  const device = (name: "pc" | "movil"): CanvasStyle => ({
    ...pick(config[name], canvasKeys),
    layout: Object.fromEntries(config.elementos.map((element) => [element.id, pick(config[name].layout[element.id], layoutKeys)])),
  });
  return { pc: device("pc"), movil: device("movil") };
}

function timelineStyle(config: TimelinePlantillaConfig): TimelineStyle {
  const normalized = normalizeTimelinePlantilla(config);
  const device = (name: "pc" | "movil") => ({
    ...pick(normalized[name], timelineKeys),
    zonas: Object.fromEntries(Object.entries(normalized[name].zonas).map(([key, zone]) => [
      key, { ...pick(zone, timelineZoneKeys), ...(key !== "logo" ? { tamano: zone.tamano } : {}) },
    ])),
  });
  return { pc: device("pc"), movil: device("movil") };
}

export function captureVisualSnapshot(config: WeddingConfig): VisualSnapshot {
  const snapshot: VisualSnapshot = {
    schema: VISUAL_SCHEMA, schemaVersion: VISUAL_SCHEMA_VERSION, rolesModel: "legacy-v1",
    theme: config.tema,
    design: {
      ...pick(config.diseno, designKeys),
      ...(config.diseno?.separador ? { separador: pick(config.diseno.separador, separatorKeys) } : {}),
      ...(config.diseno?.navegacion ? { navegacion: pick(config.diseno.navegacion, navigationKeys) } : {}),
    },
    sections: (config.diseno?.secciones ?? []).map((section) => ({
      id: section.id, type: section.tipo,
      style: {
        ...pick(section, sectionKeys),
        componentSizes: Object.fromEntries(Object.entries(section.componentSizes ?? {})
          .filter(([key, value]) => getComponentSizeKind(key) === "font" && value !== undefined)) as Record<string, number>,
        ...(section.separadorInterno ? { separadorInterno: pick(section.separadorInterno, separatorKeys) } : {}),
        ...(section.portadaLibre ? { portadaLibre: freeStyle(section.portadaLibre) } : {}),
        ...(section.pie ? { pie: freeStyle(section.pie) } : {}),
        ...(section.timelinePlantilla ? { timelinePlantilla: timelineStyle(section.timelinePlantilla) } : {}),
        ...(section.intro ? { intro: {
          ...(section.intro.lacreUrl !== undefined ? { lacreUrl: section.intro.lacreUrl } : {}),
          ...(section.intro.pc?.envelope ? { pc: pick(section.intro.pc.envelope, envelopeKeys) } : {}),
          ...(section.intro.movil?.envelope ? { movil: pick(section.intro.movil.envelope, envelopeKeys) } : {}),
        } } : {}),
      },
    })),
  };
  // JSON cloning makes each version independent of subsequent editor mutations.
  return JSON.parse(JSON.stringify(snapshot));
}

function replaceKeys<T extends object, K extends keyof T>(current: T, saved: Partial<Pick<T, K>>, keys: readonly K[]): T {
  const next = { ...current };
  for (const key of keys) {
    delete next[key];
    if (saved[key] !== undefined) Object.assign(next, { [key]: saved[key] });
  }
  return next;
}

function restoreFree(current: PortadaLibreConfig, saved: FreeStyle, warnings: string[], label: string): PortadaLibreConfig {
  const next = structuredClone(current);
  for (const device of ["pc", "movil"] as const) {
    next[device] = replaceKeys(next[device], saved[device], canvasKeys);
    for (const [id, style] of Object.entries(saved[device].layout)) {
      if (!current.elementos.some((element) => element.id === id) || !next[device].layout[id]) {
        warnings.push(`${label}/${device}/${id}: componente ausente; no se recrea.`);
        continue;
      }
      next[device].layout[id] = replaceKeys(next[device].layout[id], style, layoutKeys);
    }
  }
  return next;
}

export function applyVisualSnapshot(current: WeddingConfig, snapshot: VisualSnapshot): { config: WeddingConfig; warnings: string[] } {
  assertVisualSnapshot(snapshot);
  snapshot = structuredClone(snapshot);
  const next = structuredClone(current);
  const warnings: string[] = [];
  const palettes = snapshot.theme.paletas ?? [];
  if (snapshot.theme.paletaActivaId && !palettes.some((p) => p.id === snapshot.theme.paletaActivaId)) {
    warnings.push("Paleta activa ausente; el renderizador usara su respaldo habitual.");
  }
  for (const [role, fontId] of Object.entries(snapshot.theme.fuentes.roles ?? {})) {
    if (!snapshot.theme.fuentes.biblioteca?.some((font) => font.id === fontId)) warnings.push(`Fuente del rol ${role} ausente de la biblioteca; se conserva la referencia.`);
  }
  next.tema = structuredClone(snapshot.theme);
  next.diseno = replaceKeys(next.diseno ?? {}, snapshot.design, designKeys);
  if (next.diseno.separador) next.diseno.separador = replaceKeys(next.diseno.separador, snapshot.design.separador ?? {}, separatorKeys);
  if (next.diseno.navegacion) next.diseno.navegacion = replaceKeys(next.diseno.navegacion, snapshot.design.navegacion ?? {}, navigationKeys);
  for (const saved of snapshot.sections) {
    const section = next.diseno.secciones?.find((item) => item.id === saved.id);
    if (!section || section.tipo !== saved.type) {
      warnings.push(`${saved.id}: seccion ausente o de otro tipo; no se recrea.`);
      continue;
    }
    if (saved.style.usarPaletaGlobal === false && !palettes.some((p) => p.id === saved.style.paletaId)) {
      warnings.push(`${saved.id}: paleta asignada ausente; se conserva la referencia y se usa el respaldo habitual.`);
    }
    for (const key of sectionKeys) delete section[key];
    Object.assign(section, pick(saved.style, sectionKeys));
    const geometrySizes = Object.fromEntries(Object.entries(section.componentSizes ?? {}).filter(([key]) => getComponentSizeKind(key) !== "font"));
    section.componentSizes = { ...geometrySizes, ...saved.style.componentSizes };
    if (section.separadorInterno) section.separadorInterno = replaceKeys(section.separadorInterno, saved.style.separadorInterno ?? {}, separatorKeys);
    for (const key of ["portadaLibre", "pie"] as const) {
      if (saved.style[key] && section[key]) section[key] = restoreFree(section[key], saved.style[key], warnings, `${saved.id}/${key}`);
      else if (saved.style[key]) warnings.push(`${saved.id}/${key}: lienzo ausente; no se recrea.`);
    }
    if (section.timelinePlantilla && saved.style.timelinePlantilla) {
      section.timelinePlantilla = normalizeTimelinePlantilla(section.timelinePlantilla);
    }
    for (const device of ["pc", "movil"] as const) {
      const template = section.timelinePlantilla?.[device];
      const templateStyle = saved.style.timelinePlantilla?.[device];
      if (template && templateStyle) {
        Object.assign(template, pick(templateStyle, timelineKeys));
        for (const key of ["logo", "hora", "titulo", "descripcion"] as const) {
          const zoneStyle = templateStyle.zonas[key];
          if (zoneStyle) Object.assign(template.zonas[key], pick(zoneStyle, key === "logo" ? timelineZoneKeys : [...timelineZoneKeys, "tamano"]));
        }
      } else if (templateStyle) warnings.push(`${saved.id}/timeline/${device}: plantilla ausente; no se recrea.`);
      const envelope = section.intro?.[device]?.envelope;
      if (envelope) section.intro![device]!.envelope = replaceKeys(envelope, saved.style.intro?.[device] ?? {}, envelopeKeys);
      else if (saved.style.intro?.[device]) warnings.push(`${saved.id}/intro/${device}: sobre ausente; no se recrea.`);
    }
    if (saved.style.intro && section.intro) {
      if (saved.style.intro.lacreUrl === undefined) delete section.intro.lacreUrl;
      else section.intro.lacreUrl = saved.style.intro.lacreUrl;
    }
  }
  return { config: next, warnings: [...new Set(warnings)] };
}

const stringMap = (v: unknown) => isRecord(v) && Object.values(v).every((item) => typeof item === "string");
function validateTheme(value: unknown): boolean {
  if (!allowedFields(value, ["colores", "fuentes", "paletas", "paletaActivaId"]) || !isRecord(value) ||
    !validColors(value.colores) || !allowedFields(value.fuentes, ["display", "body", "roles", "biblioteca"]) || !isRecord(value.fuentes)) return false;
  if (typeof value.fuentes.display !== "string" || typeof value.fuentes.body !== "string") return false;
  if (value.fuentes.roles !== undefined && (!allowedFields(value.fuentes.roles, ["nombres", "titulos", "textos"]) || !stringMap(value.fuentes.roles))) return false;
  if (value.fuentes.biblioteca !== undefined && (!Array.isArray(value.fuentes.biblioteca) || !value.fuentes.biblioteca.every((font) =>
    allowedFields(font, ["id", "nombre", "familia", "url", "formato"]) && isRecord(font) && ["id", "nombre", "familia", "url", "formato"].every((key) => typeof font[key] === "string") &&
    ["woff2", "woff", "truetype", "opentype"].includes(String(font.formato))))) return false;
  if (value.paletaActivaId !== undefined && typeof value.paletaActivaId !== "string") return false;
  return value.paletas === undefined || (Array.isArray(value.paletas) && value.paletas.every((palette) => {
    if (!allowedFields(palette, ["id", "nombre", "colores", "rolesColor", "roleLabels", "etiquetasColores", "coloresExtra"]) ||
      !isRecord(palette) || typeof palette.id !== "string" || typeof palette.nombre !== "string" || !validColors(palette.colores)) return false;
    if (!["rolesColor", "roleLabels", "etiquetasColores"].every((key) => palette[key] === undefined || stringMap(palette[key]))) return false;
    return palette.coloresExtra === undefined || (Array.isArray(palette.coloresExtra) && palette.coloresExtra.every((color) => {
      if (!allowedFields(color, ["id", "nombre", "valor", "texturaUrl", "texturaTamanoPx", "texturaBaseTransparente"]) ||
        !isRecord(color) || !["id", "nombre", "valor"].every((key) => typeof color[key] === "string")) return false;
      return (color.texturaUrl === undefined || typeof color.texturaUrl === "string") &&
        (color.texturaTamanoPx === undefined || (typeof color.texturaTamanoPx === "number" && Number.isFinite(color.texturaTamanoPx) && color.texturaTamanoPx >= 0)) &&
        (color.texturaBaseTransparente === undefined || typeof color.texturaBaseTransparente === "boolean");
    }));
  }));
}

function validColors(value: unknown): boolean {
  const keys = ["bronze", "bronzeLight", "olive", "oliveMuted", "cream", "brownDark", "white"];
  return allowedFields(value, keys) && isRecord(value) && keys.every((key) => typeof value[key] === "string");
}
function allowedFields(value: unknown, keys: readonly string[]): boolean {
  return isRecord(value) && Object.keys(value).every((key) => keys.includes(key));
}
function typedScalars(value: unknown, strings: readonly string[], numbers: readonly string[] = [], booleans: readonly string[] = []): boolean {
  return allowedFields(value, [...strings, ...numbers, ...booleans]) && isRecord(value) &&
    Object.entries(value).every(([key, v]) => strings.includes(key) ? typeof v === "string"
      : numbers.includes(key) ? typeof v === "number" && Number.isFinite(v)
        : booleans.includes(key) && typeof v === "boolean");
}
const validSeparator = (v: unknown) => typedScalars(v, separatorKeys);
const validEnvelope = (v: unknown) => typedScalars(v,
  envelopeKeys.filter((key) => !["selloSecoRelieveSvg", "intensidadSombraAperturaPorcentaje", "intensidadGrosorPapelPorcentaje"].includes(key)),
  ["intensidadSombraAperturaPorcentaje", "intensidadGrosorPapelPorcentaje"], ["selloSecoRelieveSvg"]);
function validLayout(value: unknown): boolean {
  return typedScalars(value, ["colorModo", "colorRol", "colorHex", "fuenteRol"], ["opacidad", "tamano"], ["negrita", "cursiva"]) &&
    isRecord(value) && (value.colorModo === undefined || ["original", "paleta", "personalizado"].includes(String(value.colorModo))) &&
    (value.fuenteRol === undefined || ["nombres", "titulos", "textos"].includes(String(value.fuenteRol)));
}
function validFree(value: unknown): boolean {
  return allowedFields(value, ["pc", "movil"]) && ["pc", "movil"].every((device) => {
    const canvas = (value as Record<string, unknown>)[device];
    return allowedFields(canvas, [...canvasKeys, "layout"]) && isRecord(canvas) && isRecord(canvas.layout) &&
      typedScalars(pick(canvas, canvasKeys), canvasKeys) &&
      Object.values(canvas.layout).every(validLayout);
  });
}

function validTimelineStyle(value: unknown): boolean {
  if (!allowedFields(value, ["pc", "movil"]) || !isRecord(value)) return false;
  return ["pc", "movil"].every((device) => {
    const config = value[device];
    if (!allowedFields(config, [...timelineKeys, "zonas"]) || !isRecord(config) ||
      !typedScalars(pick(config, timelineKeys), ["fondoRol", "bordeRol"], [], ["marcoVisible"]) ||
      !allowedFields(config.zonas, ["logo", "hora", "titulo", "descripcion"]) || !isRecord(config.zonas)) return false;
    return Object.entries(config.zonas).every(([key, zone]) =>
      typedScalars(zone, timelineZoneKeys, key === "logo" ? [] : ["tamano"]) && isRecord(zone) &&
      (zone.fuenteRol === undefined || ["nombres", "titulos", "textos"].includes(String(zone.fuenteRol))));
  });
}

export function assertVisualSnapshot(value: unknown): asserts value is VisualSnapshot {
  const fail = () => { throw new VisualSnapshotError("Version visual invalida o esquema no compatible (wedding-visual v1)."); };
  if (!allowedFields(value, ["schema", "schemaVersion", "rolesModel", "theme", "design", "sections"]) || !isRecord(value) ||
    value.schema !== VISUAL_SCHEMA || value.schemaVersion !== 1 || value.rolesModel !== "legacy-v1" ||
    !validateTheme(value.theme) || !allowedFields(value.design, [...designKeys, "separador", "navegacion"]) ||
    !Array.isArray(value.sections)) return fail();
  const design = value.design as Record<string, unknown>;
  for (const key of ["fondoPaginaColor", "fondoPaginaImagen"]) if (design[key] !== undefined && typeof design[key] !== "string") return fail();
  if (design.fondoPaginaTexturaTamanoPx !== undefined && (typeof design.fondoPaginaTexturaTamanoPx !== "number" || !Number.isFinite(design.fondoPaginaTexturaTamanoPx) || design.fondoPaginaTexturaTamanoPx < 0)) return fail();
  if (design.separador !== undefined && !validSeparator(design.separador)) return fail();
  if (design.navegacion !== undefined && !typedScalars(design.navegacion, ["logoUrl", "logoColor", "textoColor", "fondoColor"], ["textoTamanoPx"])) return fail();
  if (design.tratamientosImagenes !== undefined && (!isRecord(design.tratamientosImagenes) ||
    !Object.values(design.tratamientosImagenes).every((treatment) => typedScalars(treatment, [], ["opacidadOverlay", "difuminadoBordePx"])))) return fail();
  const ids = new Set<string>();
  for (const section of value.sections) {
    if (!allowedFields(section, ["id", "type", "style"]) || !isRecord(section) || typeof section.id !== "string" || ids.has(section.id) ||
      !["intro", "invitacion", "portada", "portadaLibre", "historia", "timeline", "galeria", "carrusel", "pie"].includes(String(section.type)) ||
      !allowedFields(section.style, [...sectionKeys, "componentSizes", "separadorInterno", "portadaLibre", "pie", "intro", "timelinePlantilla"])) return fail();
    ids.add(section.id);
    const style = section.style as Record<string, unknown>;
    if (style.paletaId !== undefined && typeof style.paletaId !== "string") return fail();
    if (style.selloUrl !== undefined && typeof style.selloUrl !== "string") return fail();
    if (style.usarPaletaGlobal !== undefined && typeof style.usarPaletaGlobal !== "boolean") return fail();
    for (const key of ["componentRoles", "componentFonts", "fondos"]) if (style[key] !== undefined && !stringMap(style[key])) return fail();
    if (isRecord(style.componentFonts) && !Object.values(style.componentFonts).every((v) => ["nombres", "titulos", "textos"].includes(String(v)))) return fail();
    if (style.fondos !== undefined && !allowedFields(style.fondos, ["seccion", "subseccion"])) return fail();
    if (style.componentBorders !== undefined && (!isRecord(style.componentBorders) || !Object.values(style.componentBorders).every((v) => typeof v === "boolean"))) return fail();
    if (!isRecord(style.componentSizes) || !Object.entries(style.componentSizes).every(([key, v]) => getComponentSizeKind(key) === "font" && typeof v === "number" && Number.isFinite(v) && v > 0)) return fail();
    if (style.separadorInterno !== undefined && !validSeparator(style.separadorInterno)) return fail();
    for (const key of ["portadaLibre", "pie"]) if (style[key] !== undefined && !validFree(style[key])) return fail();
    if (style.timelinePlantilla !== undefined && !validTimelineStyle(style.timelinePlantilla)) return fail();
    if (style.intro !== undefined && (!allowedFields(style.intro, ["lacreUrl", "pc", "movil"]) ||
      (isRecord(style.intro) && style.intro.lacreUrl !== undefined && typeof style.intro.lacreUrl !== "string") ||
      !Object.entries(style.intro as Record<string, unknown>).filter(([key]) => key !== "lacreUrl").every(([, v]) => validEnvelope(v)))) return fail();
  }
}

export function compareVisualSnapshots(current: VisualSnapshot, candidate: VisualSnapshot): { path: string; current: unknown; candidate: unknown }[] {
  const changes: { path: string; current: unknown; candidate: unknown }[] = [];
  const walk = (a: unknown, b: unknown, path: string) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (isRecord(a) && isRecord(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[key], b[key], path ? `${path}.${key}` : key);
    } else changes.push({ path, current: a ?? null, candidate: b ?? null });
  };
  // Section order is geometry, not a visual difference.
  walk({ theme: current.theme, design: current.design, sections: Object.fromEntries(current.sections.map((s) => [s.id, s.style])) },
    { theme: candidate.theme, design: candidate.design, sections: Object.fromEntries(candidate.sections.map((s) => [s.id, s.style])) }, "");
  return changes;
}

export function collectVisualResources(snapshot: VisualSnapshot): string[] {
  const resources = new Set<string>();
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string" && value && (key.endsWith("Url") || key === "url" || key === "fondoPaginaImagen" || key === "seccion" || key === "subseccion")) resources.add(value);
    else if (Array.isArray(value)) value.forEach((item) => walk(item));
    else if (isRecord(value)) Object.entries(value).forEach(([name, item]) => walk(item, name));
  };
  walk(snapshot);
  return [...resources];
}

/** Store an isolated, versioned visual map without copying content or geometry into config_json. */
export function mergeVisualIntoStoredConfig(raw: unknown, effective: WeddingConfig): Record<string, unknown> {
  const next = structuredClone(isRecord(raw) ? raw : {});
  next.visualSchema = "wedding-visual-v1";
  next.visualSnapshot = captureVisualSnapshot(effective);
  return next;
}
