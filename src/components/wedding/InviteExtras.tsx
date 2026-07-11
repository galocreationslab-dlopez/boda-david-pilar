"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type MessageItem = {
  id: string;
  author_role: "guest" | "admin";
  author_name?: string | null;
  contenido: string;
  created_at: string;
};

type MediaItem = {
  id: string;
  nombre: string;
  tipo: "foto" | "video" | "audio";
  url_publica: string | null;
  created_at: string;
};

type Props = {
  inviteCode: string;
  invitacionNombre: string;
  galeriaConfig: {
    mostrarSeleccionNovios: boolean;
    mostrarSubidasPorMi: boolean;
  };
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InviteExtras({ inviteCode, invitacionNombre, galeriaConfig }: Props) {
  const [tab, setTab] = useState<"chat" | "media">("chat");
  const [galleryTab, setGalleryTab] = useState<"seleccion" | "mias">(
    galeriaConfig.mostrarSeleccionNovios ? "seleccion" : "mias",
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState("");
  const [myMedia, setMyMedia] = useState<MediaItem[]>([]);
  const [featuredMedia, setFeaturedMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hasMyUploads = useMemo(() => myMedia.length > 0, [myMedia]);
  const hasFeatured = useMemo(() => featuredMedia.length > 0, [featuredMedia]);

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/rsvp/${inviteCode}/messages`);
    if (!response.ok) return;
    const data = await response.json();
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, [inviteCode]);

  const loadMedia = useCallback(async () => {
    const response = await fetch(`/api/rsvp/${inviteCode}/media`);
    if (!response.ok) return;
    const data = await response.json();
    setMyMedia(Array.isArray(data.media) ? data.media : []);
    setFeaturedMedia(Array.isArray(data.featured) ? data.featured : []);
  }, [inviteCode]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setLoading(true);
      await Promise.all([loadMessages(), loadMedia()]);
      if (active) setLoading(false);
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [loadMessages, loadMedia]);

  const effectiveGalleryTab = galleryTab === "seleccion" && !galeriaConfig.mostrarSeleccionNovios
    ? "mias"
    : galleryTab;

  const sendMessage = async () => {
    const contenido = messageText.trim();
    if (!contenido) return;
    setSending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/rsvp/${inviteCode}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo enviar el mensaje");
      setMessageText("");
      await loadMessages();
      setFeedback("Mensaje enviado. Os responderemos desde la administracion.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error al enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });
      const response = await fetch(`/api/rsvp/${inviteCode}/media`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron subir los archivos");
      await loadMedia();
      setFeedback("Archivos subidos correctamente.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error al subir archivos");
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm("Eliminar este archivo?")) return;
    const response = await fetch(`/api/rsvp/${inviteCode}/media`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId }),
    });
    if (response.ok) {
      await loadMedia();
      setFeedback("Archivo eliminado.");
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">Area privada</p>
          <h2 className="text-2xl font-semibold text-stone-900">Preguntas, recuerdos y subidas</h2>
          <p className="text-sm text-stone-500">Solo tu invitacion puede ver este contenido privado.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("chat")} className={`rounded-full px-4 py-2 text-sm ${tab === "chat" ? "bg-stone-800 text-white" : "bg-white text-stone-600 border border-stone-200"}`}>Pregunta a los novios</button>
          <button onClick={() => setTab("media")} className={`rounded-full px-4 py-2 text-sm ${tab === "media" ? "bg-stone-800 text-white" : "bg-white text-stone-600 border border-stone-200"}`}>Galeria privada</button>
        </div>
      </div>

      {feedback && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{feedback}</div>}

      {loading ? (
        <p className="text-sm text-stone-500">Cargando contenido privado...</p>
      ) : tab === "chat" ? (
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-stone-500">Todavia no hay mensajes en esta conversacion.</p>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`rounded-2xl p-4 ${message.author_role === "admin" ? "bg-emerald-50" : "bg-stone-50"}`}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-stone-400">
                    <span>{message.author_role === "admin" ? "Respuesta de los novios" : invitacionNombre}</span>
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-stone-700">{message.contenido}</p>
                </article>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
            <label className="block text-sm font-medium text-stone-700">Escribe aqui tu pregunta o dedicatoria</label>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
              placeholder="Preguntas, dudas, frases bonitas..."
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !messageText.trim()}
              className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? "Enviando..." : "Enviar mensaje"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {galeriaConfig.mostrarSeleccionNovios && (
                <button
                  onClick={() => setGalleryTab("seleccion")}
                  className={`rounded-full px-3 py-1.5 text-xs ${effectiveGalleryTab === "seleccion" ? "bg-stone-800 text-white" : "border border-stone-300 text-stone-600"}`}
                >
                  Seleccion de los novios
                </button>
              )}
              {galeriaConfig.mostrarSubidasPorMi && (
                <button
                  onClick={() => setGalleryTab("mias")}
                  className={`rounded-full px-3 py-1.5 text-xs ${effectiveGalleryTab === "mias" ? "bg-stone-800 text-white" : "border border-stone-300 text-stone-600"}`}
                >
                  Subidas por mi
                </button>
              )}
            </div>
          </div>

          {effectiveGalleryTab === "seleccion" && galeriaConfig.mostrarSeleccionNovios && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hasFeatured ? (
                featuredMedia.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    <div className="aspect-[4/3] bg-stone-100">
                      {item.tipo === "video" ? (
                        <video src={item.url_publica ?? undefined} className="h-full w-full object-cover" controls />
                      ) : (
                        <img src={item.url_publica ?? ""} alt={item.nombre} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="truncate text-sm font-medium text-stone-800">{item.nombre}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-stone-500">Los novios aun no han publicado seleccion de fotos.</p>
              )}
            </div>
          )}

          {effectiveGalleryTab === "mias" && galeriaConfig.mostrarSubidasPorMi && (
            <>
              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <label className="block text-sm font-medium text-stone-700">Sube imagenes o videos (sin compresion)</label>
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
                <p className="mt-2 text-xs text-stone-500">
                  En movil puedes sacar foto/video o elegir varias desde galeria. Solo tu invitacion ve estas subidas.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hasMyUploads ? (
                  myMedia.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                      <div className="aspect-[4/3] bg-stone-100">
                        {item.tipo === "video" ? (
                          <video src={item.url_publica ?? undefined} className="h-full w-full object-cover" controls />
                        ) : (
                          <img src={item.url_publica ?? ""} alt={item.nombre} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <p className="truncate text-sm font-medium text-stone-800">{item.nombre}</p>
                        <button type="button" onClick={() => void deleteMedia(item.id)} className="text-xs text-red-500 hover:text-red-700">Retirar archivo</button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">Aun no has subido nada.</p>
                )}
              </div>

              {uploading && <p className="text-sm text-stone-500">Subiendo archivos...</p>}
            </>
          )}

          {!galeriaConfig.mostrarSeleccionNovios && !galeriaConfig.mostrarSubidasPorMi && (
            <p className="text-sm text-stone-500">La galeria privada esta desactivada para esta invitacion.</p>
          )}
        </div>
      )}
    </section>
  );
}
