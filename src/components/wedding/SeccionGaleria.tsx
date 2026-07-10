"use client";

import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { PublicGalleryMedia } from "@/lib/wedding-gallery-server";

type Props = {
  media: PublicGalleryMedia[];
  viewport?: "desktop" | "movil";
  editable?: boolean;
  onEditTexto?: (itemId: string, value: string) => void;
  onRequestEditImagen?: (itemId: string) => void;
  onSelectItem?: (itemId: string) => void;
};

export function SeccionGaleria({ media, viewport, editable = false, onEditTexto, onRequestEditImagen, onSelectItem }: Props) {
  const galleryGridClass = viewport === "movil" ? "grid gap-4 grid-cols-1" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

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
              <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="aspect-[4/3] bg-stone-100">
                  {item.tipo === "video" ? (
                    <video className="h-full w-full object-cover" controls src={item.url_publica ?? undefined} />
                  ) : (
                    <img
                      src={item.url_publica ?? ""}
                      alt={item.nombre}
                      className="h-full w-full object-cover"
                      onClick={(event) => {
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
                    contentEditable={editable}
                    suppressContentEditableWarning={true}
                    onClick={(event) => {
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
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-400">{item.subido_por ?? "Galería"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}