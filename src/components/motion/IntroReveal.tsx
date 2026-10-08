"use client";

import { useCallback, useEffect, useSyncExternalStore, useState, type CSSProperties, type ReactNode } from "react";
import { IntroProvider } from "@/contexts/IntroContext";
import AutoDrawSVG from "@/components/motion/AutoDrawSVG";
import IntroAnimationStage from "@/components/motion/IntroAnimationStage";
import EnvelopeOpenReveal, { type EnvelopeTexture } from "@/components/motion/EnvelopeOpenReveal";
import { useDeviceViewport } from "@/components/motion/useDeviceViewport";
import { INTRO_RESOURCE_TIMEOUT_MS, useIntroReducedMotion } from "@/components/motion/useIntroResources";
import { useIntroArtwork } from "@/components/motion/useIntroArtwork";
import { resolveDriveMediaSrc } from "@/lib/drive-image";
import { normalizeIntroConfig, type IntroDeviceConfig, type IntroSeccionConfig } from "@/config/wedding.config";

const DEFAULT_LACRE = "/images/Sello.svg";
const DEFAULT_DEVICE_CONFIG: IntroDeviceConfig = { tipo: "revealBook" };

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
  const reduceMotion = useIntroReducedMotion();
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
  const { kind: detectedLacreKind, nativeAnimationOptions, source: preparedLacreSrc } = useIntroArtwork(lacreSrc, "Lacre");
  const [renderedLacreSrc, setRenderedLacreSrc] = useState<string>();
  const [failedRenderSrc, setFailedRenderSrc] = useState<string>();
  const lacreKind = preparedLacreSrc && failedRenderSrc === preparedLacreSrc ? "failed" : detectedLacreKind;
  const markLacreReady = useCallback(() => setRenderedLacreSrc(preparedLacreSrc), [preparedLacreSrc]);
  const lacreReady = lacreKind === "failed" || lacreKind === "image" || (lacreKind !== "loading" && renderedLacreSrc === preparedLacreSrc);
  useEffect(() => {
    if (!preparedLacreSrc || lacreReady) return;
    const timer = window.setTimeout(() => {
      console.warn("[Intro] El SVG del lacre no pudo prepararse", lacreSrc);
      setFailedRenderSrc(preparedLacreSrc);
    }, INTRO_RESOURCE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [preparedLacreSrc, lacreReady, lacreSrc]);
  // Imágenes y SVG animados que no escuchan el clic: la web captura el clic sobre
  // el lacre, lo desvanece y usa ese clic como disparador de la intro.
  const lacreUsesExternalClick = lacreKind === "image" || lacreKind === "animatedSvg" || lacreKind === "failed";
  const lacreDurationMs = reduceMotion ? 0 : Math.max(300, config.duracionLacreMs ?? 900);
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
    if (reduceMotion) {
      setLacreGone(true);
      setStarted(true);
      return;
    }
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
    if (lacreKind === "failed") {
      return <button type="button" className={`block text-xs text-[var(--bronze-light)] underline ${sizeClassName}`} onClick={startIntro}>Abrir invitación</button>;
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
            svgSource={preparedLacreSrc ?? lacreSrc}
            onReady={markLacreReady}
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
              <img src={preparedLacreSrc} alt="" draggable={false} className="h-full w-full object-contain" />
            ) : (
              <AutoDrawSVG
                svgSource={preparedLacreSrc ?? lacreSrc}
                onReady={markLacreReady}
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
      <button type="button" className={`group mx-auto block focus:outline-none ${sizeClassName}`} onClick={startIntro} aria-label="Abrir invitación">
        <span className={`block ${sizeClassName}`} style={{ color: sealColor, backgroundColor: sealBackground }}>
          <AutoDrawSVG
            svgSource={preparedLacreSrc ?? lacreSrc}
            onReady={markLacreReady}
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

  if (viewport === null) {
    return (
      <IntroProvider introActive={introIsCurrentlyActive}>
        <div className="wedding-fixed fixed inset-y-0 z-[100]" aria-busy="true" style={{ backgroundColor: "var(--wedding-loading-background, #F7F3EC)" }}>
          <span role="status" className="sr-only">Preparando invitación...</span>
        </div>
      </IntroProvider>
    );
  }

  if (isEnvelopeMode) {
    return (
      <IntroProvider introActive={introIsCurrentlyActive}>
        <>
          <div className="wedding-fixed fixed inset-y-0 z-[100] overflow-hidden" style={{ ...themeStyle, ...introStyle }}>
            <EnvelopeOpenReveal
              config={deviceConfig.envelope ?? {}}
              texture={envelopeTexture}
              fondo={introBackground}
              sealSizePercent={lacreSizePercent}
              sealBroken={lacreGone}
              sealReady={lacreReady}
              sealSlot={renderSealVisual("h-full w-full")}
              onComplete={completeIntro}
            >
              {lacreReady ? children : null}
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
        <div
          className="wedding-fixed fixed inset-y-0 z-[100] flex min-h-[100svh] items-center justify-center overflow-hidden bg-[var(--brown-dark)] px-4 py-8"
          aria-busy={!lacreReady}
          style={{ ...themeStyle, ...introStyle, ...(!lacreReady ? { backgroundColor: "var(--wedding-loading-background, #F7F3EC)", backgroundImage: "none" } : {}) }}
        >
          {!lacreReady ? <span role="status" className="sr-only">Preparando invitación...</span> : null}
          <div className="w-full max-w-5xl text-center" style={{ ...introFrameStyle, visibility: lacreReady ? "visible" : "hidden", transitionProperty: "none" }}>
            {showIntroTitle ? (
              <p className="font-display text-2xl text-[var(--cream)] sm:text-3xl">{introTitle}</p>
            ) : null}
            {showIntroSubtitle ? (
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[var(--cream)] opacity-70">{introSubtitle}</p>
            ) : null}
            <div className="mx-auto mt-8 aspect-square" style={{ width: `calc(${lacreSizePercent} * var(--wedding-vmin, 1vmin))` }}>
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
        <div className="wedding-fixed fixed inset-y-0 z-[100] h-[100svh] bg-transparent" style={themeStyle}>
          <div className="relative h-full w-full px-0 py-0 sm:px-0 sm:py-0" style={introFrameStyle}>
            <IntroAnimationStage
              deviceConfig={deviceConfig}
              colorMarco={themeValue("--bronze-pale") || "#d8cec0"}
              tintColor={themeValue("--bronze-light")}
              fondoPanel={introBackground}
              onComplete={completeIntro}
            >
              <div style={{ transform: "translateZ(0)", ["--wedding-left" as string]: "0px", ["--wedding-right" as string]: "0px" }}>{children}</div>
            </IntroAnimationStage>
          </div>
        </div>
      )}
      </>
    </IntroProvider>
  );
}