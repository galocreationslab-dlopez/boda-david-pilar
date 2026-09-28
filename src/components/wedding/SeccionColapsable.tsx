"use client";
/**
 * components/wedding/SeccionColapsable.tsx
 * Envuelve cualquier sección con cabecera colapsable.
 * La portada (ocultarCabecera=true) no muestra cabecera.
 */

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useAccordionSectionsContext } from "@/contexts/AccordionSectionsContext";

type Props = {
  id: string;
  titulo?: string;
  abiertaPorDefecto: boolean;
  ocultarCabecera?: boolean;
  bgColor?: string;
  designMode?: boolean;
  sectionStyle?: CSSProperties;
  sectionSelected?: boolean;
  titleStyle?: CSSProperties;
  titleSelected?: boolean;
  editableTitle?: boolean;
  onChangeTitle?: (value: string) => void;
  onSelectTitle?: () => void;
  onSelectTitleDesign?: () => void;
  onSelectSectionBackground?: () => void;
  children: React.ReactNode;
};

export function SeccionColapsable({
  id,
  titulo,
  abiertaPorDefecto,
  ocultarCabecera = false,
  bgColor = "var(--cream)",
  designMode = false,
  sectionStyle,
  sectionSelected = false,
  titleStyle,
  titleSelected = false,
  editableTitle = false,
  onChangeTitle,
  onSelectTitle,
  onSelectTitleDesign,
  onSelectSectionBackground,
  children,
}: Props) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);

  useEffect(() => {
    setAbierta(abiertaPorDefecto);
  }, [abiertaPorDefecto]);

  // La portada (ocultarCabecera) queda fuera del acordeón: siempre visible y sin
  // afectar/ser afectada por el resto de secciones colapsables.
  const accordion = useAccordionSectionsContext();
  const usaAcordeonCompartido = Boolean(accordion) && !ocultarCabecera;
  const abiertaEfectiva = usaAcordeonCompartido ? accordion!.openId === id : abierta;

  const alternar = () => {
    if (usaAcordeonCompartido) {
      accordion!.setOpenId(abiertaEfectiva ? null : id);
      return;
    }
    setAbierta((prev) => !prev);
  };

  return (
    <section
      id={id}
      style={{
        backgroundColor: bgColor,
        ...(sectionStyle ?? {}),
        ...(designMode && sectionSelected
          ? { outline: "2px solid #b45309", outlineOffset: "3px", borderRadius: "8px" }
          : {}),
        ...(designMode ? { cursor: "pointer" } : {}),
      }}
      onClick={() => {
        if (!designMode) return;
        onSelectSectionBackground?.();
      }}
    >
      {/* Cabecera colapsable — oculta en la portada */}
      {!ocultarCabecera && (
        <button
          onClick={alternar}
          className="group flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-12 sm:py-5"
          style={{
            borderBottom: abiertaEfectiva ? "1px solid var(--cream-dark)" : "none",
            backgroundColor: bgColor,
            ...(sectionStyle ?? {}),
          }}
          aria-expanded={abiertaEfectiva}
          aria-controls={`contenido-${id}`}
        >
          <span
            className="font-display text-left text-xl font-light sm:text-3xl"
            style={{
              color: "var(--brown-dark)",
              ...(titleStyle ?? {}),
              ...(designMode && titleSelected
                ? { outline: "2px solid #b45309", outlineOffset: "3px", borderRadius: "8px" }
                : {}),
              ...(designMode ? { cursor: "pointer" } : {}),
            }}
            contentEditable={editableTitle}
            suppressContentEditableWarning={true}
            onClick={(event) => {
              if (designMode) {
                event.stopPropagation();
                onSelectTitleDesign?.();
                return;
              }
              if (!editableTitle) return;
              event.stopPropagation();
              onSelectTitle?.();
            }}
            onBlur={(event) => {
              if (!editableTitle) return;
              onChangeTitle?.(event.currentTarget.textContent ?? "");
            }}
          >
            {titulo}
          </span>

          {/* Icono + / - */}
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300"
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
              className={`transition-transform duration-300 ${abiertaEfectiva ? "rotate-180" : ""}`}
            >
              <path d={abiertaEfectiva ? "M2 9 L7 4 L12 9" : "M2 5 L7 10 L12 5"} />
            </svg>
          </span>
        </button>
      )}

      {/* Contenido animado */}
      <div
        id={`contenido-${id}`}
        className="overflow-hidden transition-all duration-500"
        style={{
          maxHeight: abiertaEfectiva ? "9999px" : "0",
          opacity: abiertaEfectiva ? 1 : 0,
        }}
      >
        {children}
      </div>
    </section>
  );
}
