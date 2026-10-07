/**
 * components/layout/PieDePagina.tsx
 * ─────────────────────────────────────────────────────────────
 * Pie de página elegante para las páginas públicas.
 * Si la configuración trae una sección tipo "pie" (formato libre, como portadaLibre), se
 * renderiza esa en su lugar reutilizando <PortadaLibre>; el pie de fábrica queda de fallback.
 */

import type { CSSProperties } from "react";
import { SelloNupcial } from "@/components/ui/SelloNupcial";
import type { SeccionDiseno, TratamientoImagen, WeddingConfig } from "@/config/wedding.config";
import PortadaLibre from "@/components/wedding/PortadaLibre";
import type { PortadaDispositivo } from "@/lib/portada-libre";

type PieDePaginaProps = {
  config: Pick<WeddingConfig, "iniciales" | "novia" | "novio" | "fechaFormateada">;
  seccionPie?: SeccionDiseno;
  roleColors?: Record<string, string | undefined>;
  resolveSrc?: (src?: string) => string;
  imageTreatments?: Record<string, TratamientoImagen>;
  themeVars?: CSSProperties;
  forzarDispositivo?: PortadaDispositivo;
};

export function PieDePagina({ config, seccionPie, roleColors = {}, resolveSrc, imageTreatments, themeVars, forzarDispositivo }: PieDePaginaProps) {
  if (seccionPie?.pie) {
    return (
      <footer id="pie" className="tex-cream" style={{ backgroundColor: "var(--cream)", ...themeVars }}>
        <PortadaLibre config={seccionPie.pie} roleColors={roleColors} resolveSrc={resolveSrc} imageTreatments={imageTreatments} forzarDispositivo={forzarDispositivo} />
      </footer>
    );
  }

  return (
    <footer
      id="pie"
      className="border-t border-cream-dark py-12 text-center sm:py-16"
      style={{ backgroundColor: "var(--brown-dark)" }}
    >
      <div className="container-wedding flex flex-col items-center gap-6">
        <SelloNupcial
          size={56}
          color="#C4964A"
        />

        <p
          className="font-display text-xl font-light sm:text-2xl"
          style={{ color: "var(--bronze-pale)" }}
        >
          {config.novia.nombre} &amp; {config.novio.nombre}
        </p>

        <p
          className="smallcaps text-xs tracking-widest"
          style={{ color: "var(--olive-muted)" }}
        >
          {config.fechaFormateada}
        </p>

        <p
          className="text-xs mt-4"
          style={{ color: "var(--olive-muted)", opacity: 0.5 }}
        >
          Hecho con amor ♥
        </p>
      </div>
    </footer>
  );
}
