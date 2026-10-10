"use client";

/**
 * components/wedding/SeccionTimeline.tsx
 * Timeline horizontal.
 * Cada entrada gira para mostrar su mapa en la misma region.
 */

import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { AlineacionLogoTimeline, Localizacion, TamanoLogoTimeline, TimelinePlantillaConfig } from "@/config/wedding.config";
import { resolveDriveMediaSrc } from "@/lib/drive-image";
import ImageMapFlip from "@/components/media/ImageMapFlip";
import { getGoogleMapsLinkUrl } from "@/lib/portada-libre";
import { resolveTimelineLogoAlign, resolveTimelineLogoSize, type TimelineLogoDevice } from "@/lib/timeline-logo-size";
import { normalizeTimelinePlantilla } from "@/lib/timeline-layout";
import { resolvePortadaColor } from "@/components/wedding/PortadaLibre";
import { withTextureStyle, type PaletteTexture } from "@/lib/theme-roles";
import templateStyles from "./TimelinePlantilla.module.css";
import { useEffect, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react";

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
  timeline: Array<{ id: string; hora: string; titulo: string; descripcion: string; icono: string; imagen?: string; enlaceMaps?: string; enlaceMapsEmbed?: string; logoTamano?: TamanoLogoTimeline; logoAlineacion?: AlineacionLogoTimeline }>;
  // Valor del antiguo slider global de "timeline.icono"; solo se usa si el evento no tiene tamano propio.
  legacyLogoSize?: number;
  plantilla?: TimelinePlantillaConfig;
  roleColors?: Record<string, string | undefined>;
  roleTextures?: Record<string, PaletteTexture>;
  resolveSrc?: (src: string) => string;
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
  mapaLink: string | null;
  mapaEmbed?: string;
};

