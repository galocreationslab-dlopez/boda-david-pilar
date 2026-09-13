"use client";

import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { PublicGalleryMedia } from "@/lib/wedding-gallery-server";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

type PrivateMediaItem = {
  id: string;
  nombre: string;
  tipo: "foto" | "video" | "audio";
  url_publica: string | null;
  created_at: string;
};

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
  headerDivider?: ReactNode;
  galeriaConfig?: {
    mostrarSeleccionNovios: boolean;
    mostrarSubidasPorMi: boolean;
  };
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
  headerDivider,
  galeriaConfig = { mostrarSeleccionNovios: true, mostrarSubidasPorMi: true },
}: Props) {
  const galleryGridClass = viewport === "movil" ? "grid gap-4 grid-cols-1" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [tab, setTab] = useState<"seleccion" | "privada">("seleccion");
  const [privateMedia, setPrivateMedia] = useState<PrivateMediaItem[]>([]);
  const [loadingPrivate, setLoadingPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (designMode) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("inviteCode") || params.get("invitecode") || null;
    setInviteCode(code);
  }, [designMode]);

  const showTabs = Boolean(inviteCode) && galeriaConfig.mostrarSeleccionNovios && galeriaConfig.mostrarSubidasPorMi;
  const effectiveTab: "seleccion" | "privada" = showTabs
    ? tab
    : galeriaConfig.mostrarSubidasPorMi && Boolean(inviteCode) && !galeriaConfig.mostrarSeleccionNovios
      ? "privada"
      : "seleccion";

  const loadPrivateMedia = useCallback(async () => {
    if (!inviteCode) return;
    setLoadingPrivate(true);
    try {
      const response = await fetch(`/api/rsvp/${inviteCode}/media`);
      if (!response.ok) return;
      const data = await response.json();
      setPrivateMedia(Array.isArray(data.media) ? data.media : []);
    } finally {
      setLoadingPrivate(false);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (effectiveTab === "privada" && inviteCode) {
      void loadPrivateMedia();
    }
  }, [effectiveTab, inviteCode, loadPrivateMedia]);

  const uploadFiles = async (files: FileList | null) => {
    if (!inviteCode || !files || files.length === 0) return;
    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      const response = await fetch(`/api/rsvp/${inviteCode}/media`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron subir los archivos");
      await loadPrivateMedia();
      setFeedback("Archivos subidos correctamente.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error al subir archivos");
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!inviteCode) return;
    if (!confirm("¿Eliminar este archivo?")) return;
    const response = await fetch(`/api/rsvp/${inviteCode}/media`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId }),
    });
    if (response.ok) {
      await loadPrivateMedia();
      setFeedback("Archivo eliminado.");
    }
  };

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
          {headerDivider !== undefined ? headerDivider : <OrnamentoDivisor />}
        </div>

        {showTabs && (
          <div className="mb-8 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setTab("seleccion")}
              className={`rounded-full px-4 py-2 text-sm ${effectiveTab === "seleccion" ? "bg-stone-800 text-white" : "border border-stone-300 text-stone-600"}`}
            >
              Selección de los novios
            </button>
            <button
              type="button"
              onClick={() => setTab("privada")}
              className={`rounded-full px-4 py-2 text-sm ${effectiveTab === "privada" ? "bg-stone-800 text-white" : "border border-stone-300 text-stone-600"}`}
            >
              Galería privada
            </button>
          </div>
        )}

        {feedback && effectiveTab === "privada" && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">{feedback}</div>
        )}

        {effectiveTab === "seleccion" ? (
          media.length === 0 ? (
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
          )
        ) : (
          <div className="space-y-6">
            <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-4">
              <label className="block text-sm font-medium text-stone-700">Sube tus fotos o vídeos (sin compresión)</label>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  void uploadFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
                className="mt-3 block w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm"
              />
              <p className="mt-2 text-xs text-stone-500">Solo tu invitación puede ver y borrar estas subidas.</p>
              {uploading && <p className="mt-2 text-sm text-stone-500">Subiendo archivos...</p>}
            </div>

            {loadingPrivate ? (
              <p className="text-center text-sm text-stone-500">Cargando tus fotos...</p>
            ) : privateMedia.length === 0 ? (
              <p className="text-center text-sm text-stone-500">Aún no has subido nada.</p>
            ) : (
              <div className={galleryGridClass}>
                {privateMedia.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="aspect-[4/3] bg-stone-100">
                      {item.tipo === "video" ? (
                        <video src={item.url_publica ?? undefined} className="h-full w-full object-cover" controls />
                      ) : (
                        <img src={item.url_publica ?? ""} alt={item.nombre} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <p className="truncate text-sm font-medium text-stone-800">{item.nombre}</p>
                      <button type="button" onClick={() => void deleteMedia(item.id)} className="text-xs text-red-500 hover:text-red-700">
                        Retirar archivo
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
