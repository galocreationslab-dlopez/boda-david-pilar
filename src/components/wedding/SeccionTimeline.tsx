"use client";

/**
 * components/wedding/SeccionTimeline.tsx
 * Timeline horizontal con camino curvo punteado.
 * 3 puntos: Bus, Ceremonia, Celebración — con mini-mapa en el primero
 * e imagen + enlace en los otros dos.
 */

import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { Localizacion } from "@/config/wedding.config";
import type { CSSProperties } from "react";

export type TimelineComponentKey =
  | "timeline.card"
  | "timeline.icono"
  | "timeline.hora"
  | "timeline.titulo"
  | "timeline.descripcion"
  | "timeline.mapa";

type Props = {
  localizaciones: Localizacion[];
  timeline: Array<{ id: string; hora: string; titulo: string; descripcion: string; icono: string; enlaceMaps?: string }>;
  viewport?: "desktop" | "movil";
  editable?: boolean;
  designMode?: boolean;
  selectedComponentKey?: TimelineComponentKey | null;
  onSelectComponent?: (key: TimelineComponentKey) => void;
  componentStyles?: Partial<Record<TimelineComponentKey, CSSProperties>>;
  onEditTexto?: (itemId: string, field: "hora" | "titulo" | "descripcion", value: string) => void;
  onSelectItem?: (itemId: string) => void;
};

type PuntoTimeline = {
  id: string;
  hora: string;
  titulo: string;
  subtitulo: string;
  icono: string;
  mapaSrc: string | null;
  mapaLink: string | null;
  mapaTexto: string;
};

const PUNTOS_FALLBACK: PuntoTimeline[] = [
  {
    id: "bus",
    hora: "11:30",
    titulo: "Salida del autobús",
    subtitulo: "Punto de recogida",
    icono: "bus",
    mapaSrc: "https://maps.google.com/maps?q=Granada+Capital&output=embed",
    mapaLink: "https://maps.google.com/?q=Granada+Capital",
    mapaTexto: "Ver punto de recogida",
  },
  {
    id: "ceremonia",
    hora: "12:00",
    titulo: "Ceremonia nupcial",
    subtitulo: "Iglesia de Beas de Granada",
    icono: "rings",
    mapaSrc: "https://maps.google.com/maps?q=Iglesia+Beas+de+Granada&output=embed",
    mapaLink: "https://maps.google.com/?q=Iglesia+Beas+de+Granada",
    mapaTexto: "Cómo llegar",
  },
  {
    id: "celebracion",
    hora: "14:30",
    titulo: "Cóctel y celebración",
    subtitulo: "Finca Torre del Rey",
    icono: "finca",
    mapaSrc: "https://maps.google.com/maps?q=Finca+Torre+del+Rey+Granada&output=embed",
    mapaLink: "https://maps.google.com/?q=Finca+Torre+del+Rey+Granada",
    mapaTexto: "Cómo llegar",
  },
];

function IconoBus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="13" rx="2"/>
      <path d="M2 10 L22 10"/><path d="M7 18 L7 20"/><path d="M17 18 L17 20"/>
      <circle cx="7" cy="14" r="1" fill="currentColor"/><circle cx="17" cy="14" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconoRings() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/>
    </svg>
  );
}
function IconoFinca() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22 L3 8 L12 3 L21 8 L21 22"/><rect x="8" y="14" width="8" height="8"/><rect x="10" y="10" width="4" height="4"/>
    </svg>
  );
}
const ICONOS: Record<string, React.ReactNode> = {
  bus: <IconoBus />, rings: <IconoRings />, finca: <IconoFinca />,
};

function normalizeIcon(icono: string): string {
  if (icono === "car") return "bus";
  if (icono === "rings") return "rings";
  if (icono === "iglesia") return "rings";
  if (icono === "finca") return "finca";
  return "finca";
}

function inferMapLink(
  item: { titulo: string; descripcion: string; enlaceMaps?: string },
  localizaciones: Localizacion[],
): string | null {
  if (item.enlaceMaps) return item.enlaceMaps;

  const match = localizaciones.find((loc) => {
    const titulo = item.titulo.toLowerCase();
    const descripcion = item.descripcion.toLowerCase();
    return (
      titulo.includes(loc.nombre.toLowerCase()) ||
      descripcion.includes(loc.nombre.toLowerCase()) ||
      descripcion.includes(loc.descripcion.toLowerCase())
    );
  });

  return match?.enlaceMaps ?? null;
}

function toMapEmbedUrl(link: string | null, fallbackQuery?: string): string | null {
  if (!link) return null;
  if (link.includes("output=embed")) return link;

  try {
    const url = new URL(link);
    const q = url.searchParams.get("q");
    if (q) return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    if (fallbackQuery && fallbackQuery.trim().length > 0) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&output=embed`;
    }
    return null;
  } catch {
    if (fallbackQuery && fallbackQuery.trim().length > 0) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&output=embed`;
    }
    return null;
  }
}

