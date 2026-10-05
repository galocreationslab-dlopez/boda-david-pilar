"use client";

import { useCallback, useEffect, useSyncExternalStore, useState, type CSSProperties, type ReactNode } from "react";
import { IntroProvider } from "@/contexts/IntroContext";
import AutoDrawSVG, { parseNativeSvgAnimations, svgMarkupHandlesClick, type NativeSvgAnimationOption } from "@/components/motion/AutoDrawSVG";
import IntroAnimationStage from "@/components/motion/IntroAnimationStage";
import EnvelopeOpenReveal, { type EnvelopeTexture } from "@/components/motion/EnvelopeOpenReveal";
import { useDeviceViewport } from "@/components/motion/useDeviceViewport";
import { resolveDriveMediaSrc } from "@/lib/drive-image";
import { normalizeIntroConfig, type IntroDeviceConfig, type IntroSeccionConfig } from "@/config/wedding.config";

const DEFAULT_LACRE = "/images/Sello.svg";
const DEFAULT_DEVICE_CONFIG: IntroDeviceConfig = { tipo: "revealBook" };

/**
 * - "staticSvg": SVG sin animación propia; se dibuja/borra con AutoDrawSVG al hacer clic.
 * - "interactiveSvg": SVG animado que escucha el clic por sí mismo (dentro de su iframe).
 * - "animatedSvg": SVG animado que NO escucha clics; el clic se captura desde fuera.
 * - "image": cualquier otra imagen (PNG, JPG, WebP...); el clic se captura desde fuera.
 */
type LacreKind = "loading" | "staticSvg" | "interactiveSvg" | "animatedSvg" | "image";
type LacreDetection = { kind: LacreKind; nativeAnimationOptions: NativeSvgAnimationOption[] };

const LACRE_LOADING: LacreDetection = { kind: "loading", nativeAnimationOptions: [] };
const LACRE_IMAGE: LacreDetection = { kind: "image", nativeAnimationOptions: [] };

function classifySvgMarkup(markup: string): LacreDetection {
  const options = parseNativeSvgAnimations(markup);
  const hasNativeAnimation = options.length > 0 || /<(?:script|animate|animateTransform|set)\b/i.test(markup);
  if (!hasNativeAnimation) return { kind: "staticSvg", nativeAnimationOptions: [] };
  return { kind: svgMarkupHandlesClick(markup) ? "interactiveSvg" : "animatedSvg", nativeAnimationOptions: options };
}

async function detectLacreKind(lacreUrl: string): Promise<LacreDetection> {
  const trimmed = lacreUrl.trim();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) return classifySvgMarkup(trimmed);

  try {
    const res = await fetch(lacreUrl);
    if (!res.ok) return LACRE_IMAGE;
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    // Evita descargar como texto imágenes binarias cuando el servidor ya dice qué son.
    if (contentType.startsWith("image/") && !contentType.includes("svg")) return LACRE_IMAGE;
    const text = await res.text();
    return /<svg[\s>]/i.test(text) ? classifySvgMarkup(text) : LACRE_IMAGE;
  } catch {
    // Si no se puede leer (p. ej. CORS), se muestra como <img>, que no necesita leer el contenido.
    return LACRE_IMAGE;
  }
}

/** Detecta qué tipo de lacre se ha configurado para decidir cómo capturar el clic que inicia la intro. */
function useLacreDetection(lacreUrl: string): LacreDetection {
  const [state, setState] = useState<{ src: string; detection: LacreDetection } | null>(null);

  useEffect(() => {
    let isMounted = true;
    void detectLacreKind(lacreUrl).then((detection) => {
      if (isMounted) setState({ src: lacreUrl, detection });
    });
    return () => {
      isMounted = false;
    };
  }, [lacreUrl]);

  return state && state.src === lacreUrl ? state.detection : LACRE_LOADING;
}

type Props = {
  config: IntroSeccionConfig;
  storageKey: string;
  themeStyle?: CSSProperties;
  introStyle?: CSSProperties;
  envelopeTexture?: EnvelopeTexture;
  children: ReactNode;
};

