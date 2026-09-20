"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { IntroEnvelopeConfig } from "@/config/wedding.config";

export type EnvelopeOpenRevealProps = {
  config: IntroEnvelopeConfig;
  fondo?: string;
  /** Se activa cuando el lacre ha terminado su animación (el sello se ha roto). */
  sealBroken: boolean;
  /** Contenido del lacre, se muestra centrado en el pico de la solapa mientras el sobre está cerrado. */
  sealSlot?: ReactNode;
  onComplete?: () => void;
  children: ReactNode;
};

type Phase = "closed" | "opening" | "descending" | "zooming" | "done";

/**
 * Anima la apertura de un sobre postal tras el lacre, en cuatro tiempos:
 * 1. "opening": la solapa gira hacia arriba dejando ver la portada (ya
 *    montada detrás, en tamaño de "carta") solo a través del hueco triangular.
 * 2. "descending": con la solapa ya abierta, el sobre entero desciende
 *    (desplazamiento y/o desvanecido, según configuración) dejando a la vista
 *    la carta.
 * 3. "zooming": la carta crece (zoom) hasta ocupar toda la pantalla.
 * 4. "done": la portada real ya ocupa toda la pantalla y se activa (el padre
 *    desmonta este componente y la deja interactiva).
 *
 * El sobre y la carta se dimensionan mediante `transform: scale()` desde el
 * centro mismo del área disponible, lo que produce un margen porcentual
 * uniforme en los 4 lados sin necesitar medir el DOM: escalar un elemento que
 * ocupa el 100% del contenedor por un factor S desde su centro dibuja
 * exactamente un recuadro con un margen de (1 - S) / 2 en cada lado.
 */
