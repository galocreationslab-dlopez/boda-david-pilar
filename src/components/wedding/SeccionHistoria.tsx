/**
 * components/wedding/SeccionHistoria.tsx
 * ─────────────────────────────────────────────────────────────
 * Timeline visual de la historia de la pareja.
 * Alterna izquierda/derecha en escritorio, columna en móvil.
 * Recibe los eventos como prop — no lee la config directamente.
 */

import Image from "next/image";
import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { EventoHistoria } from "@/config/wedding.config";

type SeccionHistoriaProps = {
  eventos: EventoHistoria[];
};

const ICONOS_SVG: Record<string, React.ReactNode> = {
  default: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.26 3.26 1 6.191 1c1.922 0 3.51 1.007 4.57 2.077C11.81 4.092 11.965 4.5 12 4.5s.19-.408.239-.423C13.3 3.007 14.888 1 16.81 1 19.74 1 22 3.26 22 7.191c0 4.105-5.37 8.863-11 14.402z" fill="currentColor" opacity="0.7"/>
    </svg>
  ),
};

export function SeccionHistoria({ eventos }: SeccionHistoriaProps) {
  return (
    <section
      id="historia"
      className="section-wedding"
      style={{ backgroundColor: "var(--cream)" }}
    >
      <div className="container-wedding">
        {/* Cabecera */}
        <div className="text-center mb-16">
          <p className="section-subtitle">nuestra historia</p>
          <h2 className="section-title">El camino hasta aquí</h2>
          <OrnamentoDivisor />
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Línea central vertical — solo escritorio */}
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
            style={{ background: "linear-gradient(to bottom, transparent, var(--bronze-pale), transparent)" }}
            aria-hidden="true"
          />

          <div className="flex flex-col gap-12 md:gap-16">
            {eventos.map((evento, index) => {
              const esDerecha = evento.lado === "derecha";

              return (
                <div
                  key={evento.id}
                  className={`relative flex flex-col md:flex-row items-center gap-6 md:gap-0 ${
                    esDerecha ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Contenido */}
                  <div
                    className={`w-full md:w-5/12 ${
                      esDerecha ? "md:pr-12 md:text-right" : "md:pl-12 md:text-left"
                    }`}
                  >
                    <div
                      className="card-wedding p-6 sm:p-8 relative"
                      style={{
                        borderLeft: esDerecha ? "none" : "3px solid var(--bronze-pale)",
                        borderRight: esDerecha ? "3px solid var(--bronze-pale)" : "none",
                      }}
                    >
                      {/* Fecha */}
                      <p
                        className="smallcaps text-xs tracking-widest mb-2"
                        style={{ color: "var(--bronze)" }}
                      >
                        {evento.fecha}
                      </p>

                      {/* Título */}
                      <h3
                        className="font-display text-2xl font-light mb-3"
                        style={{ color: "var(--brown-dark)" }}
                      >
                        {evento.titulo}
                      </h3>

                      {/* Descripción */}
                      <p
                        className="font-display text-lg italic font-light leading-relaxed"
                        style={{ color: "var(--brown-mid)" }}
                      >
                        {evento.descripcion}
                      </p>

                      {/* Imagen opcional */}
                      {evento.imagen && (
                        <div className="mt-4 overflow-hidden aspect-[3/2] relative">
                          <Image
                            src={`/images/${evento.imagen}`}
                            alt={evento.titulo}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 40vw"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nodo central — solo escritorio */}
                  <div className="hidden md:flex w-2/12 justify-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center z-10 flex-shrink-0"
                      style={{
                        backgroundColor: "var(--bronze)",
                        color: "var(--white)",
                        boxShadow: "0 0 0 4px var(--cream), 0 0 0 5px var(--bronze-pale)",
                      }}
                    >
                      {ICONOS_SVG.default}
                    </div>
                  </div>

                  {/* Espacio opuesto */}
                  <div className="hidden md:block w-5/12" />

                  {/* Número de orden — móvil */}
                  <div
                    className="md:hidden w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 order-first"
                    style={{
                      backgroundColor: "var(--bronze)",
                      color: "var(--white)",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-display)",
                    }}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
