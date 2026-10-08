/**
 * components/wedding/PortadaLibre.tsx
 * Seccion "Portada" de formato libre: imagenes y textos colocados por porcentajes sobre un lienzo,
 * con layout independiente para PC y movil.
 */
import type { CSSProperties } from "react";
import type {
  PortadaColorModo,
  PortadaElemento,
  PortadaElementoLayout,
  PortadaLibreConfig,
  TratamientoImagen,
} from "@/config/wedding.config";
import ImageTreatmentFrame from "@/components/media/ImageTreatmentFrame";
import ImageMapFlip from "@/components/media/ImageMapFlip";
import PortadaAspectRatioBox from "@/components/wedding/PortadaAspectRatioBox";
import {
  PANTALLA_ASPECTO,
  TEXTO_ANCHO_REFERENCIA,
  getElementoLayout,
  getGoogleMapsEmbedUrl,
  getSafePortadaLinkUrl,
  getPantallas,
  normalizePortadaLibre,
  type PortadaDispositivo,
} from "@/lib/portada-libre";

type RoleColors = Record<string, string | undefined>;

export function resolvePortadaColor(
  modo: PortadaColorModo | undefined,
  rol: string | undefined,
  hex: string | undefined,
  roleColors: RoleColors,
): string | undefined {
  if (modo === "paleta") return rol ? roleColors[rol] : undefined;
  if (modo === "personalizado") return hex || undefined;
  return undefined;
}

/** Caja del elemento. Con `unitPx` (editor) usa px; sin el, "pantallas" usa svh y "aspecto" usa %. */
export function getPortadaBoxStyle(
  layout: PortadaElementoLayout,
  modo: "aspecto" | "pantallas",
  unitPx?: number,
): CSSProperties {
  const vertical = (value: number): string => {
    if (unitPx !== undefined) return `${(value * unitPx) / 100}px`;
    return modo === "pantallas" ? `calc(${value} * var(--wedding-svh, 1svh))` : `${value}%`;
  };
  return {
    position: "absolute",
    left: `${layout.x}%`,
    width: `${layout.w}%`,
    top: vertical(layout.y),
    height: vertical(layout.h),
    zIndex: layout.z ?? 1,
    opacity: (layout.opacidad ?? 100) / 100,
  };
}