export default function EnvelopeOpenReveal({ config, fondo, sealBroken, sealSlot, onComplete, children }: EnvelopeOpenRevealProps) {
  const [phase, setPhase] = useState<Phase>("closed");

  const modoFondo = config.modoFondo ?? "colores";
  const colorBase = config.colorBase || "#e8ddc7";
  const colorBorde = config.colorBorde || "#a9895f";
  const grosorBorde = Math.max(0, config.grosorBordePorcentaje ?? 0.6);
  const radioEsquinas = Math.max(0, config.radioEsquinasPorcentaje ?? 2);
  const colorSolapaInterior = config.colorSolapaInterior || "#c9b48c";
  const colorCostura = config.colorCostura || "#8a6a44";
  const sombraColor = config.sombraColor || "rgba(0,0,0,0.35)";
  const sombraDesenfoque = Math.max(0, config.sombraDesenfoquePorcentaje ?? 3);
  const flapPct = Math.min(70, Math.max(20, config.alturaSolapaPorcentaje ?? 42));
  const usaImagen = modoFondo !== "colores" && Boolean(config.imagenUrl);

  const margenPantalla = Math.min(40, Math.max(0, config.margenPantallaPorcentaje ?? 6));
  const margenContenido = Math.min(40, Math.max(0, config.margenContenidoPorcentaje ?? 4));
  const fondoExteriorColor = config.fondoExteriorColor || fondo || "#2E1F0E";
  const modoDescenso = config.modoDescensoSobre ?? "desplazamiento";
  const duracionApertura = Math.max(300, config.duracionAperturaMs ?? 900);
  const duracionDescenso = Math.max(300, config.duracionDescensoMs ?? 700);
  const duracionZoom = Math.max(300, config.duracionZoomMs ?? 900);

  // Factor de escala = 1 - 2 * (margen / 100): al aplicarse desde el centro
  // de un elemento que ocupa el 100% del área, deja exactamente ese margen (%)
  // a cada lado, sin necesitar medir nada del DOM.
  const envelopeScale = 1 - (margenPantalla * 2) / 100;
  const contentScale = 1 - ((margenPantalla + margenContenido) * 2) / 100;

  // Se separan en efectos independientes por fase: programar el temporizador
  // de la SIGUIENTE fase dentro del mismo efecto que cambia el estado actual
  // provoca que la limpieza cancele el propio temporizador en cuanto se llama
  // a setPhase (el efecto se re-ejecuta por el cambio de `phase` y su cleanup
  // borra el timer recién creado antes de que llegue a disparar).
  useEffect(() => {
    if (!sealBroken || phase !== "closed") return;
    setPhase("opening");
  }, [sealBroken, phase]);

  useEffect(() => {
    if (phase !== "opening") return;
    const t = window.setTimeout(() => setPhase("descending"), duracionApertura);
    return () => window.clearTimeout(t);
  }, [phase, duracionApertura]);

  useEffect(() => {
    if (phase !== "descending") return;
    const t = window.setTimeout(() => setPhase("zooming"), duracionDescenso);
    return () => window.clearTimeout(t);
  }, [phase, duracionDescenso]);

  useEffect(() => {
    if (phase !== "zooming") return;
    const t = window.setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, duracionZoom);
    return () => window.clearTimeout(t);
  }, [phase, duracionZoom, onComplete]);

  const bodyFill: CSSProperties = usaImagen
    ? {
        backgroundImage: `url(${config.imagenUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: colorBase,
        backgroundBlendMode: modoFondo === "textura" ? "multiply" : "normal",
      }
    : { backgroundColor: colorBase };

  const fondoExteriorStyle: CSSProperties = config.fondoExteriorImagenUrl
    ? {
        backgroundImage: `url(${config.fondoExteriorImagenUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: fondoExteriorColor,
        backgroundBlendMode: "multiply",
      }
    : { backgroundColor: fondoExteriorColor };

  const isDescendingOrLater = phase === "descending" || phase === "zooming" || phase === "done";
  const flapRotation = phase !== "closed" ? -172 : 0;
  const sealVisible = phase === "closed";

  // El cuerpo tiene una muesca triangular fija (el hueco donde encaja la
  // solapa); ya no se anima: el sobre entero desciende como una sola pieza.
  const bodyClipPath = `polygon(0% 0%, 50% ${flapPct}%, 100% 0%, 100% 100%, 0% 100%)`;

  const descendTransform = modoDescenso !== "fade" && isDescendingOrLater ? "translateY(220%)" : "translateY(0%)";
  const descendOpacity = modoDescenso !== "desplazamiento" && isDescendingOrLater ? 0 : 1;

  const contentWrapperStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    transformOrigin: "50% 50%",
    transform: `scale(${phase === "zooming" || phase === "done" ? 1 : contentScale})`,
    transition: `transform ${duracionZoom}ms cubic-bezier(0.22,1,0.36,1)`,
    // Sombra sutil para que la carta escalada parezca papel con grosor saliendo del sobre.
    boxShadow: "0 3vmin 6vmin rgba(0,0,0,0.35)",
    pointerEvents: phase === "done" ? "auto" : "none",
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={fondoExteriorStyle}>
      {/* Portada real, siempre montada a tamaño natural; se ve reducida como una carta hasta el zoom final. */}
      <div className="z-0" style={contentWrapperStyle}>
        {children}
      </div>

      {phase !== "done" ? (
        <div className="absolute inset-0 z-10" style={{ transformOrigin: "50% 50%", transform: `scale(${envelopeScale})` }}>
          <div
            className="h-full w-full"
            style={{
              transform: descendTransform,
              opacity: descendOpacity,
              transition: `transform ${duracionDescenso}ms ease-in, opacity ${duracionDescenso}ms ease-in`,
            }}
          >
            <div className="relative h-full w-full" style={{ perspective: "180vmin" }}>
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  borderRadius: `${radioEsquinas}vmin`,
                  boxShadow: [
                    grosorBorde > 0 ? `inset 0 0 0 ${grosorBorde}vmin ${colorBorde}` : null,
                    `0 ${sombraDesenfoque / 2}vmin ${sombraDesenfoque}vmin ${sombraColor}`,
                  ]
                    .filter(Boolean)
                    .join(", "),
                }}
              >
                {/* Cuerpo del sobre */}
                <div className="absolute inset-0" style={{ ...bodyFill, clipPath: bodyClipPath }} />

                {/* Solapa triangular */}
                <div
                  className="absolute left-0 top-0 w-full origin-top"
                  style={{
                    height: `${flapPct}%`,
                    transformStyle: "preserve-3d",
                    transform: `rotateX(${flapRotation}deg)`,
                    transition: `transform ${duracionApertura}ms cubic-bezier(0.22,1,0.36,1)`,
                  }}
                >
                  {/* Cara frontal de la solapa */}
                  <div
                    className="absolute inset-0"
                    style={{
                      ...bodyFill,
                      clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
                      boxShadow: colorCostura ? `inset 0 0 0 0.2vmin ${colorCostura}` : undefined,
                      backfaceVisibility: "hidden",
                    }}
                  />
                  {/* Cara interior de la solapa, visible al girar más de 90º */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: colorSolapaInterior,
                      clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                    }}
                  />

                  {sealSlot ? (
                    // Centrado exactamente en el pico de la solapa (50%, 100% de su propia caja).
                    <div
                      className="absolute aspect-square w-[clamp(6rem,20vmin,12rem)]"
                      style={{
                        left: "50%",
                        top: "100%",
                        transform: "translate(-50%, -50%)",
                        opacity: sealVisible ? 1 : 0,
                        transition: "opacity 250ms ease",
                        pointerEvents: sealVisible ? "auto" : "none",
                      }}
                    >
                      {sealSlot}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
