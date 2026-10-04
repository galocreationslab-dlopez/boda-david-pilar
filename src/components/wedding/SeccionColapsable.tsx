"use client";
/**
 * components/wedding/SeccionColapsable.tsx
 * Envuelve cualquier sección con cabecera colapsable.
 * La portada (ocultarCabecera=true) no muestra cabecera.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const SectionChainContext = createContext<{
  ids: string[];
  abierta: boolean;
  setAbierta: React.Dispatch<React.SetStateAction<boolean>>;
} | null>(null);

export function SectionChain({ ids, abiertaPorDefecto, children }: {
  ids: string[];
  abiertaPorDefecto: boolean;
  children: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);
  useEffect(() => {
    setAbierta(abiertaPorDefecto);
  }, [abiertaPorDefecto]);
  return (
    <SectionChainContext.Provider value={ids.length > 1 ? { ids, abierta, setAbierta } : null}>
      {children}
    </SectionChainContext.Provider>
  );
}

export function SectionChainDecoration({ children }: { children: React.ReactNode }) {
  const chain = useContext(SectionChainContext);
  return <div hidden={chain ? !chain.abierta : false}>{children}</div>;
}

type Props = {
  id: string;
  anchorAliases?: string[];
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
  afterContent?: React.ReactNode;
  children: React.ReactNode;
};

export function SeccionColapsable({
  id,
  anchorAliases = [],
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
  afterContent,
  children,
}: Props) {
  const chain = useContext(SectionChainContext);
  const [abiertaLocal, setAbiertaLocal] = useState(abiertaPorDefecto);
  const abierta = chain?.abierta ?? abiertaLocal;
  const setAbierta = chain?.setAbierta ?? setAbiertaLocal;
  const esContinuacion = Boolean(chain && chain.ids[0] !== id);
  const anchorAliasesKey = anchorAliases.join("\n");
  const sectionRef = useRef<HTMLElement | null>(null);
  const texClass = bgColor === "var(--cream)" ? "tex-cream" : bgColor === "var(--cream-dark)" ? "tex-cream-dark" : bgColor === "var(--white)" ? "tex-white" : "";

  useEffect(() => {
    setAbiertaLocal(abiertaPorDefecto);
  }, [abiertaPorDefecto]);

  // Enlaces del menu de navegacion deben desplegar la seccion antes de saltar a ella.
  // El evento "seccion:abrir" cubre la navegacion in-app (Next no dispara "hashchange" via pushState);
  // el chequeo de hash cubre cargas de pagina completas (ej. llegar directamente a "/#historia").
  useEffect(() => {
    const isDestination = (anchor: string) => anchor === id || anchorAliasesKey.split("\n").includes(anchor);
    const abrirYDesplazar = () => {
      setAbierta(true);
      window.setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    };
    const abrirSiEsElDestino = () => {
      if (typeof window !== "undefined" && window.location.hash && isDestination(window.location.hash.slice(1))) abrirYDesplazar();
    };
    const abrirPorEvento = (event: Event) => {
      const anchorId = (event as CustomEvent<{ anchorId: string }>).detail?.anchorId;
      if (anchorId && isDestination(anchorId)) abrirYDesplazar();
    };
    abrirSiEsElDestino();
    window.addEventListener("hashchange", abrirSiEsElDestino);
    window.addEventListener("seccion:abrir", abrirPorEvento);
    return () => {
      window.removeEventListener("hashchange", abrirSiEsElDestino);
      window.removeEventListener("seccion:abrir", abrirPorEvento);
    };
  }, [id, anchorAliasesKey, setAbierta]);

  return (
    <section
      id={id}
      className={texClass}
      ref={(node) => {
        sectionRef.current = node;
      }}
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
      {!ocultarCabecera && !esContinuacion && (
        <button
          onClick={() => setAbierta(!abierta)}
          className={`group flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-12 sm:py-5 ${texClass}`}
          style={{
            borderBottom: abierta ? "1px solid var(--cream-dark)" : "none",
            backgroundColor: bgColor,
            ...(sectionStyle ?? {}),
          }}
          aria-expanded={abierta}
          aria-controls={chain ? chain.ids.map((sectionId) => `contenido-${sectionId}`).join(" ") : `contenido-${id}`}
        >
          <span
            className="font-display text-left font-light"
            style={{
              color: "var(--brown-dark)",
              ...(titleStyle ?? {}),
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.25rem, 3vw, 1.875rem)",
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
        className="grid transition-[grid-template-rows,opacity] duration-500 motion-reduce:transition-none"
        inert={!abierta}
        aria-hidden={!abierta}
        style={{
          gridTemplateRows: abierta ? "1fr" : "0fr",
          opacity: abierta ? 1 : 0,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          {children}
          {afterContent}
        </div>
      </div>
    </section>
  );
}