export default function IntroReveal({ config: rawConfig, storageKey, themeStyle, introStyle, envelopeTexture, children }: Props) {
  const config = normalizeIntroConfig(rawConfig) ?? rawConfig;
  const viewport = useDeviceViewport();
  const deviceConfig = (viewport === "movil" ? config.movil : config.pc) ?? DEFAULT_DEVICE_CONFIG;
  const [started, setStarted] = useState(false);
  const [closingLacre, setClosingLacre] = useState(false);
  const [lacreGone, setLacreGone] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const visitRecorded = useSyncExternalStore(
    () => () => undefined,
    () => config.repetir === "primeraVez" && window.localStorage.getItem(storageKey) === "1",
    () => false,
  );

  const lacreSrc = resolveDriveMediaSrc(config.lacreUrl) || DEFAULT_LACRE;
  const { kind: lacreKind, nativeAnimationOptions } = useLacreDetection(lacreSrc);
  // Imágenes y SVG animados que no escuchan el clic: la web captura el clic sobre
  // el lacre, lo desvanece y usa ese clic como disparador de la intro.
  const lacreUsesExternalClick = lacreKind === "image" || lacreKind === "animatedSvg";
  const lacreDurationMs = Math.max(300, config.duracionLacreMs ?? 900);
  const configuredNativeAnimationId = config.lacreTriggerAnimationId;
  const selectedNativeAnimationId = configuredNativeAnimationId && nativeAnimationOptions.some((animation) => animation.id === configuredNativeAnimationId)
    ? configuredNativeAnimationId
    : (nativeAnimationOptions.length === 1 ? nativeAnimationOptions[0].id : undefined);
  const hasSelectedNativeTrigger = nativeAnimationOptions.length <= 1 || Boolean(selectedNativeAnimationId);

  const completeIntro = useCallback(() => {
    window.localStorage.setItem(storageKey, "1");
    setUnlocked(true);
  }, [storageKey]);

  const startIntro = () => {
    if (closingLacre) return;
    setClosingLacre(true);
  };

  const finishLacre = useCallback(() => {
    if (!closingLacre) return;
    setLacreGone(true);
    setStarted(true);
    setClosingLacre(false);
  }, [closingLacre]);

  const themeValue = (name: string): string | undefined =>
    (themeStyle as (CSSProperties & Record<string, unknown>) | undefined)?.[name] as string | undefined;
  const introBackground = (introStyle?.backgroundColor as string) || themeValue("--brown-dark") || "#2E1F0E";
  const introTitle = config.textoTitulo ?? "";
  const introSubtitle = config.textoSubtitulo ?? "";
  const introSkipLabel = config.textoSaltar ?? "";
  const lacreSizePercent = Math.min(40, Math.max(5, config.tamanoLacrePorcentaje ?? 24));
  const showIntroTitle = introTitle.trim().length > 0;
  const showIntroSubtitle = introSubtitle.trim().length > 0;
  const showIntroSkip = introSkipLabel.trim().length > 0;
  const introBorderWidth = Math.min(48, Math.max(0, Number(config.bordeIntroPx ?? 0) || 0));
  const introBorderColor = themeValue("--bronze-pale") || "#d8cec0";
  const introFrameStyle: CSSProperties | undefined = introBorderWidth > 0
    ? { border: `${introBorderWidth}px solid ${introBorderColor}` }
    : undefined;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const introActive = config.activo && !unlocked && !visitRecorded;
    if (!introActive) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [config.activo, unlocked, visitRecorded]);

  const finishLacreWithDelay = useCallback(() => {
    const delay = Math.max(0, config.pausaTrasTriggerMs ?? 0);
    if (delay > 0) {
      setTimeout(() => {
        finishLacre();
      }, delay);
    } else {
      finishLacre();
    }
  }, [config.pausaTrasTriggerMs, finishLacre]);

  const finishAutoLacre = useCallback(() => {
    const delay = Math.max(0, config.pausaTrasTriggerMs ?? 0);
    if (delay > 0) {
      setTimeout(() => {
        setLacreGone(true);
        setStarted(true);
      }, delay);
    } else {
      setLacreGone(true);
      setStarted(true);
    }
  }, [config.pausaTrasTriggerMs]);

  useEffect(() => {
    if (!closingLacre || !lacreUsesExternalClick) return;
    const t = window.setTimeout(finishLacreWithDelay, lacreDurationMs);
    return () => window.clearTimeout(t);
  }, [closingLacre, lacreUsesExternalClick, lacreDurationMs, finishLacreWithDelay]);

  if (!config.activo || unlocked || visitRecorded) {
    return <>{children}</>;
  }

  const isLacreStep = !started || !lacreGone;
  const introIsCurrentlyActive = config.activo && !unlocked && !visitRecorded;
  const isEnvelopeMode = deviceConfig.tipo === "envelope";

  const sealColor = themeValue("--bronze-light") || "#C4964A";

  const renderSealVisual = (sizeClassName: string, sealBackground?: string) => {
    if (lacreGone) return null;

    if (lacreKind === "loading") {
      return <span className={`block ${sizeClassName}`} aria-hidden="true" />;
    }

    if (lacreKind === "interactiveSvg") {
      // El lacre tiene animación nativa que escucha el clic por sí misma,
      // y su finalización dispara automáticamente la siguiente etapa.
      return (
        <span
          className={`block ${sizeClassName}`}
          style={{ color: sealColor, backgroundColor: sealBackground }}
          aria-label="Abriendo invitación"
        >
          <AutoDrawSVG
            svgSource={lacreSrc}
            animate
            strokeColorOverride={themeValue("--bronze-light")}
            durationMs={lacreDurationMs}
            sequential={false}
            nativeAnimationId={selectedNativeAnimationId}
            onComplete={hasSelectedNativeTrigger ? finishAutoLacre : undefined}
            className="h-full w-full"
          />
        </span>
      );
    }

    if (lacreUsesExternalClick) {
      // Imagen (PNG, JPG...) o SVG animado que no escucha clics: una capa
      // transparente por encima captura el clic (también el que caería dentro
      // del iframe del SVG), el lacre se desvanece y arranca la intro.
      return (
        <button
          type="button"
          className={`relative mx-auto block cursor-pointer focus:outline-none ${sizeClassName}`}
          onClick={startIntro}
          aria-label="Abrir invitación"
        >
          <span
            className="block h-full w-full"
            style={{
              color: sealColor,
              backgroundColor: sealBackground,
              opacity: closingLacre ? 0 : 1,
              transform: closingLacre ? "scale(0.85)" : "scale(1)",
              transition: `opacity ${lacreDurationMs}ms ease, transform ${lacreDurationMs}ms ease`,
            }}
          >
            {lacreKind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lacreSrc} alt="" draggable={false} className="h-full w-full object-contain" />
            ) : (
              <AutoDrawSVG
                svgSource={lacreSrc}
                animate
                strokeColorOverride={themeValue("--bronze-light")}
                durationMs={lacreDurationMs}
                sequential={false}
                nativeAnimationId={selectedNativeAnimationId}
                className="h-full w-full"
              />
            )}
          </span>
          <span className="absolute inset-0" aria-hidden="true" />
        </button>
      );
    }

    // El lacre es un SVG estático: espera clic para borrarse y luego abre la siguiente etapa.
    return (
      <button type="button" className="group mx-auto block focus:outline-none" onClick={startIntro} aria-label="Abrir invitación">
        <span className={`block ${sizeClassName}`} style={{ color: sealColor, backgroundColor: sealBackground }}>
          <AutoDrawSVG
            svgSource={lacreSrc}
            direction={closingLacre ? "reverse" : "forward"}
            animate={closingLacre}
            strokeColorOverride={themeValue("--bronze-light")}
            durationMs={lacreDurationMs}
            sequential={false}
            onComplete={finishLacreWithDelay}
            className="h-full w-full"
          />
        </span>
      </button>
    );
  };

  if (isEnvelopeMode) {
    return (
      <IntroProvider introActive={introIsCurrentlyActive}>
        <>
          {children}
          <div className="fixed inset-0 z-[100] overflow-hidden" style={{ ...themeStyle, ...introStyle }}>
            {/* EnvelopeOpenReveal siempre ocupa la ventana real (fixed inset-0 propio), por eso
                el texto de la intro se superpone encima en vez de envolverlo en un layout con padding. */}
            <EnvelopeOpenReveal
              config={deviceConfig.envelope ?? {}}
              texture={envelopeTexture}
              fondo={introBackground}
              sealSizePercent={lacreSizePercent}
              sealBroken={lacreGone}
              sealSlot={renderSealVisual("h-full w-full")}
              onComplete={completeIntro}
            >
              {children}
            </EnvelopeOpenReveal>

            {(showIntroTitle || showIntroSubtitle) && !lacreGone ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-8 text-center" style={introFrameStyle}>
                {showIntroTitle ? <p className="font-display text-2xl text-[var(--cream)] sm:text-3xl">{introTitle}</p> : null}
                {showIntroSubtitle ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[var(--cream)] opacity-70">{introSubtitle}</p>
                ) : null}
              </div>
            ) : null}
            {showIntroSkip && !lacreGone ? (
              <button
                type="button"
                onClick={completeIntro}
                className="absolute inset-x-0 bottom-6 z-20 mx-auto block w-fit text-xs uppercase tracking-[0.2em] text-[var(--cream)] underline underline-offset-4 opacity-80 hover:opacity-100"
              >
                {introSkipLabel}
              </button>
            ) : null}
          </div>
        </>
      </IntroProvider>
    );
  }

  return (
    <IntroProvider introActive={introIsCurrentlyActive}>
      <>
        {children}

      {isLacreStep ? (
        <div className="fixed inset-0 z-[100] flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-[var(--brown-dark)] px-4 py-8" style={{ ...themeStyle, ...introStyle }}>
          <div className="w-full max-w-5xl text-center" style={introFrameStyle}>
            {showIntroTitle ? (
              <p className="font-display text-2xl text-[var(--cream)] sm:text-3xl">{introTitle}</p>
            ) : null}
            {showIntroSubtitle ? (
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[var(--cream)] opacity-70">{introSubtitle}</p>
            ) : null}
            <div className="mx-auto mt-8 aspect-square" style={{ width: `${lacreSizePercent}vmin` }}>
              {renderSealVisual("h-full w-full", introBackground)}
            </div>
            {showIntroSkip ? (
              <button type="button" onClick={completeIntro} className="mx-auto mt-8 block text-xs uppercase tracking-[0.2em] text-[var(--cream)] underline underline-offset-4 opacity-80 hover:opacity-100">
                {introSkipLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[100] h-[100svh] w-full bg-transparent" style={themeStyle}>
          <div className="relative h-full w-full px-0 py-0 sm:px-0 sm:py-0" style={introFrameStyle}>
            <IntroAnimationStage
              deviceConfig={deviceConfig}
              colorMarco={themeValue("--bronze-pale") || "#d8cec0"}
              tintColor={themeValue("--bronze-light")}
              fondoPanel={introBackground}
              onComplete={completeIntro}
            >
              {children}
            </IntroAnimationStage>
          </div>
        </div>
      )}
      </>
    </IntroProvider>
  );
}