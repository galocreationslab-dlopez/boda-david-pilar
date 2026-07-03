"use client";
/**
 * components/wedding/SeccionHistoria.tsx
 * Visor horizontal paginado de momentos de la historia.
 * Cada página: título, subtítulo (fecha), texto e imagen opcional.
 */

import { useState } from "react";
import Image from "next/image";
import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { EventoHistoria } from "@/config/wedding.config";

type Props = { eventos: EventoHistoria[] };

export function SeccionHistoria({ eventos }: Props) {
  const [actual, setActual] = useState(0);
  const evento = eventos[actual];
  const total = eventos.length;

  const anterior = () => setActual((p) => Math.max(0, p - 1));
  const siguiente = () => setActual((p) => Math.min(total - 1, p + 1));

  return (
    <div className="section-wedding" style={{ backgroundColor: "var(--cream)" }}>
      <div className="container-wedding">
        {/* Cabecera */}
        <div className="text-center mb-10">
          <p className="section-subtitle">nuestra historia</p>
          <h2 className="section-title">El camino hasta aquí</h2>
          <OrnamentoDivisor />
        </div>

        <div className="space-y-6 md:hidden">
          {eventos.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden border"
              style={{
                backgroundColor: "var(--white)",
                borderColor: "var(--cream-dark)",
              }}
            >
              {item.imagen && (
                <div className="relative h-48 w-full">
                  <Image
                    src={`/images/${item.imagen}`}
                    alt={item.titulo}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>
              )}
              <div className="space-y-3 p-6 text-left">
                <p className="smallcaps text-xs tracking-widest" style={{ color: "var(--bronze)" }}>
                  {item.fecha}
                </p>
                <h3 className="font-display text-3xl font-light" style={{ color: "var(--brown-dark)" }}>
                  {item.titulo}
                </h3>
                <p className="font-display text-lg italic font-light leading-relaxed" style={{ color: "var(--brown-mid)" }}>
                  {item.descripcion}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Visor escritorio */}
        <div
          className="relative hidden overflow-hidden md:block"
          style={{
            backgroundColor: "var(--white)",
            border: "1px solid var(--cream-dark)",
          }}
        >
          {/* Slide */}
          <div
            key={actual}
            className="animate-fade-in flex min-h-[380px]"
          >
            {/* Imagen — izquierda o derecha según config */}
            {evento.imagen && evento.lado === "izquierda" && (
              <div className="relative min-h-full w-2/5 flex-shrink-0">
                <Image
                  src={`/images/${evento.imagen}`}
                  alt={evento.titulo}
                  fill
                  className="object-cover"
                  sizes="40vw"
                />
              </div>
            )}

            {/* Texto */}
            <div
              className="flex flex-1 flex-col justify-center p-12"
              style={{ textAlign: evento.lado === "derecha" ? "right" : "left" }}
            >
              {/* Fecha / subtítulo */}
              <p
                className="smallcaps mb-3 text-xs tracking-widest"
                style={{ color: "var(--bronze)" }}
              >
                {evento.fecha}
              </p>

              {/* Título */}
              <h3
                className="font-display mb-4 text-4xl font-light"
                style={{ color: "var(--brown-dark)" }}
              >
                {evento.titulo}
              </h3>

              {/* Descripción */}
              <p
                className="font-display text-xl italic font-light leading-relaxed"
                style={{ color: "var(--brown-mid)" }}
              >
                {evento.descripcion}
              </p>
            </div>

            {/* Imagen — derecha */}
            {evento.imagen && evento.lado === "derecha" && (
              <div className="relative min-h-full w-2/5 flex-shrink-0">
                <Image
                  src={`/images/${evento.imagen}`}
                  alt={evento.titulo}
                  fill
                  className="object-cover"
                  sizes="40vw"
                />
              </div>
            )}

            {/* Placeholder si no hay imagen */}
            {!evento.imagen && (
              <div
                className="flex w-2/5 flex-shrink-0 items-center justify-center"
                style={{ backgroundColor: "var(--cream)" }}
                aria-hidden="true"
              >
                <div style={{ opacity: 0.15 }}>
                  {/* Sello decorativo de fondo */}
                  <svg width="120" height="120" viewBox="0 0 1254 1254" fill="var(--bronze)">
                    <g transform="translate(0,1254) scale(0.1,-0.1)" fill="currentColor" stroke="none">
                      <path d="M4380 9239 c-113 -6 -366 -7 -563 -4 -288 4 -358 3 -355 -7 3 -8 40 -17 99 -24 258 -31 336 -95 359 -296 8 -63 10 -533 8 -1483 l-3 -1390 -23 -68 c-38 -112 -127 -178 -264 -194 -31 -4 -48 -11 -48 -19 0 -12 84 -14 491 -14 388 0 490 3 487 12 -3 7 -26 16 -51 20 -128 18 -207 69 -248 161 l-24 52 -3 721 -3 721 103 -19 c282 -50 611 -63 840 -33 515 68 836 286 958 652 82 245 58 531 -61 735 -109 187 -324 341 -574 412 -193 55 -306 68 -625 71 -162 2 -387 -1 -500 -6z"/>
                    </g>
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Controles de navegación */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: "1px solid var(--cream-dark)" }}
          >
            {/* Flecha anterior */}
            <button
              onClick={anterior}
              disabled={actual === 0}
              className="flex items-center gap-2 transition-opacity"
              style={{
                color: "var(--bronze)",
                opacity: actual === 0 ? 0.3 : 1,
                fontFamily: "var(--font-body)",
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
              aria-label="Momento anterior"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M15 19 L8 12 L15 5" />
              </svg>
              Anterior
            </button>

            {/* Indicadores de página */}
            <div className="flex gap-2">
              {eventos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActual(i)}
                  className="h-2 w-2 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: i === actual ? "var(--bronze)" : "var(--bronze-pale)",
                    transform: i === actual ? "scale(1.3)" : "scale(1)",
                  }}
                  aria-label={`Ir al momento ${i + 1}`}
                />
              ))}
            </div>

            {/* Flecha siguiente */}
            <button
              onClick={siguiente}
              disabled={actual === total - 1}
              className="flex items-center gap-2 transition-opacity"
              style={{
                color: "var(--bronze)",
                opacity: actual === total - 1 ? 0.3 : 1,
                fontFamily: "var(--font-body)",
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
              aria-label="Momento siguiente"
            >
              Siguiente
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9 5 L16 12 L9 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
