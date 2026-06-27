/**
 * components/wedding/HeroPortada.tsx
 * ─────────────────────────────────────────────────────────────
 * Sección hero de la portada.
 * Soporta imagen de fondo o fondo oscuro sólido como fallback.
 * Soporta logo/sello propio (imagen) o el SVG generado.
 */

import Image from "next/image";
import Link from "next/link";
import { SelloNupcial } from "@/components/ui/SelloNupcial";
import { CuentaAtras } from "@/components/ui/CuentaAtras";
import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { WeddingConfig } from "@/config/wedding.config";

type HeroPortadaProps = {
  config: Pick<
    WeddingConfig,
    "novia" | "novio" | "iniciales" | "fecha" | "fechaFormateada" | "textos" | "logo" | "heroImagen"
  >;
};

export function HeroPortada({ config }: HeroPortadaProps) {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden"
      id="inicio"
    >
      {/* ── Fondo: imagen o color sólido ── */}
      {config.heroImagen ? (
        <>
          <Image
            src={`/images/${config.heroImagen}`}
            alt="Fondo hero"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Overlay oscuro sobre la foto */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(46,31,14,0.45) 0%, rgba(46,31,14,0.6) 60%, rgba(46,31,14,0.8) 100%)",
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        /* Sin imagen — fondo oscuro con gradiente de color */
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "var(--brown-dark)",
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(140,106,63,0.2) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(92,107,58,0.15) 0%, transparent 50%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Contenido ── */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 max-w-2xl mx-auto">

        {/* Logo: imagen propia o SVG generado */}
        <div className="animate-fade-up">
          {config.logo ? (
            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
              <Image
                src={`/images/${config.logo}`}
                alt={`Sello de boda de ${config.novia.nombre} y ${config.novio.nombre}`}
                fill
                className="object-contain"
                sizes="160px"
              />
            </div>
          ) : (
            <SelloNupcial
              size={140}
              color="#C4964A"
            />
          )}
        </div>

        {/* Etiqueta superior */}
        <p
          className="smallcaps text-xs sm:text-sm tracking-[0.3em] animate-fade-up delay-100"
          style={{ color: "var(--bronze-pale)", opacity: 0.8 }}
        >
          nos casamos
        </p>

        {/* Nombres */}
        <div className="animate-fade-up delay-200">
          <h1
            className="font-display font-light"
            style={{
              fontSize: "clamp(3rem, 10vw, 5.5rem)",
              color: "var(--white)",
              lineHeight: 1.05,
            }}
          >
            {config.novia.nombre}
            <br />
            <span
              style={{
                color: "var(--bronze-light)",
                fontSize: "0.45em",
                letterSpacing: "0.35em",
                display: "block",
                margin: "0.3em 0",
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
            className="smallcaps tracking-[0.2em] text-sm"
            style={{ color: "var(--bronze-pale)" }}
          >
            {config.fechaFormateada}
          </p>
        </div>

        {/* Bienvenida */}
        <p
          className="font-display text-lg sm:text-xl font-light italic max-w-md leading-relaxed animate-fade-up delay-400"
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
      </div>

      {/* Cuenta atrás en la parte inferior del hero */}
      <div
        className="relative z-10 w-full mt-auto pt-12 pb-10"
        style={{ borderTop: "1px solid rgba(196,150,74,0.2)" }}
      >
        <p
          className="smallcaps text-xs tracking-widest mb-6"
          style={{ color: "var(--bronze-pale)", opacity: 0.6 }}
        >
          faltan
        </p>
        <CuentaAtras fechaObjetivo={config.fecha} />
      </div>

      {/* Flecha de scroll */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce"
        aria-hidden="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ color: "rgba(196,150,74,0.5)" }}
        >
          <path d="M6 9 L12 15 L18 9" />
        </svg>
      </div>
    </section>
  );
}
