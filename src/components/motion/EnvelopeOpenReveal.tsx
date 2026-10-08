"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { normalizeIntroEnvelopeConfig, type IntroEnvelopeConfig } from "@/config/wedding.config";
import { getEnvelopeResources, type EnvelopeTexture } from "@/lib/intro-envelope-resources";
import { useIntroImages, useIntroReducedMotion } from "@/components/motion/useIntroResources";
import EnvelopeDryStamp from "@/components/motion/EnvelopeDryStamp";

export type { EnvelopeTexture } from "@/lib/intro-envelope-resources";

export type EnvelopeOpenRevealProps = {
  config: IntroEnvelopeConfig;
  /** Textura de la paleta (se repite como mosaico); sustituye a los colores y a la imagen del sobre. */
  texture?: EnvelopeTexture;
  fondo?: string;
  /** Se activa cuando el lacre ha terminado su animación (el sello se ha roto). */
  sealBroken: boolean;
  sealReady?: boolean;
  /** Contenido del lacre, se muestra centrado en el pico de la solapa mientras el sobre está cerrado. */
  sealSlot?: ReactNode;
  sealSizePercent?: number;
  onComplete?: () => void;
  children: ReactNode;
};

type Phase = "closed" | "opening" | "descending" | "zooming" | "done";

/**
 * Punto redondeado de un vértice en (apexX, apexY) cuyos dos lados van hacia
 * (0, cornerY) y (2*apexX, cornerY): sustituye el ángulo vivo por dos puntos
 * desplazados una fracción `f` del vértice hacia cada esquina, para unirlos
 * después con una curva cuadrática (con el vértice original como control).
 */
function roundedApex(apexX: number, apexY: number, cornerY: number, f: number) {
  return {
    leftX: apexX - apexX * f,
    rightX: apexX + apexX * f,
    y: apexY + (cornerY - apexY) * f,
  };
}

function lightDirection(light: number) {
  // Angulo matematico del origen de luz; CSS tiene el eje Y invertido.
  return { x: -Math.cos(light), y: Math.sin(light) };
}

function directionalShadow(light: number, distance: number, blur: number, color: string, intensity: number, angleDegrees = 0) {
  const { x, y } = lightDirection(light);
  const localY = y * Math.cos(angleDegrees * Math.PI / 180);
  return `drop-shadow(calc(${x * distance} * var(--wedding-vmin, 1vmin)) calc(${localY * distance} * var(--wedding-vmin, 1vmin)) calc(${blur} * var(--wedding-vmin, 1vmin)) color-mix(in srgb, ${color} ${intensity * 100}%, transparent))`;
}

function paperThicknessShadow(light: number, intensity: number, color: string, angleDegrees = 0) {
  return directionalShadow(light, 0.15 + intensity * 0.5, 0.2 + intensity * 0.6, color, intensity, angleDegrees);
}

function openingShadows(angleDegrees: number, light: number, intensity: number, softness: number, color: string) {
  const angle = angleDegrees * Math.PI / 180;
  const lift = Math.sin(angle);
  const { x, y } = lightDirection(light);
  return {
    flap: {
      // Cada punto proyecta segun su altura; la bisagra permanece fija.
      transform: `matrix(1, 0, ${x * lift * 0.65}, ${Math.cos(angle) + y * lift * 0.65}, 0, 0)`,
      opacity: intensity * (0.25 + 0.75 * lift),
      filter: `blur(calc(${softness * (0.2 + lift)} * var(--wedding-vmin, 1vmin)))`,
    },
    seal: {
      filter: directionalShadow(light, 0.7 + lift * 0.5, softness * (0.12 + lift * 0.15), color, intensity, angleDegrees),
    },
  };
}

