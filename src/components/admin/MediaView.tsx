"use client";

import { useMemo, useState } from "react";
import type { DriveConfig } from "@/config/wedding.config";

type MediaItem = {
  id: string;
  invitation_id: string | null;
  folder_tipo: "recursos_web" | "invitados";
  nombre: string;
  tipo: "foto" | "video" | "audio";
  url_publica: string | null;
  subido_por: string | null;
  featured: boolean;
  visible_public: boolean;
  created_at: string;
};

type Invitacion = {
  id: string;
  invite_code: string;
  nombre_visible: string;
  estado: string;
  tipo_invitacion: string;
};

type Mensaje = {
  id: string;
  invitation_id: string;
  author_role: "guest" | "admin";
  author_name?: string | null;
  contenido: string;
  read_at_admin?: string | null;
  read_at_guest?: string | null;
  created_at: string;
};

type Props = {
  inviteCode: string;
  drive: DriveConfig;
  media: MediaItem[];
  invitaciones: Invitacion[];
  mensajes: Mensaje[];
};

type Tab = "drive" | "galeria" | "invitados" | "mensajes";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MediaView({ inviteCode, drive: initialDrive, media: initialMedia, invitaciones, mensajes }: Props) {
  const [tab, setTab] = useState<Tab>("drive");
  const [drive, setDrive] = useState(initialDrive);
  const [media, setMedia] = useState(initialMedia);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string>(invitaciones[0]?.id ?? "");
  const [replyText, setReplyText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingDrive, setSavingDrive] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const unreadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const mensaje of mensajes) {
      if (mensaje.author_role === "guest" && !mensaje.read_at_admin) {
        counts.set(mensaje.invitation_id, (counts.get(mensaje.invitation_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [mensajes]);

  const selectedMessages = useMemo(
    () => mensajes.filter((mensaje) => mensaje.invitation_id === selectedInvitationId).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [mensajes, selectedInvitationId],
  );

  const saveDrive = async () => {
    setSavingDrive(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la configuración de Drive");
      setFeedback("Configuración de Drive guardada.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error al guardar Drive");
    } finally {
      setSavingDrive(false);
    }
  };

  const uploadResource = async (file: File) => {
    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/admin/${inviteCode}/media`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo subir el archivo");
      setMedia((current) => [data.media, ...current]);
      setFeedback("Archivo subido a la carpeta de recursos.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const patchMedia = async (mediaId: string, patch: { featured?: boolean; visible_public?: boolean }) => {
    const response = await fetch(`/api/admin/${inviteCode}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, ...patch }),
    });
    if (response.ok) {
      setMedia((current) => current.map((item) => (item.id === mediaId ? { ...item, ...patch } : item)));
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    const response = await fetch(`/api/admin/${inviteCode}/media`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId }),
    });
    if (response.ok) {
      setMedia((current) => current.filter((item) => item.id !== mediaId));
    }
  };

  const sendReply = async () => {
    const contenido = replyText.trim();
    if (!contenido || !selectedInvitationId) return;
    const response = await fetch(`/api/admin/${inviteCode}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId: selectedInvitationId, contenido, authorName: "Novios" }),
    });
    const data = await response.json();
    if (response.ok) {
      setReplyText("");
      setFeedback("Respuesta enviada.");
      window.location.reload();
      return;
    }
    setFeedback(data.error || "No se pudo enviar la respuesta");
  };

  const selectedInvitacion = invitaciones.find((item) => item.id === selectedInvitationId) ?? null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Medios, galería y mensajes</h1>
          <p className="mt-1 text-sm text-stone-500">Sube recursos web, revisa lo que envían los invitados y selecciona qué se muestra públicamente.</p>
        </div>
      </div>

      {feedback && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{feedback}</div>}

      <div className="flex gap-2 border-b border-stone-200">
        {(["drive", "galeria", "invitados", "mensajes"] as Tab[]).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === item ? "border-amber-700 text-amber-700" : "border-transparent text-stone-500 hover:text-stone-700"}`}>
            {item === "drive" ? "Drive" : item === "galeria" ? "Galería" : item === "invitados" ? "Subidas de invitados" : "Mensajes"}
          </button>
        ))}
      </div>

      {tab === "drive" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-700">Recursos de la web</h2>
            <p className="text-sm text-stone-500">La carpeta debe estar compartida con la cuenta de servicio. La app usará el ID de carpeta para crear archivos directamente en Drive.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-field">Ruta o nombre visible</label>
                <input className="input-field" value={drive.recursosWeb.folderPath} onChange={(e) => setDrive((current) => ({ ...current, recursosWeb: { ...current.recursosWeb, folderPath: e.target.value } }))} />
              </div>
              <div>
                <label className="label-field">ID de carpeta de Drive</label>
                <input className="input-field font-mono" value={drive.recursosWeb.folderId} onChange={(e) => setDrive((current) => ({ ...current, recursosWeb: { ...current.recursosWeb, folderId: e.target.value } }))} placeholder="0B..." />
              </div>
              <div>
                <label className="label-field">Privilegios internos</label>
                <select className="input-field" value={drive.recursosWeb.access} onChange={(e) => setDrive((current) => ({ ...current, recursosWeb: { ...current.recursosWeb, access: e.target.value as DriveConfig["recursosWeb"]["access"] } }))}>
                  <option value="private">Privado</option>
                  <option value="shared">Compartido internamente</option>
                  <option value="public">Público</option>
                </select>
              </div>
              <div>
                <label className="label-field">Shared Drive ID opcional</label>
                <input className="input-field font-mono" value={drive.recursosWeb.sharedDriveId ?? ""} onChange={(e) => setDrive((current) => ({ ...current, recursosWeb: { ...current.recursosWeb, sharedDriveId: e.target.value || undefined } }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveDrive} disabled={savingDrive} className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingDrive ? "Guardando..." : "Guardar configuración Drive"}</button>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-700">Subida de imágenes desde administración</h2>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void uploadResource(file);
                }
                e.currentTarget.value = "";
              }}
              className="block w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm"
            />
            <p className="text-xs text-stone-500">Las imágenes subidas aquí se guardan en Drive y quedan listas para usarse en la web.</p>
            {uploading && <p className="text-sm text-stone-500">Subiendo archivo...</p>}
          </section>
        </div>
      )}

      {tab === "galeria" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {media.filter((item) => item.folder_tipo === "recursos_web" || item.visible_public || item.featured).map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="aspect-[4/3] bg-stone-100">
                {item.tipo === "video" ? <video className="h-full w-full object-cover" controls src={item.url_publica ?? undefined} /> : <img className="h-full w-full object-cover" src={item.url_publica ?? ""} alt={item.nombre} />}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="truncate text-sm font-medium text-stone-800">{item.nombre}</p>
                  <p className="text-xs text-stone-400">{item.featured ? "Visible en la galería" : "No visible todavía"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void patchMedia(item.id, { featured: !item.featured, visible_public: !item.visible_public })} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600">{item.featured ? "Quitar de galería" : "Mostrar en galería"}</button>
                  <button onClick={() => void deleteMedia(item.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500">Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "invitados" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {media.filter((item) => item.folder_tipo === "invitados").map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="aspect-[4/3] bg-stone-100">
                {item.tipo === "video" ? <video className="h-full w-full object-cover" controls src={item.url_publica ?? undefined} /> : <img className="h-full w-full object-cover" src={item.url_publica ?? ""} alt={item.nombre} />}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="truncate text-sm font-medium text-stone-800">{item.nombre}</p>
                  <p className="text-xs text-stone-400">Subido por {item.subido_por ?? "invitado"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void patchMedia(item.id, { featured: !item.featured, visible_public: !item.visible_public })} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white">{item.featured ? "Retirar de galería" : "Publicar en galería"}</button>
                  <button onClick={() => void deleteMedia(item.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500">Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "mensajes" && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="text-base font-semibold text-stone-700">Conversaciones</h2>
            <div className="space-y-2">
              {invitaciones.map((item) => {
                const unread = unreadCounts.get(item.id) ?? 0;
                return (
                  <button key={item.id} onClick={() => setSelectedInvitationId(item.id)} className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${selectedInvitationId === item.id ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-stone-800">{item.nombre_visible}</span>
                      {unread > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{unread} nuevo{unread > 1 ? "s" : ""}</span>}
                    </div>
                    <p className="mt-1 text-xs text-stone-400">{item.invite_code} · {item.estado.replace("_", " ")}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
            {selectedInvitacion ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-800">{selectedInvitacion.nombre_visible}</h3>
                    <p className="text-sm text-stone-500">{selectedInvitacion.invite_code}</p>
                  </div>
                  <p className="text-xs text-stone-400">{invitaciones.find((item) => item.id === selectedInvitationId)?.estado}</p>
                </div>

                <div className="space-y-3">
                  {selectedMessages.length === 0 ? (
                    <p className="text-sm text-stone-500">Aún no hay mensajes en esta invitación.</p>
                  ) : (
                    selectedMessages.map((message) => (
                      <article key={message.id} className={`rounded-2xl p-4 ${message.author_role === "admin" ? "bg-emerald-50" : "bg-stone-50"}`}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-stone-400">
                          <span>{message.author_role === "admin" ? "Novios" : message.author_name ?? "Invitado"}</span>
                          <span>{formatDate(message.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-stone-700">{message.contenido}</p>
                      </article>
                    ))
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <label className="block text-sm font-medium text-stone-700">Responder aquí</label>
                  <textarea rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm" placeholder="Escribe la respuesta..." />
                  <button onClick={sendReply} className="rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white">Enviar respuesta</button>
                </div>
              </>
            ) : (
              <p className="text-sm text-stone-500">Selecciona una invitación para ver su conversación.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}