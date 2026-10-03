/**
 * components/wedding/PortadaLibre.tsx
 * Seccion "Portada" de formato libre: imagenes y textos colocados por porcentajes sobre un lienzo,
 * con layout independiente para PC y movil. Sin hooks: usable desde servidor y cliente.
 */
import type { CSSProperties } from "react";
import type {
  PortadaColorModo,
  PortadaElemento,
  PortadaElementoLayout,
  PortadaLibreConfig,
} from "@/config/wedding.config";
import {
  PANTALLA_ASPECTO,
  TEXTO_ANCHO_REFERENCIA,
  getElementoLayout,
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
    return modo === "pantallas" ? `${value}svh` : `${value}%`;
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
}: {
  elemento: PortadaElemento;
  layout: PortadaElementoLayout;
  dispositivo: PortadaDispositivo;
  roleColors: RoleColors;
  resolveSrc?: (src?: string) => string;
}) {
  const color = resolvePortadaColor(layout.colorModo, layout.colorRol, layout.colorHex, roleColors);

  if (elemento.tipo === "texto") {
    const tamano = layout.tamano ?? 32;
    const justify = layout.alineacion === "left" ? "flex-start" : layout.alineacion === "right" ? "flex-end" : "center";
    return (
      <div
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
        }}
      >
        {elemento.texto}
      </div>
    );
  }

  const src = resolveSrc ? resolveSrc(elemento.url) : (elemento.url ?? "");
  if (!src) return null;
  const ajuste = layout.ajuste ?? "contain";

  if (color) {
    const mask = `url("${src.replace(/"/g, "%22")}")`;
    return (
      <div
        role="img"
        aria-label={elemento.alt ?? ""}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: color,
          WebkitMaskImage: mask,
          maskImage: mask,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: ajuste,
          maskSize: ajuste,
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={elemento.alt ?? ""}
      loading="lazy"
      draggable={false}
      style={{ width: "100%", height: "100%", objectFit: ajuste, display: "block" }}
    />
  );
}

function PortadaLienzo({
  config,
  dispositivo,
  roleColors,
  resolveSrc,
  className,
}: {
  config: PortadaLibreConfig;
  dispositivo: PortadaDispositivo;
  roleColors: RoleColors;
  resolveSrc?: (src?: string) => string;
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
    ...(porPantallas ? { height: `${getPantallas(config, dispositivo) * 100}svh` } : { aspectRatio: String(aspecto) }),
  };

  return (
    <div className={className} style={style}>
      {config.elementos.map((elemento, index) => {
        const layout = getElementoLayout(config, dispositivo, elemento, index);
        if (layout.oculto) return null;
        return (
          <div key={elemento.id} style={getPortadaBoxStyle(layout, disp.alturaModo)}>
            <PortadaElementoContenido
              elemento={elemento}
              layout={layout}
              dispositivo={dispositivo}
              roleColors={roleColors}
              resolveSrc={resolveSrc}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function PortadaLibre({
  config,
  roleColors,
  resolveSrc,
  forzarDispositivo,
}: {
  config?: PortadaLibreConfig;
  roleColors: RoleColors;
  resolveSrc?: (src?: string) => string;
  forzarDispositivo?: PortadaDispositivo;
}) {
  const normalizado = normalizePortadaLibre(config);
  if (forzarDispositivo) {
    return <PortadaLienzo config={normalizado} dispositivo={forzarDispositivo} roleColors={roleColors} resolveSrc={resolveSrc} />;
  }
  return (
    <>
      <PortadaLienzo config={normalizado} dispositivo="pc" roleColors={roleColors} resolveSrc={resolveSrc} className="hidden md:block" />
      <PortadaLienzo config={normalizado} dispositivo="movil" roleColors={roleColors} resolveSrc={resolveSrc} className="md:hidden" />
    </>
  );
}
