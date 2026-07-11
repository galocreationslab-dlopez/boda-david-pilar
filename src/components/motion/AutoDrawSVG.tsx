"use client";

// TODO: Antes de permitir subida de SVGs desde admin, sanitizar el contenido (riesgo XSS)
// con DOMPurify (perfil SVG) para bloquear <script> y atributos inline tipo onload/onclick.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

export const MAX_ELEMENTOS_INDIVIDUALES = 60;

const DRAWABLE_SELECTOR = "path,line,circle,ellipse,polyline,polygon";
const DEFAULT_STAGGER_MS = 80;
const DEFAULT_DURATION_MS = 900;

export type AutoDrawSVGProps = {
  svgSource: string;
  strokeColorOverride?: string;
  staggerMs?: number;
  durationMs?: number;
  sequential?: boolean;
  onComplete?: () => void;
  respectReducedMotion?: boolean;
};

export type AutoDrawSVGHandle = {
  restart: () => void;
  pause: () => void;
  play: () => void;
};

type DrawUnit = {
  root: Element;
  strokes: SVGGraphicsElement[];
  fills: SVGGraphicsElement[];
  domIndex: number;
  order: number | null;
};

function isInlineSvg(source: string): boolean {
  const trimmed = source.trim();
  return trimmed.startsWith("<svg") || trimmed.startsWith("<?xml");
}

function isDrawableElement(el: Element): el is SVGGraphicsElement {
  return el.matches(DRAWABLE_SELECTOR);
}

function parseDataOrder(el: Element): number | null {
  const raw = el.getAttribute("data-orden");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePoints(points: string): Array<{ x: number; y: number }> {
  const tokens = points
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < tokens.length - 1; i += 2) {
    result.push({ x: tokens[i], y: tokens[i + 1] });
  }
  return result;
}

function polylineLength(points: Array<{ x: number; y: number }>, closePath: boolean): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.hypot(dx, dy);
  }
  if (closePath) {
    const dx = points[0].x - points[points.length - 1].x;
    const dy = points[0].y - points[points.length - 1].y;
    total += Math.hypot(dx, dy);
  }
  return total;
}

function getElementLength(el: SVGGraphicsElement): number {
  const geometryEl = el as SVGGeometryElement;
  if (typeof geometryEl.getTotalLength === "function") {
    try {
      const value = geometryEl.getTotalLength();
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    } catch {
      // Si falla getTotalLength en runtime, usamos el fallback manual por tipo.
    }
  }

  if (el instanceof SVGLineElement) {
    const x1 = Number(el.getAttribute("x1") ?? "0");
    const y1 = Number(el.getAttribute("y1") ?? "0");
    const x2 = Number(el.getAttribute("x2") ?? "0");
    const y2 = Number(el.getAttribute("y2") ?? "0");
    return Math.hypot(x2 - x1, y2 - y1);
  }

  if (el instanceof SVGCircleElement) {
    const r = Number(el.getAttribute("r") ?? "0");
    return 2 * Math.PI * r;
  }

  if (el instanceof SVGEllipseElement) {
    const rx = Number(el.getAttribute("rx") ?? "0");
    const ry = Number(el.getAttribute("ry") ?? "0");
    // Aproximacion de Ramanujan para la longitud de una elipse.
    const h = ((rx - ry) ** 2) / ((rx + ry) ** 2 || 1);
    return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(Math.max(0, 4 - 3 * h))));
  }

  if (el instanceof SVGPolylineElement) {
    return polylineLength(parsePoints(el.getAttribute("points") ?? ""), false);
  }

  if (el instanceof SVGPolygonElement) {
    return polylineLength(parsePoints(el.getAttribute("points") ?? ""), true);
  }

  return 1;
}

function classifyElement(el: SVGGraphicsElement): { isStroke: boolean; isFill: boolean } {
  const fillAttr = (el.getAttribute("fill") ?? el.style.fill ?? "").trim();
  const strokeAttr = (el.getAttribute("stroke") ?? el.style.stroke ?? "").trim();

  const fillExplicitNone = fillAttr.toLowerCase() === "none";
  const fillExplicitSolid =
    fillAttr.length > 0 && !fillExplicitNone && !fillAttr.toLowerCase().startsWith("url(");
  const hasStroke =
    strokeAttr.length > 0 && strokeAttr.toLowerCase() !== "none" && strokeAttr.toLowerCase() !== "transparent";

  // Fill implicito: si no hay atributo fill NI stroke, el valor por defecto del
  // spec SVG es fill negro solido. Sin esto, un <path> exportado sin estilos
  // inline (ej. un logo) no se clasifica como nada y queda estatico desde el
  // primer frame, sin animar.
  const impliesSolidFill = fillAttr.length === 0 && !hasStroke;

  // Regla trazo/relleno (revisada):
  // - TRAZO: tiene stroke definido, independientemente de si ademas tiene fill.
  // - RELLENO: tiene fill solido explicito, o no tiene ningun atributo de pintura
  //   (fill implicito por defecto del spec SVG).
  // Un elemento puede ser TRAZO y RELLENO a la vez (ej. una forma con borde y
  // relleno de color): primero se dibuja su contorno, despues aparece el relleno.
  // Por eso ya no son mutuamente excluyentes como en la primera version.
  return {
    isStroke: hasStroke,
    isFill: fillExplicitSolid || impliesSolidFill,
  };
}

