"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AutoDrawSVG from "@/components/motion/AutoDrawSVG";

type RevealPanel = {
  svgSource: string;
  alt: string;
};

export type RevealBookProps = {
  panelIzquierdo: RevealPanel;
  panelDerecho: RevealPanel;
  children: ReactNode;
  duracionAperturaMs?: number;
  colorMarco?: string;
  tintColor?: string;
};

const PAUSA_PRE_APERTURA_MS = 220;
const MAX_ESPERA_DIBUJO_MS = 4200;

export default function RevealBook({
  panelIzquierdo,
  panelDerecho,
  children,
  duracionAperturaMs = 1400,
  colorMarco = "#d8cec0",
  tintColor,
}: RevealBookProps) {
  const [izquierdoListo, setIzquierdoListo] = useState(false);
  const [derechoListo, setDerechoListo] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [contenidoVisible, setContenidoVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const timersRef = useRef<number[]>([]);

  const panelStyle = useMemo(() => (tintColor ? { color: tintColor } : undefined), [tintColor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [];

    if (reduceMotion) {
      setAbriendo(false);
      setContenidoVisible(true);
      return;
    }

    setAbriendo(false);
    setContenidoVisible(false);
    setIzquierdoListo(false);
    setDerechoListo(false);

    // Fallback para SVGs extremadamente pesados: si el autodibujado tarda demasiado,
    // no bloqueamos la narrativa y permitimos abrir el libro igualmente.
    const failSafeTimer = window.setTimeout(() => {
      setIzquierdoListo(true);
      setDerechoListo(true);
    }, MAX_ESPERA_DIBUJO_MS);
    timersRef.current.push(failSafeTimer);
  }, [panelIzquierdo.svgSource, panelDerecho.svgSource, duracionAperturaMs, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (!izquierdoListo || !derechoListo) return;

    // Coreografia:
    // 1) esperamos a que ambos AutoDrawSVG terminen,
    // 2) aplicamos una pausa corta para respirar la escena,
    // 3) abrimos hojas en 3D,
    // 4) al terminar la apertura mostramos el contenido con fade-in.
    const startTimer = window.setTimeout(() => {
      setAbriendo(true);

      const contentTimer = window.setTimeout(() => {
        setContenidoVisible(true);
      }, Math.max(200, duracionAperturaMs));
      timersRef.current.push(contentTimer);
    }, PAUSA_PRE_APERTURA_MS);

    timersRef.current.push(startTimer);

    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }
      timersRef.current = [];
    };
  }, [duracionAperturaMs, derechoListo, izquierdoListo, reduceMotion]);

  const leftTransform = abriendo ? "rotateY(-112deg)" : "rotateY(0deg)";
  const rightTransform = abriendo ? "rotateY(112deg)" : "rotateY(0deg)";

  // El componente es transversal: no asume portada, historia ni timeline.
  // Solo revela children, que puede ser cualquier composicion inyectada por props.
  return (
    <div className="w-full">
      <div
        className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border bg-[var(--white)] shadow-[0_20px_55px_rgba(0,0,0,0.14)]"
        style={{ borderColor: colorMarco }}
      >
        <div className="relative min-h-[320px] sm:min-h-[430px]">
          <div
            className={`absolute inset-0 z-0 transition-opacity duration-500 ${contenidoVisible ? "opacity-100" : "opacity-0"}`}
            style={{
              transitionDelay: contenidoVisible ? "0ms" : "0ms",
            }}
          >
            {children}
          </div>

          {!reduceMotion && (
            <div
              className="absolute inset-0 z-10"
              style={{
                perspective: "900px",
              }}
            >
              <div
                className="absolute inset-y-0 left-0 w-1/2 border-r"
                style={{
                  borderColor: colorMarco,
                  transformOrigin: "left center",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  transform: leftTransform,
                  transition: `transform ${duracionAperturaMs}ms cubic-bezier(0.2, 0.72, 0.2, 1)`,
                }}
              >
                <div className="h-full w-full bg-[linear-gradient(110deg,rgba(255,255,255,0.97),rgba(245,240,232,0.97))] p-3 sm:p-4" style={panelStyle} role="img" aria-label={panelIzquierdo.alt}>
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.75)]">
                    <AutoDrawSVG
                      svgSource={panelIzquierdo.svgSource}
                      onComplete={() => setIzquierdoListo(true)}
                      durationMs={650}
                      staggerMs={24}
                      sequential={false}
                      respectReducedMotion
                    />
                  </div>
                </div>
              </div>

              <div
                className="absolute inset-y-0 right-0 w-1/2 border-l"
                style={{
                  borderColor: colorMarco,
                  transformOrigin: "right center",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  transform: rightTransform,
                  transition: `transform ${duracionAperturaMs}ms cubic-bezier(0.2, 0.72, 0.2, 1)`,
                }}
              >
                <div className="h-full w-full bg-[linear-gradient(255deg,rgba(255,255,255,0.97),rgba(245,240,232,0.97))] p-3 sm:p-4" style={panelStyle} role="img" aria-label={panelDerecho.alt}>
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.75)]">
                    <AutoDrawSVG
                      svgSource={panelDerecho.svgSource}
                      onComplete={() => setDerechoListo(true)}
                      durationMs={650}
                      staggerMs={24}
                      sequential={false}
                      respectReducedMotion
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
