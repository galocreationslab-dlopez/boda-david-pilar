/**
 * app/page.tsx  (o app/public/page.tsx — redirigir según estructura final)
 * ─────────────────────────────────────────────────────────────
 * Página principal de la invitación de boda.
 * Server Component: todos los datos vienen de wedding.config.ts.
 * Los componentes client se importan según necesiten interactividad.
 */

import { SelloNupcial } from "@/components/ui/SelloNupcial";
import { CuentaAtras } from "@/components/ui/CuentaAtras";
import { OrnamentoDivisor, SeparadorSeccion } from "@/components/ui/OrnamentoDivisor";
import { NavegacionPublica } from "@/components/layout/NavegacionPublica";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { weddingConfig } from "@/config/wedding.config";
import Link from "next/link";

export default function PaginaPrincipal() {
  const config = weddingConfig;

  return (
    <>
      <NavegacionPublica config={config} />

      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4"
        style={{ backgroundColor: "var(--brown-dark)" }}
        id="inicio"
      >
        {/* Textura sutil de fondo — en producción reemplazar con imagen */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #8C6A3F 0%, transparent 60%), radial-gradient(circle at 80% 20%, #5C6B3A 0%, transparent 50%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 max-w-2xl mx-auto">
          {/* Sello nupcial */}
          <div className="animate-fade-up">
            <SelloNupcial
              inicialNovio={config.iniciales.novio}
              inicialNovia={config.iniciales.novia}
              size={140}
              color="#C4964A"
            />
          </div>

          {/* Nombres */}
          <div className="animate-fade-up delay-200">
            <h1
              className="font-display font-light"
              style={{
                fontSize: "clamp(3rem, 10vw, 5.5rem)",
                color: "var(--white)",
                lineHeight: 1.1,
              }}
            >
              {config.novia.nombre}
              <br />
              <span style={{ color: "var(--bronze-light)", fontSize: "0.5em", letterSpacing: "0.3em" }}>
                &amp;
              </span>
              <br />
              {config.novio.nombre}
            </h1>
          </div>

          {/* Fecha */}
          <div className="animate-fade-up delay-300">
            <OrnamentoDivisor color="#C4964A" />
            <p
              className="smallcaps tracking-[0.2em]"
              style={{ color: "var(--bronze-pale)" }}
            >
              {config.fechaFormateada}
            </p>
          </div>

          {/* Texto de bienvenida */}
          <p
            className="font-display text-lg sm:text-xl font-light italic max-w-md animate-fade-up delay-400"
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

        {/* Scroll indicator */}
      </section>

      {/* ── CUENTA ATRÁS ── */}
      <section
        className="py-16 sm:py-20 text-center"
        style={{ backgroundColor: "var(--olive)" }}
      >
        <div className="container-wedding">
          <p
            className="smallcaps text-xs tracking-widest mb-8"
            style={{ color: "var(--olive-pale)", opacity: 0.7 }}
          >
            faltan
          </p>
          <CuentaAtras fechaObjetivo={config.fecha} />
          <p
            className="font-display text-base italic mt-8"
            style={{ color: "var(--olive-pale)", opacity: 0.6 }}
          >
            hasta el gran día
          </p>
        </div>
      </section>

      <SeparadorSeccion colorDesde="#5C6B3A" colorHacia="#F7F3EC" />

      {/* ── NUESTRA HISTORIA ── */}
      <section
        id="historia"
        className="section-wedding"
        style={{ backgroundColor: "var(--cream)" }}
      >
        <div className="container-wedding max-w-2xl text-center">
          <p className="section-subtitle">nuestra historia</p>
          <h2 className="section-title">Cómo llegamos hasta aquí</h2>
          <OrnamentoDivisor />
          <p
            className="font-display text-xl sm:text-2xl font-light italic leading-relaxed"
            style={{ color: "var(--brown-mid)" }}
          >
            {config.textos.historia}
          </p>
        </div>
      </section>

      <SeparadorSeccion colorDesde="#F7F3EC" colorHacia="#EDE7DB" />

      {/* ── DRESS CODE ── */}
      <section
        id="dresscode"
        className="section-wedding"
        style={{ backgroundColor: "var(--cream-dark)" }}
      >
        <div className="container-wedding max-w-2xl text-center">
          <p className="section-subtitle">dress code</p>
          <h2 className="section-title">{config.textos.dressCode}</h2>
          <OrnamentoDivisor />
          <p
            className="text-base font-light leading-relaxed"
            style={{ color: "var(--brown-mid)" }}
          >
            {config.textos.dressCodeDetalle}
          </p>
        </div>
      </section>

      <SeparadorSeccion colorDesde="#EDE7DB" colorHacia="#F7F3EC" />

      {/* ── CONFIRMAR ASISTENCIA ── CTA final */}
      <section
        className="section-wedding text-center"
        style={{ backgroundColor: "var(--cream)" }}
      >
        <div className="container-wedding max-w-xl flex flex-col items-center gap-6">
          <SelloNupcial
            inicialNovio={config.iniciales.novio}
            inicialNovia={config.iniciales.novia}
            size={80}
          />
          <h2 className="section-title">¿Nos acompañas?</h2>
          <OrnamentoDivisor />
          <p
            className="font-display text-xl font-light italic"
            style={{ color: "var(--brown-mid)" }}
          >
            Confirma tu asistencia antes del{" "}
            <strong className="font-medium not-italic" style={{ color: "var(--bronze)" }}>
              {config.textos.confirmacionLimite}
            </strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link href="/rsvp" className="btn-primary">
              Confirmar asistencia
            </Link>
            <Link href="/info" className="btn-secondary">
              Ver información
            </Link>
          </div>
        </div>
      </section>

      <PieDePagina config={config} />
    </>
  );
}