function collectUnits(root: SVGSVGElement): DrawUnit[] {
  const units: DrawUnit[] = [];

  // Agrupacion por <g data-grupo="...">: tratamos el grupo como unidad indivisible.
  function walk(element: Element) {
    const children = Array.from(element.children);
    for (const child of children) {
      if (child.matches("g[data-grupo]")) {
        const drawables = Array.from(child.querySelectorAll(DRAWABLE_SELECTOR)).filter(isDrawableElement);
        const strokes: SVGGraphicsElement[] = [];
        const fills: SVGGraphicsElement[] = [];

        for (const drawable of drawables) {
          const kind = classifyElement(drawable);
          if (kind.isStroke) strokes.push(drawable);
          if (kind.isFill) fills.push(drawable);
        }

        units.push({
          root: child,
          strokes,
          fills,
          domIndex: units.length,
          order: parseDataOrder(child),
        });
        continue;
      }

      if (isDrawableElement(child)) {
        const kind = classifyElement(child);
        units.push({
          root: child,
          strokes: kind.isStroke ? [child] : [],
          fills: kind.isFill ? [child] : [],
          domIndex: units.length,
          order: parseDataOrder(child),
        });
        continue;
      }

      walk(child);
    }
  }

  walk(root);
  return units;
}

function applyAutomaticBatching(units: DrawUnit[], totalDrawables: number): DrawUnit[] {
  if (totalDrawables <= MAX_ELEMENTOS_INDIVIDUALES) return units;

  const batchFactor = Math.ceil(totalDrawables / MAX_ELEMENTOS_INDIVIDUALES);
  const batchSize = Math.max(2, batchFactor);
  const batched: DrawUnit[] = [];

  // Cuando hay demasiados nodos, agrupamos por cercania en DOM (bloques consecutivos).
  for (let i = 0; i < units.length; i += batchSize) {
    const slice = units.slice(i, i + batchSize);
    batched.push({
      root: slice[0].root,
      strokes: slice.flatMap((unit) => unit.strokes),
      fills: slice.flatMap((unit) => unit.fills),
      domIndex: slice[0].domIndex,
      order: slice.find((unit) => unit.order !== null)?.order ?? null,
    });
  }

  return batched;
}

export function useAutoDrawControls() {
  const ref = useRef<AutoDrawSVGHandle | null>(null);

  const restart = useCallback(() => {
    ref.current?.restart();
  }, []);

  const pause = useCallback(() => {
    ref.current?.pause();
  }, []);

  const play = useCallback(() => {
    ref.current?.play();
  }, []);

  return useMemo(
    () => ({
      autoDrawRef: ref,
      restart,
      pause,
      play,
    }),
    [pause, play, restart],
  );
}

