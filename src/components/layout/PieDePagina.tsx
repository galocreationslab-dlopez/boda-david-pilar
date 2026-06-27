/**
 * components/layout/PieDePagina.tsx
 * ─────────────────────────────────────────────────────────────
 * Pie de página elegante para las páginas públicas.
 */

import { SelloNupcial } from "@/components/ui/SelloNupcial";
import type { WeddingConfig } from "@/config/wedding.config";

type PieDePaginaProps = {
  config: Pick<WeddingConfig, "iniciales" | "novia" | "novio" | "fechaFormateada">;
};

export function PieDePagina({ config }: PieDePaginaProps) {
  return (
    <footer
      className="py-16 text-center border-t border-cream-dark"
      style={{ backgroundColor: "var(--brown-dark)" }}
    >
      <div className="container-wedding flex flex-col items-center gap-6">
        <SelloNupcial
          size={64}
          color="#C4964A"
        />

        <p
          className="font-display text-2xl font-light"
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