export function PortadaElementoContenido({
  elemento,
  layout,
  dispositivo,
  roleColors,
  resolveSrc,
  imageTreatment,
  mapsInteractive = true,
}: {
  elemento: PortadaElemento;
  layout: PortadaElementoLayout;
  dispositivo: PortadaDispositivo;
  roleColors: RoleColors;
  resolveSrc?: (src?: string) => string;
  imageTreatment?: TratamientoImagen;
  mapsInteractive?: boolean;
}) {
  const color = resolvePortadaColor(layout.colorModo, layout.colorRol, layout.colorHex, roleColors);

  if (elemento.tipo === "texto" || elemento.tipo === "enlace") {
    const tamano = layout.tamano ?? 32;
    const justify = layout.alineacion === "left" ? "flex-start" : layout.alineacion === "right" ? "flex-end" : "center";
    const contenido = (
      <span
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: justify,
          alignItems: layout.alineacionVertical ?? "center",
          textAlign: layout.alineacion ?? "center",
          whiteSpace: "pre-wrap",
          lineHeight: 1.15,
          overflowWrap: "anywhere",
          color: color ?? "var(--brown-dark)",
          fontFamily: `var(--font-${layout.fuenteRol ?? "titulos"})`,
          fontSize: `${(tamano / TEXTO_ANCHO_REFERENCIA[dispositivo]) * 100}cqw`,
          fontWeight: layout.negrita ? 700 : 400,
          fontStyle: layout.cursiva ? "italic" : "normal",
          ...(elemento.tipo === "enlace" ? { textDecoration: "underline", textUnderlineOffset: "0.15em" } : {}),
        }}
      >
        {elemento.texto || (elemento.tipo === "enlace" ? elemento.url : "")}
      </span>
    );
    if (elemento.tipo === "enlace") {
      const href = getSafePortadaLinkUrl(elemento.url);
      const nuevaPestana = href?.startsWith("http:") || href?.startsWith("https:");
      return href ? <a href={href} target={nuevaPestana ? "_blank" : undefined} rel={nuevaPestana ? "noopener noreferrer" : undefined} style={{ display: "block", width: "100%", height: "100%" }}>{contenido}</a> : contenido;
    }
    return (
      <div style={{ width: "100%", height: "100%" }}>{contenido}</div>
    );
  }

  if (elemento.tipo === "mapa") {
    const mapSrc = getGoogleMapsEmbedUrl(elemento.url);
    if (!mapSrc) return null;
    return (
      <iframe
        src={mapSrc}
        title={elemento.nombre || "Mapa de Google Maps"}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    );
  }

  const src = resolveSrc ? resolveSrc(elemento.url) : (elemento.url ?? "");
  if (!src) return null;
  const ajuste = layout.ajuste ?? "contain";
  const visual = color ? (
    <div
      role="img"
      aria-label={elemento.alt ?? ""}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: color,
        WebkitMaskImage: `url("${src.replace(/"/g, "%22")}")`,
        maskImage: `url("${src.replace(/"/g, "%22")}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: ajuste,
        maskSize: ajuste,
      }}
    />
  ) : (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={elemento.alt ?? ""}
        loading="lazy"
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: ajuste, display: "block" }}
      />
      </>
  );
  const imagen = (
    <ImageTreatmentFrame src={src} fit={ajuste} treatment={imageTreatment}>
      {visual}
    </ImageTreatmentFrame>
  );
  const enlaceUrl = getSafePortadaLinkUrl(elemento.enlaceUrl);
  if (mapsInteractive && elemento.enlaceMaps && (elemento.accionImagen === "mapa" || (!elemento.accionImagen && !elemento.enlaceUrl))) {
    return (
      <ImageMapFlip link={elemento.enlaceMaps} embed={elemento.enlaceMapsEmbed} label={elemento.alt || elemento.nombre || "imagen"}>
        {imagen}
      </ImageMapFlip>
    );
  }
  if (enlaceUrl) {
    const nuevaPestana = enlaceUrl.startsWith("http:") || enlaceUrl.startsWith("https:");
    return (
      <a
        href={enlaceUrl}
        target={nuevaPestana ? "_blank" : undefined}
        rel={nuevaPestana ? "noopener noreferrer" : undefined}
        aria-label={elemento.alt || elemento.nombre || "Abrir enlace"}
        style={{ display: "block", width: "100%", height: "100%", cursor: "pointer" }}
      >
        {imagen}
      </a>
    );
  }

  return imagen;
}

function PortadaLienzo({
  config,
  dispositivo,
  roleColors,
  resolveSrc,
  imageTreatments,
  className,
}: {
  config: PortadaLibreConfig;
  dispositivo: PortadaDispositivo;
  roleColors: RoleColors;
  resolveSrc?: (src?: string) => string;
  imageTreatments?: Record<string, TratamientoImagen>;
  className?: string;
}) {
  const disp = config[dispositivo];
  const porPantallas = disp.alturaModo === "pantallas";
  const aspecto = disp.aspecto && disp.aspecto > 0 ? disp.aspecto : PANTALLA_ASPECTO[dispositivo];
  const fondo = resolvePortadaColor(disp.fondoModo, disp.fondoRol, disp.fondoHex, roleColors);

  const style: CSSProperties = {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    containerType: "inline-size",
    backgroundColor: fondo,
    ...(porPantallas ? { height: `calc(${getPantallas(config, dispositivo) * 100} * var(--wedding-svh, 1svh))` } : { aspectRatio: String(aspecto) }),
  };

  return (
    <div className={className} style={style}>
      {config.elementos.map((elemento, index) => {
        const layout = getElementoLayout(config, dispositivo, elemento, index);
        if (layout.oculto) return null;
        const imageSrc = elemento.tipo === "imagen" && resolveSrc ? resolveSrc(elemento.url) : undefined;
        return (
          <PortadaAspectRatioBox
            key={elemento.id}
            layout={layout}
            imageSrc={imageSrc}
            modo={disp.alturaModo}
            referenceRatio={porPantallas ? PANTALLA_ASPECTO[dispositivo] : aspecto}
          >
            <PortadaElementoContenido
              elemento={elemento}
              layout={layout}
              dispositivo={dispositivo}
              roleColors={roleColors}
              resolveSrc={resolveSrc}
              imageTreatment={imageTreatments?.[`portada:${elemento.id}`]}
            />
          </PortadaAspectRatioBox>
        );
      })}
    </div>
  );
}

export default function PortadaLibre({
  config,
  roleColors,
  resolveSrc,
  imageTreatments,
  forzarDispositivo,
}: {
  config?: PortadaLibreConfig;
  roleColors: RoleColors;
  resolveSrc?: (src?: string) => string;
  imageTreatments?: Record<string, TratamientoImagen>;
  forzarDispositivo?: PortadaDispositivo;
}) {
  const normalizado = normalizePortadaLibre(config);
  if (forzarDispositivo) {
    return <PortadaLienzo config={normalizado} dispositivo={forzarDispositivo} roleColors={roleColors} resolveSrc={resolveSrc} imageTreatments={imageTreatments} />;
  }
  return (
    <>
      <PortadaLienzo config={normalizado} dispositivo="pc" roleColors={roleColors} resolveSrc={resolveSrc} imageTreatments={imageTreatments} className="hidden md:block" />
      <PortadaLienzo config={normalizado} dispositivo="movil" roleColors={roleColors} resolveSrc={resolveSrc} imageTreatments={imageTreatments} className="md:hidden" />
    </>
  );
}