/**
 * Ancho/alto del marco util. Solo se necesita en modo de relación de
 * aspecto "fijo": el propio recuadro del sobre puede dimensionarse con CSS
 * puro (unidades de contenedor y `aspect-ratio`), pero la portada se escala con `transform:
 * scale()` sobre un elemento a tamaño de ventana, y ese factor de escala debe
 * ser un número (no se puede dividir una longitud CSS entre otra en calc()),
 * así que aquí sí hace falta medir el marco útil.
 *
 * Se mide en `useLayoutEffect` (síncrono, antes de pintar) en vez de
 * `useEffect`: así la primera pintura ya usa las medidas reales y no se ve
 * un salto/animación desde un valor de reserva (0) al real nada más cargar.
 */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useViewportSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useIsoLayoutEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const update = () => setSize({ width: frame.clientWidth, height: frame.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    update();
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/**
 * Anima la apertura de un sobre postal tras el lacre, en cuatro tiempos:
 * 1. "opening": la solapa gira hacia arriba hasta quedar extendida (mostrando
 *    su cara interior), dejando ver la portada (ya montada detrás, en tamaño
 *    de "carta") solo a través del hueco triangular.
 * 2. "descending": el sobre entero (trasera + solapa + frontal, siempre en
 *    ese orden respecto a la portada) desciende como un conjunto único
 *    (desplazamiento y/o desvanecido, según configuración) dejando a la vista
 *    la carta.
 * 3. "zooming": la carta crece (zoom) hasta ocupar toda la pantalla.
 * 4. "done": la portada real ya ocupa toda la pantalla y se activa (el padre
 *    desmonta este componente y la deja interactiva).
 *
 * El sobre se compone de 3 piezas independientes (trasera, frontal y solapa).
 * En modo de relación de aspecto "automático" se dimensionan mediante
 * `transform: scale()` desde el centro del área disponible: escalar un
 * elemento que ocupa el 100% del contenedor por un factor S desde su centro
 * dibuja exactamente un recuadro con un margen de (1 - S) / 2 en cada lado,
 * sin necesitar medir el DOM. En modo "fijo" se dimensionan con un ancho/alto
 * explícitos (CSS `min()` + `aspect-ratio`) centrados en la pantalla: el
 * margen configurado pasa a ser un mínimo, y el lado sobrante se reparte como
 * margen extra en el eje que le sobre espacio.
 */
export default function EnvelopeOpenReveal({ config: rawConfig, texture, fondo, sealBroken, sealReady = true, sealSlot, sealSizePercent = 24, onComplete, children }: EnvelopeOpenRevealProps) {
  const config = normalizeIntroEnvelopeConfig(rawConfig);
  const [phase, setPhase] = useState<Phase>("closed");
  const patternId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const sealFadeAnimationRef = useRef<Animation | null>(null);
  const flapExteriorRef = useRef<HTMLDivElement>(null);
  const flapInteriorRef = useRef<HTMLDivElement>(null);
  const frontMotionRef = useRef<HTMLDivElement>(null);
  const contentMotionRef = useRef<HTMLDivElement>(null);
  const contentScaleRef = useRef<HTMLDivElement>(null);
  const completionRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useIsoLayoutEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const complete = useCallback(() => {
    if (completionRef.current) return;
    completionRef.current = true;
    setPhase("done");
    onCompleteRef.current?.();
  }, []);
  const viewport = useViewportSize(viewportRef);
  const reduceMotion = useIntroReducedMotion();
  const [stampStatus, setStampStatus] = useState<{ src: string; failed: boolean; image: boolean }>();

  const modoFondo = config.modoFondo ?? "colores";
  const { paletteTexture, texture: configuredTexture, image: configuredImageSrc, exterior: exteriorSrc, dryStamp: dryStampSrc } = getEnvelopeResources(config, texture);
  const colorBase = paletteTexture?.color || config.colorBase || "#e8ddc7";
  // Color de la trasera y la cara exterior de la solapa: son la misma pieza de papel,
  // por eso comparten color, independiente del color del frontal.
  const colorTrasera = paletteTexture?.color || config.colorTrasera || colorBase;
  const radioEsquinas = Math.max(0, config.radioEsquinasPorcentaje ?? 2);
  const colorSolapaInterior = config.colorSolapaInterior || "#c9b48c";
  const sombraColor = config.sombraColor || "rgba(0,0,0,0.35)";
  const sombraDesenfoque = Math.max(0, config.sombraDesenfoquePorcentaje ?? 3);
  const flapPct = Math.min(70, Math.max(20, config.alturaSolapaPorcentaje ?? 42));
  const radioPico = Math.min(50, Math.max(0, config.radioPicoSolapaPorcentaje ?? 10)) / 100;
  const resources = useIntroImages([configuredTexture?.url ?? "", configuredImageSrc, exteriorSrc]);
  const tex = configuredTexture && !resources.failed.includes(configuredTexture.url) ? configuredTexture : undefined;
  const imagenSobreSrc = resources.failed.includes(configuredImageSrc) ? "" : configuredImageSrc;
  const usaImagen = Boolean(imagenSobreSrc);
  const stampReady = !dryStampSrc || stampStatus?.src === dryStampSrc;
  const stampFailed = Boolean(dryStampSrc && stampStatus?.src === dryStampSrc && stampStatus.failed);
  const ready = viewport.width > 0 && viewport.height > 0 && sealReady && resources.ready && stampReady;
  const colorSombraApertura = config.colorSombraApertura || "rgba(0,0,0,0.55)";
  const intensidadSombraApertura = Math.min(100, Math.max(0, config.intensidadSombraAperturaPorcentaje ?? 45)) / 100;
  const colorGrosorPapel = config.colorGrosorPapel || "rgba(0,0,0,0.4)";
  const intensidadGrosorPapel = Math.min(100, Math.max(0, config.intensidadGrosorPapelPorcentaje ?? 35)) / 100;

  const margenPantalla = Math.min(40, Math.max(0, config.margenPantallaPorcentaje ?? 6));
  const margenContenido = Math.min(40, Math.max(0, config.margenContenidoPorcentaje ?? 4));
  const fondoExteriorColor = config.fondoExteriorColor || fondo || "#2E1F0E";
  const modoDescenso = config.modoDescensoSobre ?? "desplazamiento";
  const fadeApertura = config.modoSalidaSobre === "fadeApertura";
  const anguloMaximo = config.anguloMaximoAperturaGrados ?? 180;
  const direccionLuz = (config.direccionLuzGrados ?? 225) * Math.PI / 180;
  const modoAspecto = config.modoAspectoSobre ?? "automatico";
  const ajusteAspecto = config.ajusteAspectoSobre ?? "ancho";
  const aspectoAncho = Math.max(0.1, config.aspectoAnchoSobre ?? 3);
  const aspectoAlto = Math.max(0.1, config.aspectoAltoSobre ?? 2);
  const aspectRatio = aspectoAncho / aspectoAlto;
  const duracionApertura = reduceMotion ? 0 : Math.max(300, config.duracionAperturaMs ?? 900);
  const duracionDescenso = reduceMotion ? 0 : Math.max(300, config.duracionDescensoMs ?? 700);
  const duracionZoom = reduceMotion ? 0 : Math.max(300, config.duracionZoomMs ?? 900);
  const sealSize = Math.min(40, Math.max(5, sealSizePercent));

  // Factor de escala = 1 - 2 * (margen / 100): al aplicarse desde el centro
  // de un elemento que ocupa el 100% del área, deja exactamente ese margen (%)
  // a cada lado, sin necesitar medir nada del DOM. Se usa en modo "automático".
  const envelopeScale = 1 - (margenPantalla * 2) / 100;
  const contentScaleAutomatico = 1 - ((margenPantalla + margenContenido) * 2) / 100;

  // Recuadro del sobre en modo "fijo": se ajusta EXACTAMENTE a un eje (con su margen)
  // y el otro sale de la relación de aspecto, pudiendo sobresalir de la pantalla sin
  // recortarse (es el comportamiento buscado: p. ej. en modo "alto" el sobre puede ser
  // más ancho que la pantalla). Antes se usaba `min()` de ambos ejes ("contain"), que
  // nunca dejaba que el sobre se saliera; ahora el eje elegido manda siempre.
  const margenDisponiblePct = 100 - margenPantalla * 2;
  const envelopeFixedSizeExpr =
    ajusteAspecto === "alto" ? `${margenDisponiblePct}cqh` : `${margenDisponiblePct}cqw`;

  const envelopeBoxStyle: CSSProperties =
    modoAspecto === "fijo"
      ? ajusteAspecto === "alto"
        ? { position: "absolute", left: "50%", top: "50%", height: envelopeFixedSizeExpr, width: "auto", aspectRatio: `${aspectRatio}`, transform: "translate(-50%, -50%)" }
        : { position: "absolute", left: "50%", top: "50%", width: envelopeFixedSizeExpr, height: "auto", aspectRatio: `${aspectRatio}`, transform: "translate(-50%, -50%)" }
      : { position: "absolute", top: `${margenPantalla}%`, bottom: `${margenPantalla}%`, left: `${margenPantalla}%`, right: `${margenPantalla}%` };

  // La portada se ajusta SIEMPRE al ancho disponible (sobre menos su margen), centrada
  // horizontalmente, con su borde superior pegado al borde superior del hueco (no se
  // recorta ni se encoge más para que quepa entera; el posible exceso de alto lo tapa
  // el rectángulo "cobertor" de más abajo). En modo "alto" el sobre (y por tanto la
  // portada) puede ser más ancho que la pantalla, sobresaliendo por los lados: al no
  // recortarla ni limitar su escala, esto ocurre de forma natural. Como el factor de
  // escala es un número (no se puede dividir una longitud CSS entre otra en calc()),
  // esto necesita medir la ventana real.
  let contentScale = contentScaleAutomatico;
  let contentOffsetY = 0;
  if (viewport.width > 0 && viewport.height > 0) {
    const [envAncho, envAlto] =
      modoAspecto === "fijo"
        ? ajusteAspecto === "alto"
          ? (() => {
              const h = viewport.height * (margenDisponiblePct / 100);
              return [h * aspectRatio, h];
            })()
          : (() => {
              const w = viewport.width * (margenDisponiblePct / 100);
              return [w, w / aspectRatio];
            })()
        : [viewport.width * envelopeScale, viewport.height * envelopeScale];

    const contentTargetW = envAncho * (1 - (margenContenido * 2) / 100);
    const sobreDesbordaHorizontalmente = modoAspecto === "fijo"
      && ajusteAspecto === "alto"
      && envAncho > viewport.width;
    contentScale = sobreDesbordaHorizontalmente ? 1 : contentTargetW / viewport.width;

    // Posición (en píxeles reales) del borde superior del hueco de la portada dentro
    // del sobre, y la que tendría la portada si solo se centrara con `scale()`; la
    // diferencia es el desplazamiento vertical extra que hay que aplicarle para que
    // arranque pegada arriba en vez de centrada.
    const envTop = (viewport.height - envAlto) / 2;
    const targetTop = envTop + envAlto * (margenContenido / 100);
    const naturalTop = (viewport.height * (1 - contentScale)) / 2;
    contentOffsetY = targetTop - naturalTop;
  }

  useEffect(() => {
    if (!sealBroken || !ready || phase !== "closed") return;
    if (reduceMotion) {
      complete();
      return;
    }
    // Garantiza una pintura cerrada incluso con sealBroken activo desde el montaje.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setPhase("opening"));
    });
    return () => cancelAnimationFrame(frame);
  }, [sealBroken, ready, phase, reduceMotion, complete]);

  useIsoLayoutEffect(() => {
    if (phase !== "opening" || !flapRef.current) return;
    if (reduceMotion) {
      complete();
      return;
    }
    const options: KeyframeAnimationOptions = { duration: duracionApertura, easing: "ease-in-out", fill: "forwards" };
    const rotation = flapRef.current.animate(
      [{ transform: "rotateX(0deg)" }, { transform: `rotateX(${-anguloMaximo}deg)` }],
      options,
    );
    const shadows: Keyframe[] = [];
    const sealShadows: Keyframe[] = [];
    const exteriorEdges: Keyframe[] = [];
    const interiorEdges: Keyframe[] = [];
    for (let i = 0; i <= 60; i++) {
      const angle = anguloMaximo * i / 60;
      const frame = openingShadows(angle, direccionLuz, intensidadSombraApertura, sombraDesenfoque, colorSombraApertura);
      shadows.push({ offset: i / 60, ...frame.flap });
      sealShadows.push({ offset: i / 60, ...frame.seal });
      exteriorEdges.push({ offset: i / 60, filter: paperThicknessShadow(direccionLuz, intensidadGrosorPapel, colorGrosorPapel, angle) });
      // La cara interior gira ademas 180 grados sobre Y.
      interiorEdges.push({ offset: i / 60, filter: paperThicknessShadow(Math.PI - direccionLuz, intensidadGrosorPapel, colorGrosorPapel, angle) });
    }
    const animations = [rotation];
    if (shadowRef.current) animations.push(shadowRef.current.animate(shadows, options));
    if (sealRef.current) animations.push(sealRef.current.animate(sealShadows, options));
    if (sealRef.current && config.lacreFadeDuranteApertura) {
      const fade = sealRef.current.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: config.duracionFadeLacreMs ?? 900,
        easing: "ease",
        fill: "forwards",
      });
      sealFadeAnimationRef.current?.cancel();
      sealFadeAnimationRef.current = fade;
      // El fade conserva su reloj durante descenso/zoom, sin reiniciarse por fase.
    }
    if (flapExteriorRef.current) animations.push(flapExteriorRef.current.animate(exteriorEdges, options));
    if (flapInteriorRef.current) animations.push(flapInteriorRef.current.animate(interiorEdges, options));
    if (fadeApertura) {
      viewportRef.current?.querySelectorAll<HTMLElement>("[data-envelope-layer]").forEach((layer) => {
        animations.push(layer.animate([{ opacity: 1 }, { opacity: 0 }], options));
      });
    }
    // Un solo reloj nativo: giro, sombras y fade comparten inicio, duración y curva.
    const startTime = document.timeline.currentTime;
    animations.forEach((animation) => { animation.startTime = startTime; });
    if (sealFadeAnimationRef.current) sealFadeAnimationRef.current.startTime = startTime;
    let cancelled = false;
    rotation.finished.then(() => {
      if (cancelled) return;
      if (fadeApertura) complete();
      else setPhase("descending");
    }, (error: unknown) => {
      if (!cancelled) console.error("[Intro] No se pudo completar la apertura del sobre", error);
    });
    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.cancel());
    };
  }, [phase, reduceMotion, duracionApertura, anguloMaximo, direccionLuz, intensidadSombraApertura, sombraDesenfoque, colorSombraApertura, intensidadGrosorPapel, colorGrosorPapel, fadeApertura, config.lacreFadeDuranteApertura, config.duracionFadeLacreMs, complete]);

  useEffect(() => () => {
    sealFadeAnimationRef.current?.cancel();
  }, []);

  useIsoLayoutEffect(() => {
    if (phase !== "descending" && phase !== "zooming") return;
    const elements = phase === "descending"
      ? [frontMotionRef.current]
      : [contentMotionRef.current, contentScaleRef.current];
    const transitions = elements.flatMap((element) => element?.getAnimations() ?? []);
    let cancelled = false;
    Promise.all(transitions.map((animation) => animation.finished)).then(() => {
      if (cancelled) return;
      if (phase === "descending") setPhase("zooming");
      else complete();
    }, (error: unknown) => {
      if (!cancelled) console.error("[Intro] No se pudo completar la salida del sobre", error);
    });
    return () => { cancelled = true; };
  }, [phase, duracionDescenso, duracionZoom, complete]);

  const tileStyle: CSSProperties = tex
    ? {
        backgroundImage: `url("${tex.url.replace(/["\\\n\r]/g, "")}")`,
        backgroundSize: tex.sizePx && tex.sizePx > 0 ? `${Math.round(tex.sizePx)}px` : "auto",
        backgroundRepeat: "repeat",
      }
    : {};

  // Recorta el mosaico con la silueta de la pieza (el SVG se estira sin proporción, el mosaico no).
  const shapeMask = (path: string): CSSProperties => {
    const uri = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${path}'/></svg>`)}")`;
    return {
      maskImage: uri,
      WebkitMaskImage: uri,
      maskSize: "100% 100%",
      WebkitMaskSize: "100% 100%",
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
    };
  };

  const bodyFill: CSSProperties = tex
    ? { ...tileStyle, backgroundColor: colorTrasera }
    : usaImagen
    ? {
        backgroundImage: `url(${imagenSobreSrc})`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        backgroundColor: colorTrasera,
        backgroundBlendMode: modoFondo === "textura" ? "multiply" : "normal",
      }
    : { backgroundColor: colorTrasera };

  const fondoExteriorStyle: CSSProperties = exteriorSrc && !resources.failed.includes(exteriorSrc)
    ? {
        backgroundImage: `url(${exteriorSrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: fondoExteriorColor,
        backgroundBlendMode: "multiply",
      }
    : { backgroundColor: fondoExteriorColor };

  const isOpenOrLater = phase !== "closed";
  const isDescendingOrLater = phase === "descending" || phase === "zooming" || phase === "done";
  const flapRotation = isOpenOrLater ? -anguloMaximo : 0;

  // Muesca del frontal (rectángulo con el hueco triangular donde encaja la solapa,
  // con el pico redondeado) y triángulo de la solapa (mismo redondeo, en su propio
  // sistema de coordenadas local 0-100), calculados con la misma fracción de redondeo
  // para que ambas piezas encajen visualmente.
  const front = roundedApex(50, flapPct, 0, radioPico);
  const frontPath = `M0,100 L0,0 L${front.leftX},${front.y} Q50,${flapPct} ${front.rightX},${front.y} L100,0 L100,100 Z`;
  const flap = roundedApex(50, 100, 0, radioPico);
  const flapPath = `M0,0 L100,0 L${flap.rightX},${flap.y} Q50,100 ${flap.leftX},${flap.y} Z`;

  const descendTransform = modoDescenso !== "fade" && isDescendingOrLater ? "translateY(220%)" : "translateY(0%)";
  const descendOpacity = modoDescenso !== "desplazamiento" && isDescendingOrLater ? 0 : 1;

  const isFinalSize = fadeApertura || phase === "zooming" || phase === "done";

  // La portada no debe transparentarse a través del sobre cerrado.
  // Su geometría ya está medida antes de presentar la intro.
  const contentVisible = fadeApertura || phase !== "closed";

  // La portada se desplaza (sin escalar) para pasar de centrada a pegada arriba de su
  // hueco, y por separado se escala desde su propio centro; hacerlo en dos elementos
  // anidados evita que ambas transformaciones se compongan de forma no lineal.
  const contentOuterStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: contentVisible ? 1 : 0,
    transform: `translateY(${isFinalSize ? 0 : contentOffsetY}px)`,
    transition: phase === "closed" ? "none" : `transform ${duracionZoom}ms cubic-bezier(0.22,1,0.36,1), opacity ${reduceMotion ? 0 : 150}ms ease`,
  };

  const contentWrapperStyle: CSSProperties = {
    ...{ "--wedding-left": "0px", "--wedding-right": "0px" },
    position: "absolute",
    inset: 0,
    // Salvaguarda general por si el sitio real es más alto que un viewport; el exceso
    // respecto al sobre en sí lo tapa el rectángulo "cobertor", no este recorte.
    overflow: "hidden",
    transformOrigin: "50% 50%",
    transform: `scale(${isFinalSize ? 1 : contentScale})`,
    transition: phase === "closed" ? "none" : `transform ${duracionZoom}ms cubic-bezier(0.22,1,0.36,1)`,
    // "Papel apilado": dos sombras planas y desplazadas simulan hojas debajo de la
    // portada, más una sombra difusa para separación del fondo; dan sensación de grosor.
    boxShadow: fadeApertura ? "none" : [
      `calc(${lightDirection(direccionLuz).x * 1.6} * var(--wedding-vmin, 1vmin)) calc(${lightDirection(direccionLuz).y * 1.6} * var(--wedding-vmin, 1vmin)) 0 0 rgba(255,252,244,0.85)`,
      `calc(${lightDirection(direccionLuz).x * 3.2} * var(--wedding-vmin, 1vmin)) calc(${lightDirection(direccionLuz).y * 3.2} * var(--wedding-vmin, 1vmin)) 0 0 rgba(232,221,199,0.7)`,
      `calc(${lightDirection(direccionLuz).x * sombraDesenfoque / 2} * var(--wedding-vmin, 1vmin)) calc(${lightDirection(direccionLuz).y * sombraDesenfoque / 2} * var(--wedding-vmin, 1vmin)) calc(${sombraDesenfoque} * var(--wedding-vmin, 1vmin)) ${sombraColor}`,
    ].join(", "),
    pointerEvents: phase === "done" ? "auto" : "none",
  };

  // Bisel de la carta orientado hacia la misma luz que el sobre.
  const paperBevelStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    transformOrigin: "50% 50%",
    transform: contentWrapperStyle.transform,
    transition: contentWrapperStyle.transition,
    background: `linear-gradient(${90 - (config.direccionLuzGrados ?? 225)}deg, rgba(0,0,0,0.1), transparent 12%, transparent 88%, rgba(255,255,255,0.16))`,
    pointerEvents: "none",
  };

  const imagenMezclaStyle: CSSProperties | undefined = modoFondo === "textura"
    ? { mixBlendMode: "multiply" }
    : undefined;

  // Sombra sutil en el contorno recortado del papel (frontal/solapa), para dar
  // sensación de grosor; se aplica como filtro CSS (no SVG) para que no se distorsione
  // con el `preserveAspectRatio="none"` de los `<svg>` internos.
  const paperEdgeFilter = paperThicknessShadow(direccionLuz, intensidadGrosorPapel, colorGrosorPapel);
  const exteriorShadow = directionalShadow(direccionLuz, sombraDesenfoque / 2, sombraDesenfoque, sombraColor, intensidadSombraApertura);

  const restingShadows = openingShadows(isDescendingOrLater ? anguloMaximo : 0, direccionLuz, intensidadSombraApertura, sombraDesenfoque, colorSombraApertura);
  const aperturaShadowStyle: CSSProperties = {
    ...restingShadows.flap,
    opacity: isDescendingOrLater ? 0 : restingShadows.flap.opacity,
    transformOrigin: "50% 0%",
  };

  return (
    <div
      ref={viewportRef}
      className="wedding-fixed fixed inset-y-0 overflow-hidden"
      data-intro-state={ready ? "ready" : "loading"}
      data-intro-phase={phase}
      aria-busy={!ready}
      data-envelope-exit={config.modoSalidaSobre}
      style={{ ...(!ready ? { backgroundColor: "var(--wedding-loading-background, #F7F3EC)" } : {}), containerType: "size" }}
    >
      {!ready ? (
        <span role="status" className="sr-only">Preparando invitación...</span>
      ) : null}
      <div className="absolute inset-0" style={{ visibility: ready ? "visible" : "hidden", transitionProperty: "none" }} aria-hidden={!ready} inert={!ready}>
      {phase !== "done" ? <div data-envelope-layer className="absolute inset-0" style={{ ...fondoExteriorStyle, zIndex: fadeApertura ? 11 : 0 }} /> : null}
      {/* Trasera del sobre: rectángulo liso del mismo color, siempre detrás de la
          portada; desciende en sincronía con el frontal para que el sobre se retire
          como un conjunto único. */}
      {phase !== "done" ? (
        <div data-envelope-layer className={fadeApertura ? "z-[12]" : "z-0"} style={{ ...envelopeBoxStyle, pointerEvents: "none" }}>
          <div
            className="h-full w-full"
            style={{
              transform: descendTransform,
              opacity: descendOpacity,
              transition: `transform ${duracionDescenso}ms ease-in, opacity ${duracionDescenso}ms ease-in`,
            }}
          >
            <div data-envelope-body-shadow className="absolute inset-0" style={{ ...bodyFill, borderRadius: `calc(${radioEsquinas} * var(--wedding-vmin, 1vmin))`, filter: `${paperEdgeFilter} ${exteriorShadow}` }} />
          </div>
        </div>
      ) : null}

      {/* Portada real, siempre montada a tamaño natural; se ve reducida como una carta hasta el zoom final. */}
      <div ref={contentMotionRef} data-envelope-content className="z-10" style={contentOuterStyle}>
        <div ref={contentScaleRef} data-envelope-content-scale style={contentWrapperStyle} inert={phase !== "done"}>{ready ? children : null}</div>
        {!fadeApertura ? <div style={paperBevelStyle} /> : null}
      </div>

      {/* Proyección sobre la carta y la mesa, sincronizada con el ángulo de la solapa. */}
      {phase !== "done" ? (
        <div data-envelope-layer className="z-[35]" style={{ ...envelopeBoxStyle, pointerEvents: "none" }}>
          <div ref={shadowRef} data-envelope-flap-shadow className="absolute left-0 top-0 w-full" style={{ height: `${flapPct}%`, ...aperturaShadowStyle }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <path d={flapPath} fill={colorSombraApertura} />
            </svg>
          </div>
        </div>
      ) : null}

      {/* Cobertor: como ya no se recorta la portada, este rectángulo (del color de la
          mesa) tapa lo que sobra de portada por debajo del sobre; arranca justo en el
          borde inferior del sobre y desciende junto con él hasta dejarla ver entera. */}
      {phase !== "done" ? (
        <div data-envelope-layer className="z-[15]" style={{ ...envelopeBoxStyle, pointerEvents: "none" }}>
          <div
            className="h-full w-full"
            style={{
              transform: descendTransform,
              opacity: descendOpacity,
              transition: `transform ${duracionDescenso}ms ease-in, opacity ${duracionDescenso}ms ease-in`,
            }}
          >
            <div className="absolute left-0 top-full w-full" style={{ height: "200vh", ...fondoExteriorStyle }} />
          </div>
        </div>
      ) : null}

      {/* Solapa y lacre comparten eje; su grupo queda por encima del frontal al abrir. */}
      {phase !== "done" ? (
        <div data-envelope-layer style={{ ...envelopeBoxStyle, zIndex: isDescendingOrLater ? 0 : 40, pointerEvents: "none" }}>
          <div
            className="h-full w-full"
            style={{
              transform: descendTransform,
              opacity: descendOpacity,
              transition: `transform ${duracionDescenso}ms ease-in, opacity ${duracionDescenso}ms ease-in`,
            }}
          >
            <div className="relative h-full w-full" style={{ perspective: "calc(180 * var(--wedding-vmin, 1vmin))" }}>
              <div
                className="absolute left-0 top-0 w-full origin-top"
                style={{
                  height: `${flapPct}%`,
                  borderTopLeftRadius: `calc(${radioEsquinas} * var(--wedding-vmin, 1vmin))`,
                  borderTopRightRadius: `calc(${radioEsquinas} * var(--wedding-vmin, 1vmin))`,
                  overflow: "visible",
                }}
              >
                <div
                  ref={flapRef}
                  data-envelope-flap
                  className="h-full w-full origin-top"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `rotateX(${flapRotation}deg)`,
                    borderTopLeftRadius: "inherit",
                    borderTopRightRadius: "inherit",
                  }}
                >
                  {/* Cara frontal de la solapa */}
                  <div ref={flapExteriorRef} data-envelope-flap-edge className="absolute inset-0" style={{ backfaceVisibility: "hidden", borderTopLeftRadius: "inherit", borderTopRightRadius: "inherit", filter: paperThicknessShadow(direccionLuz, intensidadGrosorPapel, colorGrosorPapel, isDescendingOrLater ? anguloMaximo : 0) }}>
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                    style={{ borderTopLeftRadius: "inherit", borderTopRightRadius: "inherit" }}
                  >
                    {usaImagen ? (
                      <defs>
                        <clipPath id={`${patternId}-flap-clip`}>
                          <path d={flapPath} />
                        </clipPath>
                      </defs>
                    ) : null}
                    <path d={flapPath} fill={colorTrasera} />
                    {usaImagen ? (
                      <image
                        href={imagenSobreSrc}
                        width={100}
                        height={10000 / flapPct}
                        preserveAspectRatio="none"
                        clipPath={`url(#${patternId}-flap-clip)`}
                        style={imagenMezclaStyle}
                      />
                    ) : null}
                  </svg>
                  {tex ? (
                      <div
                        className="absolute inset-0"
                        style={{ ...tileStyle, ...shapeMask(flapPath), backfaceVisibility: "hidden", borderTopLeftRadius: `calc(${radioEsquinas} * var(--wedding-vmin, 1vmin))`, borderTopRightRadius: `calc(${radioEsquinas} * var(--wedding-vmin, 1vmin))` }}
                      />
                  ) : null}
                  {dryStampSrc ? (
                    <div
                      data-envelope-dry-stamp
                      className="absolute inset-0"
                      aria-hidden="true"
                      style={{
                        ...shapeMask(flapPath),
                        backfaceVisibility: "hidden",
                        pointerEvents: "none",
                        // La mezcla se aplica fuera del contexto aislado de la mascara para alcanzar el papel.
                        mixBlendMode: stampStatus?.src === dryStampSrc && stampStatus.image ? config.selloSecoMezclaImagen ?? "overlay" : "normal",
                      }}
                    >
                      <div
                        className="absolute aspect-square"
                        style={{
                          width: `${Math.min(40, Math.max(5, config.selloSecoTamanoPorcentaje ?? 18))}%`,
                          left: `${Math.min(100, Math.max(0, config.selloSecoXPorcentaje ?? 50))}%`,
                          top: `${Math.min(100, Math.max(0, config.selloSecoYPorcentaje ?? 35))}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <EnvelopeDryStamp
                          key={dryStampSrc}
                          src={dryStampSrc}
                          svgRelief={config.selloSecoRelieveSvg ?? false}
                          reduceMotion={reduceMotion}
                          onStatus={setStampStatus}
                        />
                      </div>
                    </div>
                  ) : null}
                  </div>
                  {/* Cara interior de la solapa, visible al girar más de 90º */}
                  <div
                    ref={flapInteriorRef}
                    data-envelope-flap-inner-edge
                    className="absolute inset-0"
                    style={{
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                      filter: paperThicknessShadow(Math.PI - direccionLuz, intensidadGrosorPapel, colorGrosorPapel, isDescendingOrLater ? anguloMaximo : 0),
                    }}
                  >
                    <div className="absolute inset-0" style={{ backgroundColor: colorSolapaInterior, ...shapeMask(flapPath) }} />
                  </div>
                  {sealSlot ? (
                    <div
                      data-envelope-seal
                      className="absolute aspect-square"
                      style={{
                        width: `calc(${sealSize} * min(1cqw, 1cqh))`,
                        left: "50%",
                        top: "100%",
                        transform: "translate(-50%, -50%) translateZ(1px)",
                        backfaceVisibility: "hidden",
                        pointerEvents: phase === "closed" ? "auto" : "none",
                      }}
                      inert={phase !== "closed"}
                    >
                      <div ref={sealRef} data-envelope-seal-shadow className="h-full w-full" style={restingShadows.seal}>
                        {sealSlot}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Frontal del sobre: su sombra sigue la silueta completa, incluida la textura. */}
      {phase !== "done" ? (
        <div data-envelope-layer className="z-30" style={{ ...envelopeBoxStyle, pointerEvents: "none" }}>
          <div
            ref={frontMotionRef}
            data-envelope-front-motion
            className="h-full w-full"
            style={{
              transform: descendTransform,
              opacity: descendOpacity,
              transition: `transform ${duracionDescenso}ms ease-in, opacity ${duracionDescenso}ms ease-in`,
            }}
          >
            <div
              data-envelope-front-edge
              className="absolute inset-0"
              style={{
                borderRadius: `calc(${radioEsquinas} * var(--wedding-vmin, 1vmin))`,
                filter: paperEdgeFilter,
              }}
            >
              <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                {usaImagen ? (
                  <defs>
                    <clipPath id={`${patternId}-front-clip`}>
                      <path d={frontPath} />
                    </clipPath>
                  </defs>
                ) : null}
                <path d={frontPath} fill={colorBase} />
                {usaImagen ? (
                  <image
                    href={imagenSobreSrc}
                    width={100}
                    height={100}
                    preserveAspectRatio="none"
                    clipPath={`url(#${patternId}-front-clip)`}
                    style={imagenMezclaStyle}
                  />
                ) : null}
              </svg>
              {tex ? <div className="absolute inset-0" style={{ ...tileStyle, ...shapeMask(frontPath) }} /> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      </div>
      {ready && (resources.failed.length > 0 || stampFailed) && phase === "closed" ? (
        <p role="status" className="absolute inset-x-0 bottom-2 text-center text-xs opacity-60" style={{ color: colorGrosorPapel }}>
          {stampFailed ? "No se pudo cargar el sello seco." : "No se pudieron cargar algunos recursos de la invitación."}
        </p>
      ) : null}
    </div>
  );
}
