"use client";

/**
 * components/wedding/SeccionTimeline.tsx
 * Timeline horizontal.
 * 3 puntos: Bus, Ceremonia, Celebración — con mini-mapa en el primero
 * e imagen + enlace en los otros dos.
 */

import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { AlineacionLogoTimeline, Localizacion, TamanoLogoTimeline } from "@/config/wedding.config";
import { resolveDriveMediaSrc } from "@/lib/drive-image";
import { resolveTimelineLogoAlign, resolveTimelineLogoSize, type TimelineLogoDevice } from "@/lib/timeline-logo-size";
import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

export type TimelineComponentKey =
  | "timeline.fecha"
  | "timeline.card"
  | "timeline.icono"
  | "timeline.hora"
  | "timeline.titulo"
  | "timeline.descripcion"
  | "timeline.mapa";

type Props = {
  localizaciones: Localizacion[];
  timeline: Array<{ id: string; hora: string; titulo: string; descripcion: string; icono: string; imagen?: string; enlaceMaps?: string; logoTamano?: TamanoLogoTimeline; logoAlineacion?: AlineacionLogoTimeline }>;
  // Valor del antiguo slider global de "timeline.icono"; solo se usa si el evento no tiene tamano propio.
  legacyLogoSize?: number;
  viewport?: "desktop" | "movil";
  editable?: boolean;
  designMode?: boolean;
  selectedComponentKey?: TimelineComponentKey | null;
  onSelectComponent?: (key: TimelineComponentKey) => void;
  componentStyles?: Partial<Record<TimelineComponentKey, CSSProperties>>;
  onEditTexto?: (itemId: string, field: "hora" | "titulo" | "descripcion", value: string) => void;
  onSelectItem?: (itemId: string) => void;
  headerDivider?: ReactNode;
};

