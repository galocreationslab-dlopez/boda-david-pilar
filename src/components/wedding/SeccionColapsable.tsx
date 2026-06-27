"use client";
/**
 * components/wedding/SeccionColapsable.tsx
 * Envuelve cualquier sección con cabecera colapsable.
 * La portada (ocultarCabecera=true) no muestra cabecera.
 */

import { useState } from "react";

type Props = {
  id: string;
  titulo?: string;
  abiertaPorDefecto: boolean;
  ocultarCabecera?: boolean;
  bgColor?: string;
  children: React.ReactNode;
};

export function SeccionColapsable({
  id,
  titulo,
  abiertaPorDefecto,
  ocultarCabecera = false,
  bgColor = "var(--cream)",
  children,
}: Props) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);

  return (
    <section id={id} style={{ backgroundColor: bgColor }}>
      {/* Cabecera colapsable — oculta en la portada */}
      {!ocultarCabecera && (
        <button
          onClick={() => setAbierta(!abierta)}
          className="w-full flex items-center justify-between px-6 sm:px-12 py-5 group"
          style={{
            borderBottom: abierta ? "1px solid var(--cream-dark)" : "none",
            backgroundColor: bgColor,
          }}
          aria-expanded={abierta}
          aria-controls={`contenido-${id}`}
        >
          <span
            className="font-display text-2xl sm:text-3xl font-light"
            style={{ color: "var(--brown-dark)" }}
          >
            {titulo}
          </span>

          {/* Icono + / - */}
          <span
            className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-all duration-300"
            style={{
              border: "1px solid var(--bronze-pale)",
              color: "var(--bronze)",
            }}
            aria-hidden="true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={`transition-transform duration-300 ${abierta ? "rotate-180" : ""}`}
            >
              <path d={abierta ? "M2 9 L7 4 L12 9" : "M2 5 L7 10 L12 5"} />
            </svg>
          </span>
        </button>
      )}

      {/* Contenido animado */}
      <div
        id={`contenido-${id}`}
        className="overflow-hidden transition-all duration-500"
        style={{
          maxHeight: abierta ? "9999px" : "0",
          opacity: abierta ? 1 : 0,
        }}
      >
        {children}
      </div>
    </section>
  );
}
