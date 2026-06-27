/**
 * components/wedding/SeccionDia.tsx
 * ─────────────────────────────────────────────────────────────
 * Sección "El gran día": localizaciones + timeline integrado.
 * Las localizaciones tienen mapa/dirección; el timeline muestra
 * el orden del día con iconos y horas.
 */

import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { Localizacion, EventoTimeline } from "@/config/wedding.config";

// ── Iconos SVG inline ─────────────────────────────────────────

function IconoIglesia() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L12 6" />
      <path d="M10 4 L14 4" />
      <path d="M3 22 L3 10 L12 4 L21 10 L21 22" />
      <rect x="9" y="14" width="6" height="8" />
      <path d="M9 10 a3 3 0 0 1 6 0" />
    </svg>
  );
}

function IconoFinca() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22 L3 8 L12 3 L21 8 L21 22" />
      <rect x="8" y="14" width="8" height="8" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M3 8 L1 8" />
      <path d="M21 8 L23 8" />
    </svg>
  );
}

function IconoRings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="12" r="5" />
      <circle cx="16" cy="12" r="5" />
    </svg>
  );
}

function IconoCocktail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 22 L16 22" />
      <path d="M12 22 L12 11" />
      <path d="M3 3 L21 3 L12 11 Z" />
      <path d="M17 7 L20 4" />
    </svg>
  );
}

function IconoFork() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 2 L3 8 Q3 11 6 11 L6 22" />
      <path d="M6 2 L6 8" />
      <path d="M9 2 L9 8 Q9 11 6 11" />
      <path d="M15 2 Q21 2 21 8 Q21 11 18 11 L18 22" />
    </svg>
  );
}

function IconoCake() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 Q13 4 12 6" />
      <rect x="2" y="10" width="20" height="4" rx="1" />
      <rect x="4" y="14" width="16" height="7" rx="1" />
      <path d="M2 14 Q6 18 12 14 Q18 18 22 14" />
    </svg>
  );
}

function IconoMusic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18 L9 5 L20 3 L20 16" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}

const ICONOS_TIMELINE: Record<string, React.ReactNode> = {
  rings: <IconoRings />,
  cocktail: <IconoCocktail />,
  fork: <IconoFork />,
  cake: <IconoCake />,
  music: <IconoMusic />,
};

const ICONOS_LUGAR: Record<string, React.ReactNode> = {
  iglesia: <IconoIglesia />,
  finca: <IconoFinca />,
  cocktail: <IconoCocktail />,
  music: <IconoMusic />,
};

// ── Subcomponente: tarjeta de localización ────────────────────

function TarjetaLocalizacion({ loc }: { loc: Localizacion }) {
  return (
    <div
      className="card-wedding p-6 sm:p-8 flex flex-col gap-4 hover:shadow-md transition-shadow"
      style={{ borderTop: "3px solid var(--bronze)" }}
    >
      {/* Icono + hora */}
      <div className="flex items-start justify-between">
        <div
          className="w-14 h-14 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--bronze-pale)", color: "var(--bronze)" }}
        >
          {ICONOS_LUGAR[loc.icono] ?? ICONOS_LUGAR.iglesia}
        </div>
        <div className="text-right">
          <p
            className="font-display text-3xl font-light"
            style={{ color: "var(--bronze)" }}
          >
            {loc.hora}
          </p>
          <p
            className="smallcaps text-xs tracking-widest"
            style={{ color: "var(--olive-muted)" }}
          >
            {loc.diaSemana}
          </p>
        </div>
      </div>

      {/* Nombre y descripción */}
      <div>
        <p
          className="smallcaps text-xs tracking-widest mb-1"
          style={{ color: "var(--bronze)" }}
        >
          {loc.nombre}
        </p>
        <h3
          className="font-display text-2xl font-light"
          style={{ color: "var(--brown-dark)" }}
        >
          {loc.descripcion}
        </h3>
        <p
          className="text-sm mt-2 font-light"
          style={{ color: "var(--olive-muted)" }}
        >
          {loc.fecha}
        </p>
      </div>

      {/* Dirección + mapa */}
      <div
        className="pt-4 border-t flex items-center justify-between gap-4"
        style={{ borderColor: "var(--cream-dark)" }}
      >
        <p
          className="text-sm font-light flex-1"
          style={{ color: "var(--brown-mid)" }}
        >
          {loc.direccion}
        </p>
        {loc.enlaceMaps && (
          <a
            href={loc.enlaceMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary !py-2 !px-3 !text-xs flex-shrink-0"
          >
            Ver mapa
          </a>
        )}
      </div>
    </div>
  );
}

// ── Subcomponente: evento del timeline ────────────────────────

function EventoTimeline({
  evento,
  esUltimo,
}: {
  evento: EventoTimeline;
  esUltimo: boolean;
}) {
  return (
    <div className="flex gap-4 sm:gap-6">
      {/* Línea + nodo */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: "var(--brown-dark)",
            color: "var(--bronze-light)",
          }}
        >
          {ICONOS_TIMELINE[evento.icono] ?? ICONOS_TIMELINE.rings}
        </div>
        {!esUltimo && (
          <div
            className="w-px flex-1 mt-2 min-h-[2rem]"
            style={{ background: "var(--bronze-pale)" }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Contenido */}
      <div className={`pb-8 ${esUltimo ? "" : ""}`}>
        <p
          className="font-display text-2xl font-light"
          style={{ color: "var(--bronze-light)" }}
        >
          {evento.hora}
        </p>
        <p
          className="font-display text-xl font-light mt-0.5"
          style={{ color: "var(--white)" }}
        >
          {evento.titulo}
        </p>
        <p
          className="text-sm font-light mt-1"
          style={{ color: "var(--olive-muted)" }}
        >
          {evento.descripcion}
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

type SeccionDiaProps = {
  localizaciones: Localizacion[];
  timeline: EventoTimeline[];
};

export function SeccionDia({ localizaciones, timeline }: SeccionDiaProps) {
  return (
    <section
      id="informacion"
      className="section-wedding"
      style={{ backgroundColor: "var(--cream-dark)" }}
    >
      <div className="container-wedding">
        {/* Cabecera */}
        <div className="text-center mb-16">
          <p className="section-subtitle">el gran día</p>
          <h2 className="section-title">Dónde y cuándo</h2>
          <OrnamentoDivisor />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* ── Localizaciones ── */}
          <div className="flex flex-col gap-6">
            <h3
              className="font-display text-lg font-light text-center lg:text-left"
              style={{ color: "var(--brown-mid)" }}
            >
              Los lugares
            </h3>
            {localizaciones.map((loc) => (
              <TarjetaLocalizacion key={loc.id} loc={loc} />
            ))}
          </div>

          {/* ── Timeline ── */}
          <div
            className="p-8 sm:p-10"
            style={{ backgroundColor: "var(--brown-dark)" }}
          >
            <h3
              className="font-display text-lg font-light mb-8 text-center"
              style={{ color: "var(--bronze-pale)" }}
            >
              El orden del día
            </h3>
            {timeline.map((evento, i) => (
              <EventoTimeline
                key={evento.id}
                evento={evento}
                esUltimo={i === timeline.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
