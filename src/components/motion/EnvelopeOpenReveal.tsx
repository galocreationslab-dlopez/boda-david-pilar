"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { IntroEnvelopeConfig } from "@/config/wedding.config";

export type EnvelopeOpenRevealProps = {
  config: IntroEnvelopeConfig;
  fondo?: string;
  /** Se activa cuando el lacre ha terminado su animación (el sello se ha roto). */
  sealBroken: boolean;
  /** Contenido del lacre, se muestra centrado sobre la solapa mientras el sobre está cerrado. */
  sealSlot?: ReactNode;
  onComplete?: () => void;
  children: ReactNode;
};

type Phase = "closed" | "opening" | "extracting" | "done";

const DEFAULT_ANCHO = 340;
const DEFAULT_ALTO = 230;

/**
 * Anima la apertura de un sobre postal tras el lacre: la solapa triangular
 * gira hacia arriba dejando ver la portada solo a través de ese hueco y,
 * a continuación, el cuerpo del sobre se abre por completo dejando que la
 * portada (ya montada a pantalla completa detrás) ocupe toda la ventana.
 */
export default function EnvelopeOpenReveal({ config, fondo, sealBroken, sealSlot, onComplete, children }: EnvelopeOpenRevealProps) {
  const [phase, setPhase] = useState<Phase>("closed");

  const ancho = Math.max(160, config.anchoPx ?? DEFAULT_ANCHO);
  const alto = Math.max(120, config.altoPx ?? DEFAULT_ALTO);
  const modoFondo = config.modoFondo ?? "colores";
  const colorBase = config.colorBase || "#e8ddc7";
  const colorBorde = config.colorBorde || "#a9895f";
  const grosorBorde = Math.max(0, config.grosorBordePx ?? 2);
  const radioEsquinas = Math.max(0, config.radioEsquinasPx ?? 6);
  const colorSolapaInterior = config.colorSolapaInterior || "#c9b48c";
  const colorCostura = config.colorCostura || "#8a6a44";
  const sombraColor = config.sombraColor || "rgba(0,0,0,0.35)";
  const sombraDesenfoque = Math.max(0, config.sombraDesenfoquePx ?? 28);
  const flapPct = Math.min(70, Math.max(20, config.alturaSolapaPorcentaje ?? 42));
  const duracionApertura = Math.max(300, config.duracionAperturaMs ?? 900);
  const duracionExtraccion = Math.max(300, config.duracionExtraccionMs ?? 700);
  const usaImagen = modoFondo !== "colores" && Boolean(config.imagenUrl);

  // Se separan en dos efectos: uno dispara la apertura al romperse el sello,
  // y el otro programa la transición a "extracting" mientras dura la apertura.
  // Combinarlos en un único efecto con `phase` como dependencia provoca que la
  // limpieza cancele el propio temporizador en cuanto se llama a setPhase.
  useEffect(() => {
    if (!sealBroken || phase !== "closed") return;
    setPhase("opening");
  }, [sealBroken, phase]);

  useEffect(() => {
    if (phase !== "opening") return;
    const openTimer = window.setTimeout(() => {
      setPhase("extracting");
    }, duracionApertura);
    return () => window.clearTimeout(openTimer);
  }, [phase, duracionApertura]);

  useEffect(() => {
    if (phase !== "extracting") return;
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, duracionExtraccion);
    return () => window.clearTimeout(doneTimer);
  }, [phase, duracionExtraccion, onComplete]);

  const bodyFill: CSSProperties = usaImagen
    ? {
        backgroundImage: `url(${config.imagenUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: colorBase,
        backgroundBlendMode: modoFondo === "textura" ? "multiply" : "normal",
      }
    : { backgroundColor: colorBase };

  // Polígono del cuerpo del sobre: rectángulo con una muesca triangular (apice
  // hacia abajo) en la parte superior, donde encaja la solapa. Durante la
  // extracción la muesca "crece" hasta consumir todo el sobre, dando la
  // sensación de que este se abre por completo.
  const bodyClipPath = useMemo(() => {
    const apexY = phase === "extracting" || phase === "done" ? 100 : flapPct;
    return `polygon(0% 0%, 50% ${apexY}%, 100% 0%, 100% 100%, 0% 100%)`;
  }, [phase, flapPct]);

  const flapRotation = phase === "opening" || phase === "extracting" || phase === "done" ? -172 : 0;
  const flapOpacity = phase === "extracting" || phase === "done" ? 0 : 1;
  const sealVisible = phase === "closed";

  const envelopeWrapperStyle: CSSProperties = {
    width: `min(${ancho}px, 88vw)`,
    aspectRatio: `${ancho} / ${alto}`,
    transition: `transform ${duracionExtraccion}ms ease-in, opacity ${duracionExtraccion}ms ease-in`,
    transform: phase === "extracting" || phase === "done" ? "scale(1.06) translateY(-3%)" : "scale(1)",
    opacity: phase === "done" ? 0 : 1,
    filter: `drop-shadow(0 ${sombraDesenfoque / 2}px ${sombraDesenfoque}px ${sombraColor})`,
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: fondo }}>
      {/* Portada real, montada a pantalla completa desde el principio; solo se ve a través del hueco del sobre. */}
      <div className="absolute inset-0 z-0">{children}</div>

      {phase !== "done" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ perspective: "1800px" }}>
          <div className="relative" style={envelopeWrapperStyle}>
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ borderRadius: radioEsquinas, boxShadow: grosorBorde > 0 ? `inset 0 0 0 ${grosorBorde}px ${colorBorde}` : undefined }}
            >
              {/* Cuerpo del sobre */}
              <div
                className="absolute inset-0"
                style={{
                  ...bodyFill,
                  clipPath: bodyClipPath,
                  transition: `clip-path ${duracionExtraccion}ms ease-in`,
                }}
              />

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
                    boxShadow: colorCostura ? `inset 0 0 0 1px ${colorCostura}` : undefined,
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
                  <div
                    className="absolute inset-x-0 flex items-center justify-center"
                    style={{
                      top: "0%",
                      height: "100%",
                      opacity: sealVisible ? 1 : 0,
                      transition: "opacity 250ms ease",
                      pointerEvents: sealVisible ? "auto" : "none",
                    }}
                  >
                    <div className="mt-[8%] aspect-square w-[38%]">{sealSlot}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