type PuntoTimeline = {
  id: string;
  hora: string;
  titulo: string;
  subtitulo: string;
  icono: string;
  iconoUrl?: string;
  logoTamano?: TamanoLogoTimeline;
  logoAlineacion?: AlineacionLogoTimeline;
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

function IconoBus({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="13" rx="2"/>
      <path d="M2 10 L22 10"/><path d="M7 18 L7 20"/><path d="M17 18 L17 20"/>
      <circle cx="7" cy="14" r="1" fill="currentColor"/><circle cx="17" cy="14" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconoRings({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/>
    </svg>
  );
}
function IconoFinca({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22 L3 8 L12 3 L21 8 L21 22"/><rect x="8" y="14" width="8" height="8"/><rect x="10" y="10" width="4" height="4"/>
    </svg>
  );
}
const ICONOS: Record<string, (props: { size: number }) => ReactNode> = {
  bus: IconoBus, rings: IconoRings, finca: IconoFinca,
};

function normalizeIcon(icono: string): string {
  if (icono === "car") return "bus";
  if (icono === "rings") return "rings";
  if (icono === "iglesia") return "rings";
  if (icono === "finca") return "finca";
  return "finca";
}

// Relación ancho/alto real de la imagen; 1 (cuadrado) hasta que carga o si no tiene dimensiones intrínsecas.
function useImageRatio(src: string): number {
  const [loaded, setLoaded] = useState<{ src: string; ratio: number } | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (cancelled || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
      setLoaded({ src, ratio: img.naturalWidth / img.naturalHeight });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return loaded?.src === src ? loaded.ratio : 1;
}

// Hueco historico (44px) que se mantiene mientras el evento no tenga tamano propio.
const TIMELINE_LOGO_DEFAULT_SLOT_PX = 44;

// Logo ajustado a `size` px por su lado mayor, sin deformar ni recortar, dentro de un hueco que lo envuelve.
function LogoTimeline({
  punto,
  device,
  legacyLogoSize,
  style,
  className,
  onClick,
}: {
  punto: PuntoTimeline;
  device: TimelineLogoDevice;
  legacyLogoSize?: number;
  style: CSSProperties;
  className?: string;
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const src = punto.iconoUrl ? resolveDriveMediaSrc(punto.iconoUrl) : "";
  const ratio = useImageRatio(src);
  const { size, configured } = resolveTimelineLogoSize(punto.logoTamano, device, Boolean(src), legacyLogoSize);
  const boxWidth = ratio >= 1 ? size : size * ratio;
  const boxHeight = ratio >= 1 ? size / ratio : size;
  const minSlot = configured ? 0 : TIMELINE_LOGO_DEFAULT_SLOT_PX;
  const Builtin = ICONOS[punto.icono];
  // Los iconos integrados son cuadrados.
  const slotWidth = Math.max(src ? boxWidth : size, minSlot);
  const slotHeight = Math.max(src ? boxHeight : size, minSlot);

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ ...style, width: `${slotWidth}px`, height: `${slotHeight}px` }}
      onClick={onClick}
    >
      {src ? (
        // Máscara: el color del icono (currentColor) tiñe la imagen.
        <span
          aria-hidden="true"
          className="block flex-shrink-0"
          style={{
            width: `${boxWidth}px`,
            height: `${boxHeight}px`,
            backgroundColor: "currentColor",
            WebkitMaskImage: `url("${src}")`,
            maskImage: `url("${src}")`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      ) : Builtin ? (
        <Builtin size={size} />
      ) : null}
    </div>
  );
}

// Alineacion del logo dentro de su celda segun el dispositivo.
function logoSelfClasses(alineacion: AlineacionLogoTimeline | undefined, device: TimelineLogoDevice): string {
  const { vertical, horizontal } = resolveTimelineLogoAlign(alineacion, device);
  const v = { arriba: "self-start", centro: "self-center", abajo: "self-end" }[vertical];
  if (device === "movil") return v;
  return `${v} ${{ izquierda: "justify-self-start", centro: "justify-self-center", derecha: "justify-self-end" }[horizontal]}`;
}

// En movil la horizontal decide el lado del texto; "centro" apila el logo sobre el texto, y vertical "abajo" lo pasa debajo.
function mobileRowDirection(alineacion: AlineacionLogoTimeline | undefined): { stacked: boolean; className: string } {
  const { vertical, horizontal } = resolveTimelineLogoAlign(alineacion, "movil");
  if (horizontal === "derecha") return { stacked: false, className: "flex-row-reverse items-center" };
  if (horizontal === "centro") {
    return { stacked: true, className: vertical === "abajo" ? "flex-col-reverse items-center" : "flex-col items-center" };
  }
  return { stacked: false, className: "items-center" };
}

// Lado del hueco de logo en escritorio: la fila del grid usa el mayor de todos los eventos.
function desktopLogoRowHeight(puntos: PuntoTimeline[], legacyLogoSize?: number): number {
  return puntos.reduce((max, punto) => {
    const { size, configured } = resolveTimelineLogoSize(punto.logoTamano, "pc", Boolean(punto.iconoUrl), legacyLogoSize);
    return Math.max(max, configured ? size : Math.max(size, TIMELINE_LOGO_DEFAULT_SLOT_PX));
  }, 0);
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

  return timeline.map((item) => {
    const mapaLink = inferMapLink(item, localizaciones);
    const fallbackQuery = `${item.titulo} ${item.descripcion}`.trim();
    const icono = normalizeIcon(item.icono);
    return {
    id: item.id,
    hora: item.hora,
    titulo: item.titulo,
    subtitulo: item.descripcion,
    icono,
    iconoUrl: item.imagen?.trim() || undefined,
    logoTamano: item.logoTamano,
    logoAlineacion: item.logoAlineacion,
    mapaSrc: toMapEmbedUrl(mapaLink, fallbackQuery),
    mapaLink,
    mapaTexto: icono === "bus" ? "Ver punto de recogida" : "Cómo llegar",
  };
  });
}

export function SeccionTimeline({
  localizaciones,
  timeline,
  legacyLogoSize,
  viewport,
  editable = false,
  designMode = false,
  selectedComponentKey,
  onSelectComponent,
  componentStyles,
  onEditTexto,
  onSelectItem,
  headerDivider,
}: Props) {
  const puntos = buildTimelinePoints(timeline, localizaciones);
  const showStraightLine = puntos.length > 1 && puntos.length !== 3;
  const forceMobile = viewport === "movil";
  const logoRowHeight = desktopLogoRowHeight(puntos, legacyLogoSize);
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
    <div className="section-wedding tex-cream-dark" style={{ backgroundColor: "var(--cream-dark)" }}>
      <div className="container-wedding">
        {/* Cabecera */}
        <div className="text-center mb-14">
          <h2
            className="section-title"
            style={styleFor("timeline.fecha", { color: "var(--brown-dark)" })}
            onClick={() => select("timeline.fecha")}
          >
            6 de marzo de 2027
          </h2>
          {headerDivider !== undefined ? headerDivider : <OrnamentoDivisor />}
        </div>

        {/* ── Timeline móvil (vertical) ── */}
        <div className={forceMobile ? "space-y-6" : "space-y-6 md:hidden"}>
          {puntos.map((punto) => {
            const rowLayout = mobileRowDirection(punto.logoAlineacion);
            return (
            <article key={punto.id}>
              <div
                className="tex-white space-y-3 border px-4 pb-4 pt-3"
                style={styleFor("timeline.card", {
                  backgroundColor: "var(--white)",
                  borderColor: "var(--cream-dark)",
                })}
                onClick={() => select("timeline.card")}
              >
                <div className={`flex gap-3 ${rowLayout.className}`}>
                  <LogoTimeline
                    punto={punto}
                    device="movil"
                    legacyLogoSize={legacyLogoSize}
                    className={rowLayout.stacked ? "" : logoSelfClasses(punto.logoAlineacion, "movil")}
                    style={styleFor("timeline.icono", { color: "var(--brown-dark)" })}
                    onClick={(event) => { event.stopPropagation(); select("timeline.icono"); }}
                  />

                  <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-0 min-w-0 ${rowLayout.stacked ? "justify-center text-center" : "flex-1"}`}>
                    <span
                      className="font-display text-xl font-light tracking-wide"
                      style={styleFor("timeline.hora", { color: "var(--bronze)" })}
                      contentEditable={!designMode && editable}
                      suppressContentEditableWarning={true}
                      onClick={(event) => {
                        event.stopPropagation();
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
                    <span
                      className="font-display text-xl font-light"
                      style={styleFor("timeline.titulo", { color: "var(--brown-dark)" })}
                      contentEditable={!designMode && editable}
                      suppressContentEditableWarning={true}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (designMode) {
                          select("timeline.titulo");
                          return;
                        }
                        onSelectItem?.(punto.id);
                      }}
                      onBlur={(event) => onEditTexto?.(punto.id, "titulo", event.currentTarget.textContent ?? "")}
                    >
                      {punto.titulo}
                    </span>
                  </p>
                </div>

                <p
                  className="text-sm text-center"
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
            );
          })}
        </div>

        {/* ── Timeline escritorio (horizontal) ── */}
        <div className={forceMobile ? "hidden" : "relative hidden w-full pb-4 md:block"}>
          <div className="relative">

            {showStraightLine && (
              <div
                className="absolute left-[8%] right-[8%] h-px"
                style={{
                  top: `${logoRowHeight + 48}px`,
                  borderTop: "2px dashed var(--bronze-pale)",
                  zIndex: 0,
                }}
                aria-hidden="true"
              />
            )}

            <div
              className="relative z-10 grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.max(puntos.length, 1)}, minmax(0, 1fr))`,
                gridTemplateRows: `${logoRowHeight}px auto 1fr`,
              }}
            >
              {puntos.map((punto) => (
                <div key={punto.id} className="grid row-span-3 grid-rows-subgrid justify-items-center gap-4 min-w-0">

                  {/* Icono, sin fondo circular */}
                  <LogoTimeline
                    punto={punto}
                    device="pc"
                    legacyLogoSize={legacyLogoSize}
                    className={logoSelfClasses(punto.logoAlineacion, "pc")}
                    style={styleFor("timeline.icono", { color: "var(--brown-dark)" })}
                    onClick={(event) => { event.stopPropagation(); select("timeline.icono"); }}
                  />
                    <span
                      className="font-display text-xl font-light min-h-[1em]"
                      style={styleFor("timeline.hora", { color: "var(--bronze)", lineHeight: 1 })}
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

                  {/* Tarjeta de contenido */}
                  <div
                    className="tex-white w-full"
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
