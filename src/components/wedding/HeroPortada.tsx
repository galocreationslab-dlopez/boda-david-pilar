/**
 * components/wedding/HeroPortada.tsx
 * Portada/invitación — siempre desplegada, fondo oscuro con gradiente.
 */

import Link from "next/link";
import { SelloNupcial } from "@/components/ui/SelloNupcial";
import { CuentaAtras } from "@/components/ui/CuentaAtras";
import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { WeddingConfig } from "@/config/wedding.config";

type Props = {
  config: Pick<WeddingConfig, "novia" | "novio" | "iniciales" | "fecha" | "fechaFormateada" | "textos">;
};

export function HeroPortada({ config }: Props) {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden"
      style={{
        backgroundColor: "var(--brown-dark)",
        backgroundImage:
          "radial-gradient(circle at 20% 50%, rgba(140,106,63,0.2) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(92,107,58,0.15) 0%, transparent 50%)",
      }}
    >
      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-7 max-w-2xl mx-auto py-20">

        {/* Sello */}
        <div className="animate-fade-up">
          <SelloNupcial size={160} color="#C4964A" />
        </div>

        {/* Nombres */}
        <div className="animate-fade-up delay-200">
          <h1
            className="font-display font-light"
            style={{
              fontSize: "clamp(3.5rem, 11vw, 6rem)",
              color: "var(--white)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            {config.novia.nombre}
            <span
              style={{
                display: "block",
                color: "var(--bronze-light)",
                fontSize: "0.38em",
                letterSpacing: "0.4em",
                margin: "0.2em 0",
                fontWeight: 300,
              }}
            >
              &amp;
            </span>
            {config.novio.nombre}
          </h1>
        </div>

        {/* Fecha */}
        <div className="animate-fade-up delay-300">
          <OrnamentoDivisor color="#C4964A" />
          <p
            className="smallcaps tracking-[0.25em] text-sm mt-1"
            style={{ color: "var(--bronze-pale)" }}
          >
            {config.fechaFormateada}
          </p>
        </div>

        {/* Texto de bienvenida */}
        <p
          className="font-display text-xl sm:text-2xl font-light italic max-w-md leading-relaxed animate-fade-up delay-400"
          style={{ color: "var(--cream)", opacity: 0.85 }}
        >
          &ldquo;{config.textos.bienvenida}&rdquo;
        </p>

        {/* CTA */}
        <div className="animate-fade-up delay-500 mt-2">
          <Link href="/rsvp" className="btn-primary">
            Confirmar asistencia
          </Link>
        </div>

        {/* Cuenta atrás */}
        <div
          className="w-full mt-6 pt-8 animate-fade-up delay-500"
          style={{ borderTop: "1px solid rgba(196,150,74,0.2)" }}
        >
          <p
            className="smallcaps text-xs tracking-widest mb-5"
            style={{ color: "var(--bronze-pale)", opacity: 0.6 }}
          >
            faltan
          </p>
          <CuentaAtras fechaObjetivo={config.fecha} />
        </div>
      </div>

      {/* Flecha hacia abajo */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce"
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: "rgba(196,150,74,0.5)" }}>
          <path d="M6 9 L12 15 L18 9" />
        </svg>
      </div>
    </div>
  );
}