export const AutoDrawSVG = forwardRef<AutoDrawSVGHandle, AutoDrawSVGProps>(function AutoDrawSVG(
  {
    svgSource,
    strokeColorOverride,
    staggerMs = DEFAULT_STAGGER_MS,
    durationMs = DEFAULT_DURATION_MS,
    sequential = true,
    onComplete,
    respectReducedMotion = true,
  },
  ref,
) {
  const isInline = useMemo(() => isInlineSvg(svgSource), [svgSource]);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(() => (isInline ? svgSource : null));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationsRef = useRef<Animation[]>([]);
  const timersRef = useRef<number[]>([]);
  const [restartTick, setRestartTick] = useState(0);

  const clearRunningAnimations = useCallback(() => {
    for (const animation of animationsRef.current) {
      animation.cancel();
    }
    animationsRef.current = [];
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    timersRef.current = [];
  }, []);

  const restart = useCallback(() => {
    setRestartTick((value) => value + 1);
  }, []);

  const pause = useCallback(() => {
    for (const animation of animationsRef.current) {
      animation.pause();
    }
  }, []);

  const play = useCallback(() => {
    for (const animation of animationsRef.current) {
      animation.play();
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      restart,
      pause,
      play,
    }),
    [pause, play, restart],
  );

  useEffect(() => {
    let isCancelled = false;

    if (isInline) {
      setSvgMarkup(svgSource);
      return () => {
        isCancelled = true;
      };
    }

    const run = async () => {
      try {
        const response = await fetch(svgSource, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`No se pudo cargar el SVG (${response.status})`);
        }
        const markup = await response.text();
        if (!isCancelled) {
          setSvgMarkup(markup);
        }
      } catch {
        if (!isCancelled) {
          setSvgMarkup(null);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [isInline, svgSource]);

  useEffect(() => {
    if (!svgMarkup || !containerRef.current) return;

    clearRunningAnimations();

    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    const allDrawables = Array.from(svgEl.querySelectorAll(DRAWABLE_SELECTOR)).filter(isDrawableElement);

    if (strokeColorOverride) {
      for (const drawable of allDrawables) {
        const strokeValue = (drawable.getAttribute("stroke") ?? drawable.style.stroke ?? "").trim().toLowerCase();
        if (strokeValue && strokeValue !== "none") {
          drawable.setAttribute("stroke", strokeColorOverride);
        }
      }
    }

    // Reduced motion: mostramos resultado final sin animaciones, respetando accesibilidad.
    if (respectReducedMotion && typeof window !== "undefined") {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        for (const drawable of allDrawables) {
          drawable.style.opacity = "1";
          drawable.style.fillOpacity = "1";
          drawable.style.strokeDasharray = "";
          drawable.style.strokeDashoffset = "";
        }
        onComplete?.();
        return;
      }
    }

    const rawUnits = collectUnits(svgEl);
    const units = applyAutomaticBatching(rawUnits, allDrawables.length);

    const withOrder = units.map((unit, index) => ({
      ...unit,
      domIndex: index,
      order: unit.order,
    }));

    const orderedUnits = [...withOrder].sort((a, b) => {
      if (a.order !== null && b.order !== null) {
        if (a.order === b.order) return a.domIndex - b.domIndex;
        return a.order - b.order;
      }
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.domIndex - b.domIndex;
    });

    let timelineEnd = 0;

    for (let i = 0; i < orderedUnits.length; i += 1) {
      const unit = orderedUnits[i];
      const startDelay = sequential ? i * (durationMs + staggerMs) : i * staggerMs;

      for (const fillEl of unit.fills) {
        // Ocultamos solo el canal de relleno (fill-opacity), nunca la opacidad
        // completa del elemento: si el mismo nodo es tambien trazo, el trazo debe
        // seguir siendo visible mientras se dibuja, aunque el relleno este oculto.
        // Usar "opacity" aqui era el bug: apagaba tambien el trazo en curso.
        fillEl.style.fillOpacity = "0";
      }

      let hasStrokeAnimation = false;

      for (const strokeEl of unit.strokes) {
        const length = Math.max(1, getElementLength(strokeEl));
        strokeEl.style.strokeDasharray = `${length}`;
        strokeEl.style.strokeDashoffset = `${length}`;

        const animation = strokeEl.animate(
          [{ strokeDashoffset: `${length}` }, { strokeDashoffset: "0" }],
          {
            duration: Math.max(120, durationMs),
            delay: Math.max(0, startDelay),
            easing: "ease-in-out",
            fill: "forwards",
          },
        );
        animationsRef.current.push(animation);
        hasStrokeAnimation = true;
      }

      const fillDelay = startDelay + (hasStrokeAnimation ? Math.max(120, durationMs) : 0);
      for (const fillEl of unit.fills) {
        const animation = fillEl.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], {
          duration: Math.max(180, Math.round(durationMs * 0.35)),
          delay: Math.max(0, fillDelay),
          easing: "ease-out",
          fill: "forwards",
        });
        animationsRef.current.push(animation);
      }

      const unitEnd = fillDelay + Math.max(180, Math.round(durationMs * 0.35));
      timelineEnd = Math.max(timelineEnd, unitEnd);
    }

    if (onComplete) {
      const timer = window.setTimeout(() => {
        onComplete();
      }, Math.max(0, timelineEnd + 30));
      timersRef.current.push(timer);
    }

    return () => {
      clearRunningAnimations();
    };
  }, [
    clearRunningAnimations,
    durationMs,
    onComplete,
    respectReducedMotion,
    restartTick,
    sequential,
    staggerMs,
    strokeColorOverride,
    svgMarkup,
  ]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", display: "inline-block", lineHeight: 0 }}
      dangerouslySetInnerHTML={svgMarkup ? { __html: svgMarkup } : undefined}
    />
  );
});

export default AutoDrawSVG;
