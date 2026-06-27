/**
 * components/wedding/SeccionCTA.tsx
 * ─────────────────────────────────────────────────────────────
 * Sección final de llamada a la acción — confirmar asistencia.
 */

import Link from "next/link";
import { SelloNupcial } from "@/components/ui/SelloNupcial";
import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { WeddingConfig } from "@/config/wedding.config";

type SeccionCTAProps = {
  config: Pick<WeddingConfig, "iniciales" | "logo" | "textos">;
};

export function SeccionCTA({ config }: SeccionCTAProps) {
  return (
    <section
      className="section-wedding text-center"
      style={{ backgroundColor: "var(--cream)" }}
    >
      <div className="container-wedding max-w-xl flex flex-col items-center gap-6">
        <SelloNupcial
          size={80}
        />

        <h2 className="section-title">¿Nos acompañas?</h2>
        <OrnamentoDivisor />

        <p
          className="font-display text-xl font-light italic"
          style={{ color: "var(--brown-mid)" }}
        >
          Confirma tu asistencia antes del{" "}
          <strong
            className="font-medium not-italic"
            style={{ color: "var(--bronze)" }}
          >
            {config.textos.confirmacionLimite}
          </strong>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Link href="/rsvp" className="btn-primary">
            Confirmar asistencia
          </Link>
          <Link href="/transporte" className="btn-secondary">
            Información de transporte
          </Link>
        </div>
      </div>
    </section>
  );
}
