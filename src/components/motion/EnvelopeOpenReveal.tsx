"use client";

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
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

/**
 * Ancho/alto reales de la ventana. Solo se necesita en modo de relación de
 * aspecto "fijo": el propio recuadro del sobre puede dimensionarse con CSS
 * puro (`min()`/`aspect-ratio`), pero la portada se escala con `transform:
 * scale()` sobre un elemento a tamaño de ventana, y ese factor de escala debe
 * ser un número (no se puede dividir una longitud CSS entre otra en calc()),
 * así que aquí sí hace falta medir la ventana.
 */
function useViewportSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
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
export default function EnvelopeOpenReveal({ config, fondo, sealBroken, sealSlot, onComplete, children }: EnvelopeOpenRevealProps) {
  const [phase, setPhase] = useState<Phase>("closed");
  const patternId = useId();
  const viewport = useViewportSize();

  const modoFondo = config.modoFondo ?? "colores";
  const colorBase = config.colorBase || "#e8ddc7";
  // Color de la trasera y la cara exterior de la solapa: son la misma pieza de papel,
  // por eso comparten color, independiente del color del frontal.
  const colorTrasera = config.colorTrasera || colorBase;
  const colorBorde = config.colorBorde || "#a9895f";
  const grosorBorde = Math.max(0, config.grosorBordePorcentaje ?? 0.6);
  const radioEsquinas = Math.max(0, config.radioEsquinasPorcentaje ?? 2);
  const colorSolapaInterior = config.colorSolapaInterior || "#c9b48c";
  const colorCostura = config.colorCostura || "#8a6a44";
  const sombraColor = config.sombraColor || "rgba(0,0,0,0.35)";
  const sombraDesenfoque = Math.max(0, config.sombraDesenfoquePorcentaje ?? 3);
  const flapPct = Math.min(70, Math.max(20, config.alturaSolapaPorcentaje ?? 42));
  const radioPico = Math.min(50, Math.max(0, config.radioPicoSolapaPorcentaje ?? 10)) / 100;
  const usaImagen = modoFondo !== "colores" && Boolean(config.imagenUrl);

  const margenPantalla = Math.min(40, Math.max(0, config.margenPantallaPorcentaje ?? 6));
  const margenContenido = Math.min(40, Math.max(0, config.margenContenidoPorcentaje ?? 4));
  const fondoExteriorColor = config.fondoExteriorColor || fondo || "#2E1F0E";
  const modoDescenso = config.modoDescensoSobre ?? "desplazamiento";
  const modoAspecto = config.modoAspectoSobre ?? "automatico";
  const aspectoAncho = Math.max(0.1, config.aspectoAnchoSobre ?? 3);
  const aspectoAlto = Math.max(0.1, config.aspectoAltoSobre ?? 2);
  const aspectRatio = aspectoAncho / aspectoAlto;
  const duracionApertura = Math.max(300, config.duracionAperturaMs ?? 900);
  const duracionDescenso = Math.max(300, config.duracionDescensoMs ?? 700);
  const duracionZoom = Math.max(300, config.duracionZoomMs ?? 900);

  // Factor de escala = 1 - 2 * (margen / 100): al aplicarse desde el centro
  // de un elemento que ocupa el 100% del área, deja exactamente ese margen (%)
  // a cada lado, sin necesitar medir nada del DOM. Se usa en modo "automático".
  const envelopeScale = 1 - (margenPantalla * 2) / 100;
  const contentScaleAutomatico = 1 - ((margenPantalla + margenContenido) * 2) / 100;

  // Recuadro del sobre en modo "fijo": ancho = min(ancho disponible, alto disponible
  // * relación), lo que reproduce exactamente un ajuste "contain" con margen mínimo
  // en los 4 lados y el sobrante repartido en el eje más corto, sin medir el DOM.
  const margenDisponiblePct = 100 - margenPantalla * 2;
  const envelopeFixedWidthExpr = `min(calc(${margenDisponiblePct} * 1vw), calc(${margenDisponiblePct} * ${aspectRatio} * 1vh))`;

  const envelopeBoxStyle: CSSProperties =
    modoAspecto === "fijo"
      ? { position: "fixed", left: "50%", top: "50%", width: envelopeFixedWidthExpr, aspectRatio: `${aspectRatio}`, transform: "translate(-50%, -50%)" }
      : { position: "fixed", inset: 0, transformOrigin: "50% 50%", transform: `scale(${envelopeScale})` };

  // La portada se ajusta SIEMPRE al ancho disponible (sobre menos su margen); el alto
  // que sobre respecto al sobre se recorta (no se ve), en vez de encogerla más para
  // que quepa entera. Como el factor de escala es un número (no se puede dividir una
  // longitud CSS entre otra en calc()), y la portada debe quedar pegada arriba dentro
  // de su hueco (no centrada), esto necesita medir la ventana real.
  let contentScale = contentScaleAutomatico;
  let contentOffsetY = 0;
  let contentBottomClipPx = 0;
  if (viewport.width > 0 && viewport.height > 0) {
    const [envAncho, envAlto] =
      modoAspecto === "fijo"
        ? (() => {
            const availW = viewport.width * (margenDisponiblePct / 100);
            const availH = viewport.height * (margenDisponiblePct / 100);
            const w = Math.min(availW, availH * aspectRatio);
            return [w, w / aspectRatio];
          })()
        : [viewport.width * envelopeScale, viewport.height * envelopeScale];

    const contentTargetW = envAncho * (1 - (margenContenido * 2) / 100);
    const contentTargetH = envAlto * (1 - (margenContenido * 2) / 100);
    contentScale = contentTargetW / viewport.width;

    // Posición (en píxeles reales) del borde superior del hueco de la portada dentro
    // del sobre, y la que tendría la portada si solo se centrara con `scale()`; la
    // diferencia es el desplazamiento vertical extra que hay que aplicarle para que
    // arranque pegada arriba en vez de centrada.
    const envTop = (viewport.height - envAlto) / 2;
    const targetTop = envTop + envAlto * (margenContenido / 100);
    const naturalTop = (viewport.height * (1 - contentScale)) / 2;
    contentOffsetY = targetTop - naturalTop;

    // Alto (en el sistema de coordenadas local, previo al `scale()`) que le sobra a la
    // portada respecto al hueco disponible; se recorta con `clip-path` para que no se vea.
    const neededLocalHeight = contentTargetH / contentScale;
    contentBottomClipPx = Math.max(0, viewport.height - neededLocalHeight);
  }

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
        backgroundColor: colorTrasera,
        backgroundBlendMode: modoFondo === "textura" ? "multiply" : "normal",
      }
    : { backgroundColor: colorTrasera };

  const fondoExteriorStyle: CSSProperties = config.fondoExteriorImagenUrl
    ? {
        backgroundImage: `url(${config.fondoExteriorImagenUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: fondoExteriorColor,
        backgroundBlendMode: "multiply",
      }
    : { backgroundColor: fondoExteriorColor };

  const isOpenOrLater = phase !== "closed";
  const isDescendingOrLater = phase === "descending" || phase === "zooming" || phase === "done";
  // Un poco menos de -180° (en vez de p.ej. -172°) para que la solapa quede
  // extendida hacia arriba, mostrando su cara interior, en vez de desaparecer
  // de canto a medio camino.
  const flapRotation = isOpenOrLater ? -179 : 0;
  const sealVisible = phase === "closed";

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

  const isFinalSize = phase === "zooming" || phase === "done";

  // La portada se desplaza (sin escalar) para pasar de centrada a pegada arriba de su
  // hueco, y por separado se escala desde su propio centro; hacerlo en dos elementos
  // anidados evita que ambas transformaciones se compongan de forma no lineal.
  const contentOuterStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    transform: `translateY(${isFinalSize ? 0 : contentOffsetY}px)`,
    transition: `transform ${duracionZoom}ms cubic-bezier(0.22,1,0.36,1)`,
  };

  const contentWrapperStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    // Recorta el alto que le sobre a la portada respecto al hueco del sobre (en vez de
    // encogerla más para que quepa entera): así siempre se ajusta al ancho disponible.
    overflow: "hidden",
    clipPath: isFinalSize ? undefined : `inset(0px 0px ${contentBottomClipPx}px 0px)`,
    transformOrigin: "50% 50%",
    transform: `scale(${isFinalSize ? 1 : contentScale})`,
    transition: `transform ${duracionZoom}ms cubic-bezier(0.22,1,0.36,1), clip-path ${duracionZoom}ms cubic-bezier(0.22,1,0.36,1)`,
    // "Papel apilado": dos sombras planas y desplazadas simulan hojas debajo de la
    // portada, más una sombra difusa para separación del fondo; dan sensación de grosor.
    boxShadow: [
      "1.4vmin 1.6vmin 0 0 rgba(255,252,244,0.85)",
      "2.8vmin 3.2vmin 0 0 rgba(232,221,199,0.7)",
      `0 ${sombraDesenfoque / 2}vmin ${sombraDesenfoque}vmin rgba(0,0,0,0.4)`,
    ].join(", "),
    pointerEvents: phase === "done" ? "auto" : "none",
  };

  // Reborde sutil (claro arriba-izq., oscuro abajo-der.) para insinuar el bisel del papel.
  const paperBevelStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    transformOrigin: "50% 50%",
    transform: contentWrapperStyle.transform,
    transition: contentWrapperStyle.transition,
    background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 12%, rgba(0,0,0,0) 88%, rgba(0,0,0,0.1) 100%)",
    pointerEvents: "none",
  };

  const patternFillProps = (fillId: string, baseColor: string) =>
    usaImagen
      ? {
          fill: `url(#${fillId})`,
          style: modoFondo === "textura" ? ({ mixBlendMode: "multiply" } as CSSProperties) : undefined,
        }
      : { fill: baseColor };

  return (
    // `fixed inset-0` (en vez de heredar el tamaño del contenedor padre) garantiza que
    // el sobre y la portada usen siempre el mismo marco de referencia (la ventana real);
    // si el padre las dimensiona de forma distinta (p. ej. por padding o flex), la portada
    // queda visible fuera del área del sobre.
    <div className="fixed inset-0 overflow-hidden" style={fondoExteriorStyle}>
      {/* Trasera del sobre: rectángulo liso del mismo color, siempre detrás de la
          portada; desciende en sincronía con el frontal para que el sobre se retire
          como un conjunto único. */}
      {phase !== "done" ? (
        <div className="z-0" style={{ ...envelopeBoxStyle, pointerEvents: "none" }}>
          <div
            className="h-full w-full"
            style={{
              transform: descendTransform,
              opacity: descendOpacity,
              transition: `transform ${duracionDescenso}ms ease-in, opacity ${duracionDescenso}ms ease-in`,
            }}
          >
            <div className="absolute inset-0" style={{ ...bodyFill, borderRadius: `${radioEsquinas}vmin` }} />
          </div>
        </div>
      ) : null}

      {/* Portada real, siempre montada a tamaño natural; se ve reducida como una carta hasta el zoom final. */}
      <div className="z-10" style={contentOuterStyle}>
        <div style={contentWrapperStyle}>{children}</div>
        <div style={paperBevelStyle} />
      </div>

      {/* Solapa: por delante de la portada mientras está cerrada/abriéndose (también
          extendida hacia arriba, fuera del área de la portada); en cuanto termina de
          abrirse pasa a la misma capa que la trasera (detrás de la portada) y desciende
          junto con ella y el frontal, como un conjunto único. */}
      {phase !== "done" ? (
        <div style={{ ...envelopeBoxStyle, zIndex: isDescendingOrLater ? 0 : 20, pointerEvents: "none" }}>
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
                className="absolute left-0 top-0 w-full origin-top"
                style={{
                  height: `${flapPct}%`,
                  borderTopLeftRadius: `${radioEsquinas}vmin`,
                  borderTopRightRadius: `${radioEsquinas}vmin`,
                  // Solo se recorta con el sobre cerrado (para redondear las esquinas
                  // superiores a juego con el sobre); si se recorta también al abrirse,
                  // la solapa no puede extenderse hacia arriba y parece desaparecer.
                  overflow: phase === "closed" ? "hidden" : "visible",
                }}
              >
                <div
                  className="h-full w-full origin-top"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `rotateX(${flapRotation}deg)`,
                    transition: `transform ${duracionApertura}ms cubic-bezier(0.22,1,0.36,1)`,
                  }}
                >
                  {/* Cara frontal de la solapa */}
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ backfaceVisibility: "hidden" }}>
                    {usaImagen ? (
                      <defs>
                        <pattern id={`${patternId}-flap`} patternUnits="objectBoundingBox" width={1} height={1}>
                          <image href={config.imagenUrl} width={100} height={100} preserveAspectRatio="xMidYMid slice" />
                        </pattern>
                      </defs>
                    ) : null}
                    <path d={flapPath} {...patternFillProps(`${patternId}-flap`, colorTrasera)} />
                    <path
                      d={flapPath}
                      fill="none"
                      style={{ stroke: colorCostura, strokeWidth: "0.35vmin", vectorEffect: "non-scaling-stroke" } as CSSProperties}
                    />
                  </svg>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Frontal del sobre: por delante de la portada; desciende junto con la trasera
          y la solapa para que el sobre se retire como un conjunto único. La sombra
          exterior solo existe con el sobre cerrado: al empezar a abrirse desaparece,
          para no barrer la portada mientras el frontal desciende. */}
      {phase !== "done" ? (
        <div className="z-30" style={{ ...envelopeBoxStyle, pointerEvents: "none" }}>
          <div
            className="h-full w-full"
            style={{
              transform: descendTransform,
              opacity: descendOpacity,
              transition: `transform ${duracionDescenso}ms ease-in, opacity ${duracionDescenso}ms ease-in`,
            }}
          >
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: `${radioEsquinas}vmin`,
                // El borde y la sombra solo existen con el sobre cerrado: el frontal es
                // una sola pieza y, al desplazarse, arrastraría ambos por encima del
                // contenido si siguieran pintándose mientras desciende.
                boxShadow:
                  phase === "closed"
                    ? [
                        grosorBorde > 0 ? `inset 0 0 0 ${grosorBorde}vmin ${colorBorde}` : null,
                        `0 ${sombraDesenfoque / 2}vmin ${sombraDesenfoque}vmin ${sombraColor}`,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : undefined,
              }}
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                {usaImagen ? (
                  <defs>
                    <pattern id={`${patternId}-front`} patternUnits="objectBoundingBox" width={1} height={1}>
                      <image href={config.imagenUrl} width={100} height={100} preserveAspectRatio="xMidYMid slice" />
                    </pattern>
                  </defs>
                ) : null}
                <path d={frontPath} {...patternFillProps(`${patternId}-front`, colorBase)} />
              </svg>
            </div>
          </div>
        </div>
      ) : null}

      {/* Lacre: capa independiente con su propio z-index de nivel superior, para
          quedar siempre por encima del frontal. Anidarlo dentro del grupo de la
          solapa (z-20) lo limitaba a ese contexto de apilamiento y quedaba por
          debajo del frontal (z-30) aunque tuviera un z-index local más alto. */}
      {phase !== "done" && sealSlot ? (
        <div className="z-50" style={{ ...envelopeBoxStyle, pointerEvents: "none" }}>
          <div
            className="absolute aspect-square w-[clamp(6rem,20vmin,12rem)]"
            style={{
              left: "50%",
              top: `${flapPct}%`,
              transform: "translate(-50%, -50%)",
              opacity: sealVisible ? 1 : 0,
              transition: "opacity 250ms ease",
              pointerEvents: sealVisible ? "auto" : "none",
            }}
          >
            {sealSlot}
          </div>
        </div>
      ) : null}
    </div>
  );
}
