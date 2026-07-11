"use client";

import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { PublicGalleryMedia } from "@/lib/wedding-gallery-server";
import type { CSSProperties } from "react";

export type GaleriaComponentKey =
  | "galeria.card"
  | "galeria.imagen"
  | "galeria.titulo"
  | "galeria.subtitulo";

type Props = {
  media: PublicGalleryMedia[];
  viewport?: "desktop" | "movil";
  editable?: boolean;
  designMode?: boolean;
  selectedComponentKey?: GaleriaComponentKey | null;
  onSelectComponent?: (key: GaleriaComponentKey) => void;
  componentStyles?: Partial<Record<GaleriaComponentKey, CSSProperties>>;
  onEditTexto?: (itemId: string, value: string) => void;
  onRequestEditImagen?: (itemId: string) => void;
  onSelectItem?: (itemId: string) => void;
};

export function SeccionGaleria({
  media,
  viewport,
  editable = false,
  designMode = false,
  selectedComponentKey,
  onSelectComponent,
  componentStyles,
  onEditTexto,
  onRequestEditImagen,
  onSelectItem,
}: Props) {
  const galleryGridClass = viewport === "movil" ? "grid gap-4 grid-cols-1" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  const styleFor = (key: GaleriaComponentKey, base: CSSProperties = {}): CSSProperties => ({
    ...base,
    ...(componentStyles?.[key] ?? {}),
    ...(designMode && selectedComponentKey === key
      ? { outline: "2px solid #b45309", outlineOffset: "2px", borderRadius: "10px" }
      : {}),
    ...(designMode ? { cursor: "pointer" } : {}),
  });

  const select = (key: GaleriaComponentKey) => {
    if (!designMode) return;
    onSelectComponent?.(key);
  };

  return (
    <div className="section-wedding" style={{ backgroundColor: "var(--cream)" }}>
      <div className="container-wedding">
        <div className="text-center mb-14">
          <p className="section-subtitle">galería</p>
          <h2 className="section-title">Momentos compartidos</h2>
          <OrnamentoDivisor />
        </div>

        {media.length === 0 ? (
          <p className="text-center text-sm text-stone-500">Todavía no hay imágenes seleccionadas para la galería.</p>
        ) : (
          <div className={galleryGridClass}>
            {media.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" style={styleFor("galeria.card")} onClick={() => select("galeria.card")}>
                <div className="relative aspect-[4/3] bg-stone-100" style={styleFor("galeria.imagen")} onClick={(event) => { event.stopPropagation(); select("galeria.imagen"); }}>
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
                  {item.tipo === "video" ? (
                    <video className="h-full w-full object-cover" controls src={item.url_publica ?? undefined} />
                  ) : (
                    <img
                      src={item.url_publica ?? ""}
                      alt={item.nombre}
                      className="h-full w-full object-cover"
                      onClick={(event) => {
                        if (designMode) return;
                        if (!editable) return;
                        event.preventDefault();
                        event.stopPropagation();
                        onSelectItem?.(item.id);
                        onRequestEditImagen?.(item.id);
                      }}
                    />
                  )}
                </div>
                <div className="space-y-1 p-4">
                  <p
                    className="font-display text-xl font-light text-stone-800"
                    style={styleFor("galeria.titulo")}
                    contentEditable={!designMode && editable}
                    suppressContentEditableWarning={true}
                    onClick={(event) => {
                      if (designMode) {
                        event.stopPropagation();
                        select("galeria.titulo");
                        return;
                      }
                      if (!editable) return;
                      event.stopPropagation();
                      onSelectItem?.(item.id);
                    }}
                    onBlur={(event) => {
                      if (!editable) return;
                      onEditTexto?.(item.id, event.currentTarget.textContent ?? "");
                    }}
                  >
                    {item.nombre}
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-400" style={styleFor("galeria.subtitulo")} onClick={(event) => { event.stopPropagation(); select("galeria.subtitulo"); }}>{item.subido_por ?? "Galería"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}