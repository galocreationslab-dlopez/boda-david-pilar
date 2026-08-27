"use client";

import { useCallback, useEffect, useSyncExternalStore, useState, type CSSProperties, type ReactNode } from "react";
import { IntroProvider } from "@/contexts/IntroContext";
import AutoDrawSVG from "@/components/motion/AutoDrawSVG";
import RevealBook from "@/components/motion/RevealBook";
import type { IntroSeccionConfig } from "@/config/wedding.config";

const DEFAULT_LACRE = "/images/Sello.svg";
const DEFAULT_LEFT_PANEL = "/images/Vidriera_Catedral.svg";
const DEFAULT_RIGHT_PANEL = "/images/Ventana_Alhambra.svg";

type Props = {
  config: IntroSeccionConfig;
  storageKey: string;
  themeStyle?: CSSProperties;
  introStyle?: CSSProperties;
  children: ReactNode;
};

export default function IntroReveal({ config, storageKey, themeStyle, introStyle, children }: Props) {
  const [started, setStarted] = useState(false);
  const [closingLacre, setClosingLacre] = useState(false);
  const [lacreGone, setLacreGone] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const visitRecorded = useSyncExternalStore(
    () => () => undefined,
    () => config.repetir === "primeraVez" && window.localStorage.getItem(storageKey) === "1",
    () => false,
  );

  const completeIntro = useCallback(() => {
    window.localStorage.setItem(storageKey, "1");
    setUnlocked(true);
  }, [storageKey]);

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

  if (!config.activo || unlocked || visitRecorded) {
    return <>{children}</>;
  }

  const isLacreStep = !started || !lacreGone;
  const introIsCurrentlyActive = config.activo && !unlocked && !visitRecorded;

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
            {!lacreGone ? (
              <button
                type="button"
                className="group mx-auto mt-8 block focus:outline-none"
                onClick={startIntro}
                aria-label="Abrir invitación"
              >
                <span
                  className="mx-auto block aspect-square w-[clamp(7rem,24vw,13rem)]"
                  style={{ color: themeValue("--bronze-light") || "#C4964A", backgroundColor: introBackground }}
                >
                  <AutoDrawSVG
                    svgSource={config.lacreUrl || DEFAULT_LACRE}
                    direction={closingLacre ? "reverse" : "forward"}
                    animate={closingLacre}
                    strokeColorOverride={themeValue("--bronze-light")}
                    durationMs={Math.max(300, config.duracionLacreMs ?? 900)}
                    sequential={false}
                    onComplete={finishLacre}
                    className="h-full w-full"
                  />
                </span>
              </button>
            ) : null}
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
            <RevealBook
              panelIzquierdo={{ svgSource: config.panelIzquierdoUrl || DEFAULT_LEFT_PANEL, alt: "Ilustración de la invitación" }}
              panelDerecho={{ svgSource: config.panelDerechoUrl || DEFAULT_RIGHT_PANEL, alt: "Ilustración de la invitación" }}
              duracionAperturaMs={config.duracionAperturaMs ?? 1800}
              pausaAntesDeAbrirMs={config.pausaAntesDeAbrirMs ?? 120}
              maxEsperaDibujoMs={config.maxEsperaDibujoMs ?? 9000}
              colorMarco={themeValue("--bronze-pale") || "#d8cec0"}
              tintColor={themeValue("--bronze-light")}
              fondoPanel={introBackground}
              fullBleedPanels={true}
              onComplete={completeIntro}
            >
              {children}
            </RevealBook>
          </div>
        </div>
      )}
      </>
    </IntroProvider>
  );
}