const PUNTOS_FALLBACK: PuntoTimeline[] = [
  {
    id: "bus",
    hora: "11:30",
    titulo: "Salida del autobús",
    subtitulo: "Punto de recogida",
    icono: "bus",
    mapaLink: "https://maps.google.com/?q=Granada+Capital",
  },
  {
    id: "ceremonia",
    hora: "12:00",
    titulo: "Ceremonia nupcial",
    subtitulo: "Iglesia de Beas de Granada",
    icono: "rings",
    mapaLink: "https://maps.google.com/?q=Iglesia+Beas+de+Granada",
  },
  {
    id: "celebracion",
    hora: "14:30",
    titulo: "Cóctel y celebración",
    subtitulo: "Finca Torre del Rey",
    icono: "finca",
    mapaLink: "https://maps.google.com/?q=Finca+Torre+del+Rey+Granada",
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
  sharedSize,
  resolveSrc = resolveDriveMediaSrc,
}: {
  punto: PuntoTimeline;
  device: TimelineLogoDevice;
  legacyLogoSize?: number;
  style: CSSProperties;
  className?: string;
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
  sharedSize?: number;
  resolveSrc?: (src: string) => string;
}) {
  const src = punto.iconoUrl ? resolveSrc(punto.iconoUrl) : "";
  const ratio = useImageRatio(src);
  const { size, configured } = sharedSize !== undefined
    ? { size: sharedSize, configured: true }
    : resolveTimelineLogoSize(punto.logoTamano, device, Boolean(src), legacyLogoSize);
  const boxWidth = ratio >= 1 ? size : size * ratio;
  const boxHeight = ratio >= 1 ? size / ratio : size;
  const minSlot = configured ? 0 : TIMELINE_LOGO_DEFAULT_SLOT_PX;
  const Builtin = ICONOS[punto.icono];
  // Los iconos integrados son cuadrados.
  const slotWidth = Math.max(src ? boxWidth : size, minSlot);
  const slotHeight = Math.max(src ? boxHeight : size, minSlot);

  const visual = (
    <span className="flex h-full w-full items-center justify-center">
      {src ? (
        // Máscara: el color del icono (currentColor) tiñe la imagen.
        <span
          aria-hidden="true"
          className="block flex-shrink-0"
          style={{
            width: sharedSize !== undefined ? "100%" : `${boxWidth}px`,
            height: sharedSize !== undefined ? "100%" : `${boxHeight}px`,
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
    </span>
  );
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ ...style, width: sharedSize !== undefined ? `min(100%, ${slotWidth}px)` : `${slotWidth}px`, height: sharedSize !== undefined ? "auto" : `${slotHeight}px`, ...(sharedSize !== undefined ? { aspectRatio: slotWidth / slotHeight } : {}) }}
      onClick={onClick}
    >
      {visual}
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
  if (item.enlaceMaps !== undefined) return item.enlaceMaps || null;

  const match = localizaciones.find((loc) => {
    const titulo = item.titulo.toLowerCase();
    const descripcion = item.descripcion.toLowerCase();
    return (
      (Boolean(loc.nombre.trim()) && (titulo.includes(loc.nombre.toLowerCase()) || descripcion.includes(loc.nombre.toLowerCase()))) ||
      (Boolean(loc.descripcion.trim()) && descripcion.includes(loc.descripcion.toLowerCase()))
    );
  });

  return match?.enlaceMaps ?? null;
}

function buildTimelinePoints(
  timeline: Props["timeline"],
  localizaciones: Localizacion[],
): PuntoTimeline[] {
  if (timeline.length === 0) return PUNTOS_FALLBACK;

  return timeline.map((item) => {
    const mapaLink = inferMapLink(item, localizaciones);
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
    mapaLink: mapaLink ? getGoogleMapsLinkUrl(mapaLink) ?? mapaLink : null,
    mapaEmbed: item.enlaceMapsEmbed,
  };
  });
}

function subscribeMobile(callback: () => void) {
  const query = window.matchMedia("(max-width: 767px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
const serverMobile = () => false;

export function SeccionTimeline({
  localizaciones,
  timeline,
  legacyLogoSize,
  plantilla,
  roleColors = {},
  roleTextures = {},
  resolveSrc = resolveDriveMediaSrc,
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
  const mobile = useSyncExternalStore(subscribeMobile, isMobile, serverMobile);
  const device = viewport ? (viewport === "movil" ? "movil" : "pc") : (mobile ? "movil" : "pc");
  const template = normalizeTimelinePlantilla(plantilla);
  const puntos = buildTimelinePoints(timeline, localizaciones);
  const showStraightLine = puntos.length > 1 && puntos.length !== 3;
  const forceMobile = viewport === "movil";
  const logoRowHeight = desktopLogoRowHeight(puntos, legacyLogoSize);
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${Math.max(puntos.length, 1)}, minmax(0, 1fr))`,
    gridTemplateRows: `${logoRowHeight}px auto 1fr`,
  };
  const styleFor = (key: TimelineComponentKey, base: CSSProperties = {}): CSSProperties => ({
    ...base,
    ...(template.activa && key !== "timeline.fecha" ? {} : componentStyles?.[key] ?? {}),
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

        {template.activa ? (
          <div
            className={`${templateStyles.entries} ${device === "movil" ? templateStyles.mobile : ""}`}
            style={{ "--timeline-width": `${template[device].ancho}px` } as CSSProperties}
            data-timeline-template={device}
          >
            {puntos.map((punto) => {
              const layout = template[device];
              const color = (role: string, fallback: string) => resolvePortadaColor("paleta", role, undefined, roleColors) ?? fallback;
              const frameStyle = withTextureStyle("timeline.card", {
                backgroundColor: color(layout.fondoRol, "var(--white)"),
              }, roleTextures[layout.fondoRol], resolveSrc);
              return (
                <article key={punto.id} className={templateStyles.entry}>
                  <div
                    data-map-frame
                    className={templateStyles.frame}
                    style={styleFor("timeline.card", {
                      ...frameStyle,
                      ...(!layout.marcoVisible ? { backgroundColor: "transparent", backgroundImage: "none" } : {}),
                      border: `${layout.grosorBorde}px solid ${layout.marcoVisible ? color(layout.bordeRol, "var(--bronze)") : "transparent"}`,
                      borderRadius: layout.redondeo,
                      margin: `min(${layout.margenExterior}px, max(0px, calc((100cqw - 264px) / 2)))`,
                    })}
                    onClick={() => select("timeline.card")}
                  >
                    <ImageMapFlip
                      link={punto.mapaLink ?? undefined}
                      embed={punto.mapaEmbed}
                      label={punto.titulo}
                      enabled={!designMode && !editable}
                      contentSized
                      showMapHelp={false}
                      closeOnFocusOutside
                      className={templateStyles.flip}
                      frontClassName={templateStyles.front}
                      frontStyle={{
                        minHeight: layout.alturaMinima,
                        padding: `min(${layout.rellenoInterior}px, max(0px, calc((100cqw - 160px) / 2)))`,
                        gap: layout.separacion,
                        justifyContent: { start: "flex-start", center: "center", end: "flex-end" }[layout.alineacionVertical],
                      }}
                    >
                      {layout.orden.map((key) => {
                        const zone = layout.zonas[key];
                        const textStyle: CSSProperties = {
                          color: color(zone.colorRol, key === "descripcion" ? "var(--olive-muted)" : "var(--brown-dark)"),
                          fontFamily: `var(--font-${zone.fuenteRol})`,
                          fontSize: zone.tamano,
                          textAlign: zone.alineacion,
                        };
                        if (key === "logo") return (
                          <div key={key} className={templateStyles.logo} style={{ justifyContent: { left: "flex-start", center: "center", right: "flex-end" }[zone.alineacion] }}>
                            <LogoTimeline punto={punto} device={device} sharedSize={zone.tamano} resolveSrc={resolveSrc}
                              style={styleFor("timeline.icono", { color: textStyle.color })}
                              onClick={(event) => { event.stopPropagation(); select("timeline.icono"); }}
                            />
                          </div>
                        );
                        return (
                          <p key={key} className={templateStyles.zone}
                            style={styleFor(`timeline.${key}`, textStyle)}
                            contentEditable={!designMode && editable}
                            suppressContentEditableWarning
                            onClick={(event) => {
                              event.stopPropagation();
                              if (designMode) select(`timeline.${key}`);
                              else onSelectItem?.(punto.id);
                            }}
                            onBlur={(event) => onEditTexto?.(punto.id, key, event.currentTarget.textContent ?? "")}
                          >{key === "descripcion" ? punto.subtitulo : punto[key]}</p>
                        );
                      })}
                    </ImageMapFlip>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
        <>
        {/* ── Timeline móvil (vertical) ── */}
        <div className={forceMobile ? "space-y-6" : "space-y-6 md:hidden"}>
          {puntos.map((punto) => {
            const rowLayout = mobileRowDirection(punto.logoAlineacion);
            return (
            <article key={punto.id}>
              <ImageMapFlip
                link={punto.mapaLink ?? undefined}
                embed={punto.mapaEmbed}
                label={punto.titulo}
                enabled={!designMode && !editable}
                contentSized
                showMapHelp={false}
                closeOnFocusOutside
              >
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

              </div>
              </ImageMapFlip>
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
              style={gridStyle}
            >
              {puntos.map((punto) => (
                <ImageMapFlip
                  key={punto.id}
                  link={punto.mapaLink ?? undefined}
                  embed={punto.mapaEmbed}
                  label={punto.titulo}
                  enabled={!designMode && !editable}
                  contentSized
                  showMapHelp={false}
                  closeOnFocusOutside
                  className="grid row-span-3 grid-rows-subgrid gap-4 min-w-0"
                  frontClassName="grid row-span-3 grid-rows-subgrid justify-items-center gap-4 min-w-0"
                >

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
                    className="tex-white w-full text-center"
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

                  </div>
                </ImageMapFlip>
              ))}
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
