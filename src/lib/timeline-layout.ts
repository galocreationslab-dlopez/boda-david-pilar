import type { TimelineDispositivoConfig, TimelineElemento, TimelinePlantillaConfig, TimelineZona } from "@/config/wedding.config";

export const TIMELINE_ELEMENTOS: TimelineElemento[] = ["logo", "hora", "titulo", "descripcion"];
export const TIMELINE_MEDIDAS = {
  ancho: { min: 320, max: 960 },
  alturaMinima: { min: 320, max: 1600 },
  margenExterior: { min: 0, max: 64 },
  rellenoInterior: { min: 0, max: 64 },
  separacion: { min: 0, max: 80 },
  grosorBorde: { min: 0, max: 12 },
  redondeo: { min: 0, max: 160 },
} as const;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function role(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function defaultDevice(): TimelineDispositivoConfig {
  return {
    marcoVisible: true, fondoRol: "fondoSubseccion", bordeRol: "bordes",
    ancho: 360, alturaMinima: 360, margenExterior: 8, rellenoInterior: 20,
    separacion: 12, grosorBorde: 1, redondeo: 8, alineacionVertical: "center",
    orden: [...TIMELINE_ELEMENTOS],
    zonas: {
      logo: { alineacion: "center", colorRol: "logo", fuenteRol: "titulos", tamano: 72 },
      hora: { alineacion: "center", colorRol: "textoSecundario", fuenteRol: "titulos", tamano: 20 },
      titulo: { alineacion: "center", colorRol: "titulo", fuenteRol: "titulos", tamano: 24 },
      descripcion: { alineacion: "center", colorRol: "textoSecundario", fuenteRol: "textos", tamano: 16 },
    },
  };
}

function normalizeDevice(value: unknown): TimelineDispositivoConfig {
  const base = defaultDevice();
  const input = record(value);
  const medidas = Object.fromEntries(Object.entries(TIMELINE_MEDIDAS).map(([key, range]) =>
    [key, number(input[key], base[key as keyof typeof TIMELINE_MEDIDAS], range.min, range.max)]));
  const orden: TimelineElemento[] = [];
  if (Array.isArray(input.orden)) {
    for (const key of input.orden) {
      if (TIMELINE_ELEMENTOS.includes(key) && !orden.includes(key)) orden.push(key);
    }
  }
  orden.push(...TIMELINE_ELEMENTOS.filter((key) => !orden.includes(key)));
  const zonas = { ...base.zonas };
  for (const key of TIMELINE_ELEMENTOS) {
    const zone = record(record(input.zonas)[key]);
    const fallback = base.zonas[key];
    zonas[key] = {
      alineacion: zone.alineacion === "left" || zone.alineacion === "right" ? zone.alineacion : "center",
      colorRol: role(zone.colorRol, fallback.colorRol),
      fuenteRol: zone.fuenteRol === "nombres" || zone.fuenteRol === "textos" || zone.fuenteRol === "titulos" ? zone.fuenteRol : fallback.fuenteRol,
      tamano: number(zone.tamano, fallback.tamano, key === "logo" ? 16 : 12, key === "logo" ? 240 : 96),
    } satisfies TimelineZona;
  }
  return {
    ...base, ...medidas, orden, zonas,
    marcoVisible: typeof input.marcoVisible === "boolean" ? input.marcoVisible : base.marcoVisible,
    fondoRol: role(input.fondoRol, base.fondoRol),
    bordeRol: role(input.bordeRol, base.bordeRol),
    alineacionVertical: input.alineacionVertical === "start" || input.alineacionVertical === "end" ? input.alineacionVertical : "center",
  };
}

export function normalizeTimelinePlantilla(value?: unknown): TimelinePlantillaConfig {
  const input = record(value);
  return { activa: input.activa === true, pc: normalizeDevice(input.pc), movil: normalizeDevice(input.movil) };
}

/** Normaliza solo plantillas presentes: nunca modifica los contenidos ni los logos individuales. */
export function normalizeTimelineTemplates(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(normalizeTimelineTemplates);
  } else {
    const input = record(value);
    for (const [key, entry] of Object.entries(input)) {
      if (key === "timelinePlantilla") input[key] = normalizeTimelinePlantilla(entry);
      else normalizeTimelineTemplates(entry);
    }
  }
}