function buildTimelinePoints(
  timeline: Props["timeline"],
  localizaciones: Localizacion[],
): PuntoTimeline[] {
  if (timeline.length === 0) return PUNTOS_FALLBACK;

  return timeline.slice(0, 3).map((item) => {
    const mapaLink = inferMapLink(item, localizaciones);
    const fallbackQuery = `${item.titulo} ${item.descripcion}`.trim();
    const icono = normalizeIcon(item.icono);
    return {
    id: item.id,
    hora: item.hora,
    titulo: item.titulo,
    subtitulo: item.descripcion,
    icono,
    mapaSrc: toMapEmbedUrl(mapaLink, fallbackQuery),
    mapaLink,
    mapaTexto: icono === "bus" ? "Ver punto de recogida" : "Cómo llegar",
  };
  });
}

export function SeccionTimeline({
  localizaciones,
  timeline,
  viewport,
  editable = false,
  designMode = false,
  selectedComponentKey,
  onSelectComponent,
  componentStyles,
  onEditTexto,
  onSelectItem,
}: Props) {
  const puntos = buildTimelinePoints(timeline, localizaciones);
  const showCurvedLine = puntos.length === 3;
  const forceMobile = viewport === "movil";

  const styleFor = (key: TimelineComponentKey, base: CSSProperties = {}): CSSProperties => ({
    ...base,
    ...(componentStyles?.[key] ?? {}),
    ...(designMode && selectedComponentKey === key
      ? { outline: "2px solid #b45309", outlineOffset: "2px", borderRadius: "8px" }
      : {}),
    ...(designMode ? { cursor: "pointer" } : {}),
  });

  const select = (key: TimelineComponentKey) => {
    if (!designMode) return;
    onSelectComponent?.(key);
  };

  return (
    <div className="section-wedding" style={{ backgroundColor: "var(--cream-dark)" }}>
      <div className="container-wedding">
        {/* Cabecera */}
        <div className="text-center mb-14">
          <h2 className="section-title">6 de marzo de 2027</h2>
          <OrnamentoDivisor />
        </div>

        {/* ── Timeline móvil (vertical) ── */}
        <div className={forceMobile ? "space-y-6" : "space-y-6 md:hidden"}>
          {puntos.map((punto, index) => (
            <article key={punto.id} className="relative pl-10">
              {index < puntos.length - 1 && (
                <span
                  className="absolute left-[21px] top-12 h-[calc(100%-0.5rem)] w-px"
                  style={{ backgroundColor: "var(--bronze-pale)" }}
                  aria-hidden="true"
                />
              )}

              <div
                className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full"
                style={styleFor("timeline.icono", {
                  backgroundColor: "var(--brown-dark)",
                  color: "var(--bronze-light)",
                  boxShadow: "0 0 0 3px var(--cream-dark), 0 0 0 5px var(--bronze-pale)",
                })}
                onClick={(event) => { event.stopPropagation(); select("timeline.icono"); }}
              >
                {ICONOS[punto.icono]}
              </div>

              <div
                className="space-y-3 border px-4 pb-4 pt-3"
                style={styleFor("timeline.card", {
                  backgroundColor: "var(--white)",
                  borderColor: "var(--cream-dark)",
                  borderTop: "3px solid var(--bronze)",
                })}
                onClick={() => select("timeline.card")}
              >
                <p
                  className="smallcaps text-xs tracking-widest"
                  style={styleFor("timeline.hora", { color: "var(--bronze)" })}
                  contentEditable={!designMode && editable}
                  suppressContentEditableWarning={true}
                  onClick={() => {
                    if (designMode) {
                      select("timeline.hora");
                      return;
                    }
                    onSelectItem?.(punto.id);
                  }}
                  onBlur={(event) => onEditTexto?.(punto.id, "hora", event.currentTarget.textContent ?? "")}
                >
                  {punto.hora}
                </p>
                <h3
                  className="font-display text-2xl font-light"
                  style={styleFor("timeline.titulo", { color: "var(--brown-dark)" })}
                  contentEditable={!designMode && editable}
                  suppressContentEditableWarning={true}
                  onClick={() => {
                    if (designMode) {
                      select("timeline.titulo");
                      return;
                    }
                    onSelectItem?.(punto.id);
                  }}
                  onBlur={(event) => onEditTexto?.(punto.id, "titulo", event.currentTarget.textContent ?? "")}
                >
                  {punto.titulo}
                </h3>
                <p
                  className="text-sm"
                  style={styleFor("timeline.descripcion", { color: "var(--olive-muted)" })}
                  contentEditable={!designMode && editable}
                  suppressContentEditableWarning={true}
                  onClick={() => {
                    if (designMode) {
                      select("timeline.descripcion");
                      return;
                    }
                    onSelectItem?.(punto.id);
                  }}
                  onBlur={(event) => onEditTexto?.(punto.id, "descripcion", event.currentTarget.textContent ?? "")}
                >
                  {punto.subtitulo}
                </p>

                {punto.mapaSrc && (
                  <div className="overflow-hidden" style={styleFor("timeline.mapa", { height: "150px" })} onClick={(event) => { event.stopPropagation(); select("timeline.mapa"); }}>
                    <iframe
                      src={punto.mapaSrc}
                      width="100%"
                      height="150"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Punto de recogida"
                    />
                  </div>
                )}

                {punto.mapaLink && (
                  <a
                    href={punto.mapaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary !w-full !justify-center !px-3 !py-2 !text-xs"
                  >
                    {punto.mapaTexto}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* ── Timeline escritorio (horizontal) ── */}
        <div className={forceMobile ? "hidden" : "relative hidden w-full pb-4 md:block"}>
          <div className="relative">

            {/* Camino curvo punteado SVG entre los puntos */}
            {showCurvedLine && (
              <svg
                viewBox="0 0 900 80"
                className="absolute top-[52px] left-0 right-0 w-full"
                style={{ height: "80px", zIndex: 0 }}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M 120 40 C 200 10, 280 70, 380 40 C 480 10, 580 70, 680 40 C 730 25, 760 40, 780 40"
                  fill="none"
                  stroke="var(--bronze-pale)"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Los 3 puntos */}
            <div className="relative z-10 grid grid-cols-3 gap-4">
              {puntos.map((punto) => (
                <div key={punto.id} className="flex flex-col items-center gap-4">

                  {/* Nodo circular con icono */}
                  <div
                    className="w-[104px] h-[104px] rounded-full flex flex-col items-center justify-center gap-1 flex-shrink-0"
                    style={styleFor("timeline.icono", {
                      backgroundColor: "var(--brown-dark)",
                      color: "var(--bronze-light)",
                      boxShadow: "0 0 0 4px var(--cream-dark), 0 0 0 6px var(--bronze-pale)",
                    })}
                    onClick={(event) => { event.stopPropagation(); select("timeline.icono"); }}
                  >
                    {ICONOS[punto.icono]}
                    <span
                      className="font-display font-light"
                      style={styleFor("timeline.hora", { fontSize: "1.15rem", color: "var(--white)", lineHeight: 1 })}
                      contentEditable={!designMode && editable}
                      suppressContentEditableWarning={true}
                      onClick={() => {
                        if (designMode) {
                          select("timeline.hora");
                          return;
                        }
                        onSelectItem?.(punto.id);
                      }}
                      onBlur={(event) => onEditTexto?.(punto.id, "hora", event.currentTarget.textContent ?? "")}
                    >
                      {punto.hora}
                    </span>
                  </div>

                  {/* Tarjeta de contenido */}
                  <div
                    className="w-full"
                    style={styleFor("timeline.card", {
                      backgroundColor: "var(--white)",
                      border: "1px solid var(--cream-dark)",
                      borderTop: "3px solid var(--bronze)",
                      padding: "1.25rem",
                    })}
                    onClick={() => select("timeline.card")}
                  >
                    <p
                      className="font-display text-xl font-light mb-1"
                      style={styleFor("timeline.titulo", { color: "var(--brown-dark)" })}
                      contentEditable={!designMode && editable}
                      suppressContentEditableWarning={true}
                      onClick={() => {
                        if (designMode) {
                          select("timeline.titulo");
                          return;
                        }
                        onSelectItem?.(punto.id);
                      }}
                      onBlur={(event) => onEditTexto?.(punto.id, "titulo", event.currentTarget.textContent ?? "")}
                    >
                      {punto.titulo}
                    </p>
                    <p
                      className="text-sm font-light mb-3"
                      style={styleFor("timeline.descripcion", { color: "var(--olive-muted)" })}
                      contentEditable={!designMode && editable}
                      suppressContentEditableWarning={true}
                      onClick={() => {
                        if (designMode) {
                          select("timeline.descripcion");
                          return;
                        }
                        onSelectItem?.(punto.id);
                      }}
                      onBlur={(event) => onEditTexto?.(punto.id, "descripcion", event.currentTarget.textContent ?? "")}
                    >
                      {punto.subtitulo}
                    </p>

                    {/* Mini mapa embed para el bus */}
                    {punto.mapaSrc && (
                      <div className="mb-3 overflow-hidden" style={styleFor("timeline.mapa", { height: "120px" })} onClick={(event) => { event.stopPropagation(); select("timeline.mapa"); }}>
                        <iframe
                          src={punto.mapaSrc}
                          width="100%"
                          height="120"
                          style={{ border: 0 }}
                          allowFullScreen={false}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Punto de recogida"
                        />
                      </div>
                    )}

                    {/* Enlace al mapa */}
                    {punto.mapaLink && (
                      <a
                        href={punto.mapaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !py-1.5 !px-3 !text-xs w-full justify-center"
                      >
                        {punto.mapaTexto}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
