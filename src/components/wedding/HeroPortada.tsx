"use client";

/**
 * components/wedding/HeroPortada.tsx
 * Portada/invitación — siempre desplegada, fondo oscuro con gradiente.
 */

import { SelloNupcial } from "@/components/ui/SelloNupcial";
import { CuentaAtras } from "@/components/ui/CuentaAtras";
import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { WeddingConfig } from "@/config/wedding.config";

type Props = {
  config: Pick<WeddingConfig, "novia" | "novio" | "nombreConjunto" | "iniciales" | "fecha" | "fechaFormateada" | "textos">;
  viewport?: "desktop" | "movil";
  mostrarBotonConfirmar?: boolean;
  labelBotonConfirmar?: string;
  onConfirmarClick?: () => void;
  editable?: boolean;
  onEditNombreConjunto?: (value: string) => void;
  onEditBienvenida?: (value: string) => void;
};

export function HeroPortada({
  config,
  viewport = "desktop",
  mostrarBotonConfirmar = false,
  labelBotonConfirmar,
  onConfirmarClick,
  editable = false,
  onEditNombreConjunto,
  onEditBienvenida,
}: Props) {
  const forceMobile = viewport === "movil";

  return (
    <div
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-3 text-center sm:px-4"
      style={{
        backgroundColor: "var(--brown-dark)",
        backgroundImage:
          "radial-gradient(circle at 20% 50%, rgba(140,106,63,0.2) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(92,107,58,0.15) 0%, transparent 50%)",
      }}
    >
      {/* Contenido principal */}
      <div className={`relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-16 sm:gap-7 sm:py-20 ${forceMobile ? "max-w-[21rem] gap-4 py-12" : ""}`}>

        {/* Sello */}
        <div className="animate-fade-up">
          <SelloNupcial size={forceMobile ? 100 : 128} color="#C4964A" />
        </div>

        {/* Nombres */}
        <div className="animate-fade-up delay-200">
          <h1
            className="font-display font-light"
            style={{
              fontSize: forceMobile ? "clamp(2.8rem, 14vw, 4.2rem)" : "clamp(3.5rem, 11vw, 6rem)",
              color: "var(--white)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
            contentEditable={editable && typeof onEditNombreConjunto === "function" && Boolean(config.nombreConjunto?.trim())}
            suppressContentEditableWarning={true}
            onBlur={(event) => {
              if (!editable || typeof onEditNombreConjunto !== "function") return;
              onEditNombreConjunto?.(event.currentTarget.textContent ?? "");
            }}
          >
            {config.nombreConjunto?.trim() ? (
              config.nombreConjunto
            ) : (
              <>
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
              </>
            )}
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
          className={`font-display font-light italic leading-relaxed animate-fade-up delay-400 ${forceMobile ? "max-w-[18rem] text-lg" : "max-w-md text-xl sm:text-2xl"}`}
          style={{ color: "var(--cream)", opacity: 0.85 }}
          contentEditable={editable}
          suppressContentEditableWarning={true}
          onBlur={(event) => {
            if (!editable) return;
            const value = (event.currentTarget.textContent ?? "").replace(/^"|"$/g, "").trim();
            onEditBienvenida?.(value);
          }}
        >
          &ldquo;{config.textos.bienvenida}&rdquo;
        </p>

        {/* CTA: solo visible con código de invitación válido */}
        {mostrarBotonConfirmar && (
          <div className="mt-2 w-full animate-fade-in sm:w-auto">
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={onConfirmarClick}>
              {labelBotonConfirmar ?? "Confirmar asistencia"}
            </button>
          </div>
        )}

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
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 animate-bounce sm:block"
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: "rgba(196,150,74,0.5)" }}>
          <path d="M6 9 L12 15 L18 9" />
        </svg>
      </div>
    </div>
  );
}
