"use client";

import { useCallback, useEffect, useSyncExternalStore, useState, type CSSProperties, type ReactNode } from "react";
import { IntroProvider } from "@/contexts/IntroContext";
import AutoDrawSVG, { parseNativeSvgAnimations, type NativeSvgAnimationOption } from "@/components/motion/AutoDrawSVG";
import IntroAnimationStage from "@/components/motion/IntroAnimationStage";
import EnvelopeOpenReveal from "@/components/motion/EnvelopeOpenReveal";
import { useDeviceViewport } from "@/components/motion/useDeviceViewport";
import { normalizeIntroConfig, type IntroDeviceConfig, type IntroSeccionConfig } from "@/config/wedding.config";

const DEFAULT_LACRE = "/images/Sello.svg";
const DEFAULT_DEVICE_CONFIG: IntroDeviceConfig = { tipo: "revealBook" };

/**
 * Detecta una sola vez si el SVG del lacre tiene animación nativa (SMIL/script).
 * Solo detecta cuando el SVG se carga la primera vez; cambios posteriores en la URL
 * no afectan a este hook (se asume que la URL del lacre no cambia durante la sesión).
 */
function useLacreNativeAnimationDetection(lacreUrl: string): { hasNativeAnimation: boolean; nativeAnimationOptions: NativeSvgAnimationOption[]; } {
  const [state, setState] = useState({ hasNativeAnimation: false, nativeAnimationOptions: [] as NativeSvgAnimationOption[] });

  useEffect(() => {
    let isMounted = true;

    const detectAnimation = async () => {
      try {
        const res = await fetch(lacreUrl);
        if (!isMounted || !res.ok) {
          if (isMounted) setState({ hasNativeAnimation: false, nativeAnimationOptions: [] });
          return;
        }

        const text = await res.text();
        if (!isMounted) return;

        const options = parseNativeSvgAnimations(text);
        setState({
          hasNativeAnimation: options.length > 0 || /<(?:script|animate|animateTransform|set)\b/i.test(text),
          nativeAnimationOptions: options,
        });
      } catch {
        if (isMounted) {
          setState({ hasNativeAnimation: false, nativeAnimationOptions: [] });
        }
      }
    };

    void detectAnimation();

    return () => {
      isMounted = false;
    };
  }, [lacreUrl]);

  return state;
}

type Props = {
  config: IntroSeccionConfig;
  storageKey: string;
  themeStyle?: CSSProperties;
  introStyle?: CSSProperties;
  children: ReactNode;
};

export default function IntroReveal({ config: rawConfig, storageKey, themeStyle, introStyle, children }: Props) {
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

  const { hasNativeAnimation: lacreHasNativeAnimation, nativeAnimationOptions } = useLacreNativeAnimationDetection(config.lacreUrl || DEFAULT_LACRE);
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

  if (!config.activo || unlocked || visitRecorded) {
    return <>{children}</>;
  }

  const isLacreStep = !started || !lacreGone;
  const introIsCurrentlyActive = config.activo && !unlocked && !visitRecorded;
  const isEnvelopeMode = deviceConfig.tipo === "envelope";

  const renderSealVisual = (sizeClassName: string, sealBackground?: string) =>
    !lacreGone ? (
      lacreHasNativeAnimation ? (
        // El lacre tiene animación nativa: se reproduce automáticamente,
        // y su finalización dispara automáticamente la siguiente etapa.
        <span
          className={`block ${sizeClassName}`}
          style={{ color: themeValue("--bronze-light") || "#C4964A", backgroundColor: sealBackground }}
          aria-label="Abriendo invitación"
        >
          <AutoDrawSVG
            svgSource={config.lacreUrl || DEFAULT_LACRE}
            animate
            strokeColorOverride={themeValue("--bronze-light")}
            durationMs={Math.max(300, config.duracionLacreMs ?? 900)}
            sequential={false}
            nativeAnimationId={selectedNativeAnimationId}
            onComplete={hasSelectedNativeTrigger ? finishAutoLacre : undefined}
            className="h-full w-full"
          />
        </span>
      ) : (
        // El lacre es un SVG estático: espera clic para dibujarse y luego otro
        // clic (u onComplete) para abrir la siguiente etapa.
        <button type="button" className="group mx-auto block focus:outline-none" onClick={startIntro} aria-label="Abrir invitación">
          <span className={`block ${sizeClassName}`} style={{ color: themeValue("--bronze-light") || "#C4964A", backgroundColor: sealBackground }}>
            <AutoDrawSVG
              svgSource={config.lacreUrl || DEFAULT_LACRE}
              direction={closingLacre ? "reverse" : "forward"}
              animate={closingLacre}
              strokeColorOverride={themeValue("--bronze-light")}
              durationMs={Math.max(300, config.duracionLacreMs ?? 900)}
              sequential={false}
              onComplete={finishLacreWithDelay}
              className="h-full w-full"
            />
          </span>
        </button>
      )
    ) : null;

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
              fondo={introBackground}
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
            {renderSealVisual("mx-auto mt-8 aspect-square w-[clamp(7rem,24vw,13rem)]", introBackground)}
            {showIntroSkip ? (
              <button type="button" onClick={completeIntro} className="mx-auto mt-8 block text-xs uppercase tracking-[0.2em] text-[var(--cream)] underline underline-offset-4 opacity-80 hover:opacity-100">
                {introSkipLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[100] h-[100svh] w-full bg-transparent">
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