"use client";

import type { ReactNode } from "react";
import RevealBook from "@/components/motion/RevealBook";
import FadeInReveal from "@/components/motion/FadeInReveal";
import FocusRegionReveal from "@/components/motion/FocusRegionReveal";
import SlideUpReveal from "@/components/motion/SlideUpReveal";
import CustomHtmlReveal from "@/components/motion/CustomHtmlReveal";
import type { IntroDeviceConfig } from "@/config/wedding.config";

const DEFAULT_LEFT_PANEL = "/images/Vidriera_Catedral.svg";
const DEFAULT_RIGHT_PANEL = "/images/Ventana_Alhambra.svg";

export type IntroAnimationStageProps = {
  deviceConfig: IntroDeviceConfig;
  colorMarco?: string;
  tintColor?: string;
  fondoPanel?: string;
  onComplete: () => void;
  children: ReactNode;
};

/**
 * Elige y renderiza la animación de la fase 2 de la intro (tras el lacre)
 * según el tipo configurado para el dispositivo actual (PC o móvil).
 */
export default function IntroAnimationStage({
  deviceConfig,
  colorMarco,
  tintColor,
  fondoPanel,
  onComplete,
  children,
}: IntroAnimationStageProps) {
  switch (deviceConfig.tipo) {
    case "cortinas": {
      const cfg = deviceConfig.cortinas ?? {};
      return (
        <RevealBook
          modo="cortinas"
          panelIzquierdo={{ svgSource: cfg.panelIzquierdoUrl || DEFAULT_LEFT_PANEL, alt: "Ilustración de la invitación" }}
          panelDerecho={{ svgSource: cfg.panelDerechoUrl || DEFAULT_RIGHT_PANEL, alt: "Ilustración de la invitación" }}
          duracionAperturaMs={cfg.duracionAperturaMs ?? 900}
          duracionDibujoMs={cfg.duracionDibujoMs ?? 650}
          pausaAntesDeAbrirMs={cfg.pausaAntesDeAbrirMs ?? 120}
          maxEsperaDibujoMs={cfg.maxEsperaDibujoMs ?? 9000}
          colorMarco={colorMarco}
          tintColor={tintColor}
          fondoPanel={fondoPanel}
          fullBleedPanels
          onComplete={onComplete}
        >
          {children}
        </RevealBook>
      );
    }
    case "fadeIn": {
      const cfg = deviceConfig.fadeIn ?? {};
      if (!cfg.mediaUrl) return <>{children}</>;
      return (
        <FadeInReveal
          mediaUrl={cfg.mediaUrl}
          fondo={fondoPanel}
          duracionFadeMs={cfg.duracionFadeMs ?? 1200}
          maxEsperaMs={cfg.maxEsperaMs ?? 9000}
          onComplete={onComplete}
        >
          {children}
        </FadeInReveal>
      );
    }
    case "focusRegion": {
      const cfg = deviceConfig.focusRegion ?? {};
      if (!cfg.mediaUrl) return <>{children}</>;
      return (
        <FocusRegionReveal
          mediaUrl={cfg.mediaUrl}
          region={cfg.region}
          fondo={fondoPanel}
          duracionZoomMs={cfg.duracionZoomMs ?? 1400}
          duracionFadeMs={cfg.duracionFadeMs ?? 900}
          maxEsperaMs={cfg.maxEsperaMs ?? 9000}
          onComplete={onComplete}
        >
          {children}
        </FocusRegionReveal>
      );
    }
    case "slideUp": {
      const cfg = deviceConfig.slideUp ?? {};
      if (!cfg.mediaUrl) return <>{children}</>;
      return (
        <SlideUpReveal
          mediaUrl={cfg.mediaUrl}
          fondo={fondoPanel}
          duracionDeslizamientoMs={cfg.duracionDeslizamientoMs ?? 900}
          maxEsperaMs={cfg.maxEsperaMs ?? 9000}
          onComplete={onComplete}
        >
          {children}
        </SlideUpReveal>
      );
    }
    case "custom": {
      const cfg = deviceConfig.custom ?? {};
      if (!cfg.htmlUrl) return <>{children}</>;
      return (
        <CustomHtmlReveal htmlUrl={cfg.htmlUrl} fondo={fondoPanel} maxEsperaMs={cfg.maxEsperaMs ?? 20000} onComplete={onComplete}>
          {children}
        </CustomHtmlReveal>
      );
    }
    case "revealBook":
    default: {
      const cfg = deviceConfig.revealBook ?? {};
      return (
        <RevealBook
          modo="libro"
          panelIzquierdo={{ svgSource: cfg.panelIzquierdoUrl || DEFAULT_LEFT_PANEL, alt: "Ilustración de la invitación" }}
          panelDerecho={{ svgSource: cfg.panelDerechoUrl || DEFAULT_RIGHT_PANEL, alt: "Ilustración de la invitación" }}
          duracionAperturaMs={cfg.duracionAperturaMs ?? 1800}
          duracionDibujoMs={cfg.duracionDibujoMs ?? 650}
          pausaAntesDeAbrirMs={cfg.pausaAntesDeAbrirMs ?? 120}
          maxEsperaDibujoMs={cfg.maxEsperaDibujoMs ?? 9000}
          colorMarco={colorMarco}
          tintColor={tintColor}
          fondoPanel={fondoPanel}
          fullBleedPanels
          onComplete={onComplete}
        >
          {children}
        </RevealBook>
      );
    }
  }
}
