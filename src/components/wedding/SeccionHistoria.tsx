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
import type { CSSProperties } from "react";

export type HistoriaComponentKey =
  | "historia.tituloSeccion"
  | "historia.tituloInterno"
  | "historia.card"
  | "historia.fecha"
  | "historia.titulo"
  | "historia.descripcion"
  | "historia.imagen"
  | "historia.navegacion";

type Props = {
  eventos: EventoHistoria[];
  viewport?: "desktop" | "movil";
  editable?: boolean;
  designMode?: boolean;
  selectedComponentKey?: HistoriaComponentKey | null;
  onSelectComponent?: (key: HistoriaComponentKey) => void;
  componentStyles?: Partial<Record<HistoriaComponentKey, CSSProperties>>;
  sectionInternalTitle?: string;
  onEditSectionInternalTitle?: (value: string) => void;
  onEditTexto?: (id: string, field: "fecha" | "titulo" | "descripcion", value: string) => void;
  onRequestEditImagen?: (id: string) => void;
  onSelectItem?: (id: string) => void;
};

function resolveImageSrc(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }
  return `/images/${value}`;
}

export function SeccionHistoria({
  eventos,
  viewport,
  editable = false,
  designMode = false,
  selectedComponentKey,
  onSelectComponent,
  componentStyles,
  sectionInternalTitle,
  onEditSectionInternalTitle,
  onEditTexto,
  onRequestEditImagen,
  onSelectItem,
}: Props) {
  const [actual, setActual] = useState(0);
  const evento = eventos[actual];
  const total = eventos.length;
  const forceMobile = viewport === "movil";

  const styleFor = (key: HistoriaComponentKey, base: CSSProperties = {}): CSSProperties => ({
    ...base,
    ...(componentStyles?.[key] ?? {}),
    ...(designMode && selectedComponentKey === key
      ? { outline: "2px solid #b45309", outlineOffset: "2px", borderRadius: "8px" }
      : {}),
    ...(designMode ? { cursor: "pointer" } : {}),
  });

  const select = (key: HistoriaComponentKey) => {
    if (!designMode) return;
    onSelectComponent?.(key);
  };

  const anterior = () => {
    if (designMode) return;
    setActual((p) => Math.max(0, p - 1));
  };
  const siguiente = () => {
    if (designMode) return;
    setActual((p) => Math.min(total - 1, p + 1));
  };

  return (
    <div className="section-wedding" style={{ backgroundColor: "var(--cream)" }}>
      <div className="container-wedding">
        {/* Cabecera */}
        <div className="text-center mb-10">
          <h2
            className="section-title"
            style={styleFor("historia.tituloInterno")}
            contentEditable={!designMode && editable}
            suppressContentEditableWarning={true}
            onClick={() => {
              if (designMode) {
                select("historia.tituloInterno");
              }
            }}
            onBlur={(event) => {
              if (!editable || designMode) return;
              onEditSectionInternalTitle?.(event.currentTarget.textContent ?? "");
            }}
          >
            {sectionInternalTitle || "El camino hasta aquí"}
          </h2>
          <OrnamentoDivisor />
        </div>

        <div className={forceMobile ? "space-y-6" : "space-y-6 md:hidden"}>
          {eventos.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden border"
              style={styleFor("historia.card", {
                backgroundColor: "var(--white)",
                borderColor: "var(--cream-dark)",
              })}
              onClick={() => select("historia.card")}
            >
              {item.imagen && (
                <div
                  className="relative h-48 w-full"
                  style={styleFor("historia.imagen")}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (designMode) {
                      select("historia.imagen");
                      return;
                    }
                    if (!editable) return;
                    onSelectItem?.(item.id);
                    onRequestEditImagen?.(item.id);
                  }}
                >
                  {!designMode && editable && (
                    <>
                      <button
                        type="button"
                        className="absolute inset-0 z-20"
                        aria-label="Cambiar imagen"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onSelectItem?.(item.id);
                          onRequestEditImagen?.(item.id);
                        }}
                      />
                      <button
                        type="button"
                        className="pointer-events-none absolute right-2 top-2 z-30 rounded border border-white/70 bg-black/50 px-2 py-1 text-[11px] text-white backdrop-blur-sm"
                        tabIndex={-1}
                      >
                        Cambiar imagen
                      </button>
                    </>
                  )}
                  <Image
                    src={resolveImageSrc(item.imagen)}
                    alt={item.titulo}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    onClick={() => {
                      if (designMode) return;
                      if (!editable) return;
                      onSelectItem?.(item.id);
                      onRequestEditImagen?.(item.id);
                    }}
                  />
                </div>
              )}
              <div className="space-y-3 p-6 text-left">
                <p
                  className="smallcaps text-xs tracking-widest"
                  style={styleFor("historia.fecha", { color: "var(--bronze)" })}
                  contentEditable={!designMode && editable}
                  suppressContentEditableWarning={true}
                  onClick={() => {
                    if (designMode) {
                      select("historia.fecha");
                      return;
                    }
                    onSelectItem?.(item.id);
                  }}
                  onBlur={(event) => onEditTexto?.(item.id, "fecha", event.currentTarget.textContent ?? "")}
                >
                  {item.fecha}
                </p>
                <h3
                  className="font-display text-3xl font-light"
                  style={styleFor("historia.titulo", { color: "var(--brown-dark)" })}
                  contentEditable={!designMode && editable}
                  suppressContentEditableWarning={true}
                  onClick={() => {
                    if (designMode) {
                      select("historia.titulo");
                      return;
                    }
                    onSelectItem?.(item.id);
                  }}
                  onBlur={(event) => onEditTexto?.(item.id, "titulo", event.currentTarget.textContent ?? "")}
                >
                  {item.titulo}
                </h3>
                <p
                  className="font-display text-lg italic font-light leading-relaxed"
                  style={styleFor("historia.descripcion", { color: "var(--brown-mid)" })}
                  contentEditable={!designMode && editable}
                  suppressContentEditableWarning={true}
                  onClick={() => {
                    if (designMode) {
                      select("historia.descripcion");
                      return;
                    }
                    onSelectItem?.(item.id);
                  }}
                  onBlur={(event) => onEditTexto?.(item.id, "descripcion", event.currentTarget.textContent ?? "")}
                >
                  {item.descripcion}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Visor escritorio */}
        <div
          className={forceMobile ? "hidden" : "relative hidden overflow-hidden md:block"}
          style={styleFor("historia.card", {
            backgroundColor: "var(--white)",
            border: "1px solid var(--cream-dark)",
          })}
          onClick={() => select("historia.card")}
        >
          {/* Slide */}
          <div
            key={actual}
            className="animate-fade-in flex min-h-[380px]"
          >
            {/* Imagen — izquierda o derecha según config */}
            {evento.imagen && evento.lado === "izquierda" && (
              <div
                className="relative min-h-full w-2/5 flex-shrink-0"
                style={styleFor("historia.imagen")}
                onClick={(event) => {
                  event.stopPropagation();
                  if (designMode) {
                    select("historia.imagen");
                    return;
                  }
                  if (!editable) return;
                  onSelectItem?.(evento.id);
                  onRequestEditImagen?.(evento.id);
                }}
              >
                {!designMode && editable && (
                  <>
                    <button
                      type="button"
                      className="absolute inset-0 z-20"
                      aria-label="Cambiar imagen"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSelectItem?.(evento.id);
                        onRequestEditImagen?.(evento.id);
                      }}
                    />
                    <button
                      type="button"
                      className="pointer-events-none absolute right-2 top-2 z-30 rounded border border-white/70 bg-black/50 px-2 py-1 text-[11px] text-white backdrop-blur-sm"
                      tabIndex={-1}
                    >
                      Cambiar imagen
                    </button>
                  </>
                )}
                <Image
                  src={resolveImageSrc(evento.imagen)}
                  alt={evento.titulo}
                  fill
                  className="object-cover"
                  sizes="40vw"
                  onClick={() => {
                    if (designMode) return;
                    if (!editable) return;
                    onSelectItem?.(evento.id);
                    onRequestEditImagen?.(evento.id);
                  }}
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
                style={styleFor("historia.fecha", { color: "var(--bronze)" })}
                contentEditable={!designMode && editable}
                suppressContentEditableWarning={true}
                onClick={() => {
                  if (designMode) {
                    select("historia.fecha");
                    return;
                  }
                  onSelectItem?.(evento.id);
                }}
                onBlur={(event) => onEditTexto?.(evento.id, "fecha", event.currentTarget.textContent ?? "")}
              >
                {evento.fecha}
              </p>

              {/* Título */}
              <h3
                className="font-display mb-4 text-4xl font-light"
                style={styleFor("historia.titulo", { color: "var(--brown-dark)" })}
                contentEditable={!designMode && editable}
                suppressContentEditableWarning={true}
                onClick={() => {
                  if (designMode) {
                    select("historia.titulo");
                    return;
                  }
                  onSelectItem?.(evento.id);
                }}
                onBlur={(event) => onEditTexto?.(evento.id, "titulo", event.currentTarget.textContent ?? "")}
              >
                {evento.titulo}
              </h3>

              {/* Descripción */}
              <p
                className="font-display text-xl italic font-light leading-relaxed"
                style={styleFor("historia.descripcion", { color: "var(--brown-mid)" })}
                contentEditable={!designMode && editable}
                suppressContentEditableWarning={true}
                onClick={() => {
                  if (designMode) {
                    select("historia.descripcion");
                    return;
                  }
                  onSelectItem?.(evento.id);
                }}
                onBlur={(event) => onEditTexto?.(evento.id, "descripcion", event.currentTarget.textContent ?? "")}
              >
                {evento.descripcion}
              </p>
            </div>

            {/* Imagen — derecha */}
            {evento.imagen && evento.lado === "derecha" && (
              <div
                className="relative min-h-full w-2/5 flex-shrink-0"
                style={styleFor("historia.imagen")}
                onClick={(event) => {
                  event.stopPropagation();
                  if (designMode) {
                    select("historia.imagen");
                    return;
                  }
                  if (!editable) return;
                  onSelectItem?.(evento.id);
                  onRequestEditImagen?.(evento.id);
                }}
              >
                {!designMode && editable && (
                  <>
                    <button
                      type="button"
                      className="absolute inset-0 z-20"
                      aria-label="Cambiar imagen"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSelectItem?.(evento.id);
                        onRequestEditImagen?.(evento.id);
                      }}
                    />
                    <button
                      type="button"
                      className="pointer-events-none absolute right-2 top-2 z-30 rounded border border-white/70 bg-black/50 px-2 py-1 text-[11px] text-white backdrop-blur-sm"
                      tabIndex={-1}
                    >
                      Cambiar imagen
                    </button>
                  </>
                )}
                <Image
                  src={resolveImageSrc(evento.imagen)}
                  alt={evento.titulo}
                  fill
                  className="object-cover"
                  sizes="40vw"
                  onClick={() => {
                    if (designMode) return;
                    if (!editable) return;
                    onSelectItem?.(evento.id);
                    onRequestEditImagen?.(evento.id);
                  }}
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
              style={styleFor("historia.navegacion", {
                color: "var(--bronze)",
                opacity: actual === 0 ? 0.3 : 1,
                fontFamily: "var(--font-body)",
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              })}
              onClickCapture={() => {
                if (designMode) select("historia.navegacion");
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
              style={styleFor("historia.navegacion", {
                color: "var(--bronze)",
                opacity: actual === total - 1 ? 0.3 : 1,
                fontFamily: "var(--font-body)",
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              })}
              onClickCapture={() => {
                if (designMode) select("historia.navegacion");
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
