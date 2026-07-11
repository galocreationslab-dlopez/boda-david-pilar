"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EventoHistoria,
  EventoTimeline,
  WeddingConfig,
} from "@/config/wedding.config";

type Tab = "historia" | "timeline";

type ResourceItem = {
  id: string;
  nombre: string;
  url_publica: string | null;
  mime_type: string | null;
  subido_por: string | null;
  created_at: string;
};

const ICONO_OPTIONS = ["rings", "cocktail", "fork", "cake", "music", "car", "iglesia", "finca"];

function uid() {
  return Math.random().toString(36).slice(2);
}

function isDriveUrl(value: string): boolean {
  return value.includes("drive.google.com") || value.includes("drive.usercontent.google.com");
}

function previewSrcForAdmin(inviteCode: string, src: string): string {
  if (!src) return src;
  if (isDriveUrl(src)) {
    return `/api/admin/${encodeURIComponent(inviteCode)}/resources/preview?src=${encodeURIComponent(src)}`;
  }
  return src;
}

export default function ContenidoView({ inviteCode, config }: { inviteCode: string; config: WeddingConfig }) {
  const [tab, setTab] = useState<Tab>("historia");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [historia, setHistoria] = useState<EventoHistoria[]>(structuredClone(config.historia));
  const [editandoH, setEditandoH] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploadingHistoriaId, setUploadingHistoriaId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Array<EventoTimeline & { enlaceMaps?: string }>>(
    structuredClone(config.timeline).map((item) => ({ ...item, enlaceMaps: "" })),
  );

  const resourcesForHistoria = useMemo(
    () => resources.filter((item) => item.mime_type?.startsWith("image/") || item.mime_type === null),
    [resources],
  );

  const showMsg = (type: "ok" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const updateH = (id: string, field: keyof EventoHistoria, value: EventoHistoria[keyof EventoHistoria]) =>
    setHistoria((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

  const addH = () => {
    const next: EventoHistoria = { id: uid(), fecha: "", titulo: "", descripcion: "", lado: "derecha" };
    setHistoria((prev) => [...prev, next]);
    setEditandoH(next.id);
  };

  const updateT = (id: string, field: keyof (EventoTimeline & { enlaceMaps?: string }), value: string) =>
    setTimeline((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

  useEffect(() => {
    const loadResources = async () => {
      setLoadingResources(true);
      try {
        const response = await fetch(`/api/admin/${inviteCode}/resources`);
        const data: unknown = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((data as { error?: string }).error ?? "No se pudieron cargar los recursos");
        }
        setResources(
          Array.isArray((data as { resources?: unknown[] }).resources)
            ? (data as { resources: ResourceItem[] }).resources
            : [],
        );
      } catch (error) {
        showMsg("error", error instanceof Error ? error.message : "Error cargando recursos");
      } finally {
        setLoadingResources(false);
      }
    };

    void loadResources();
  }, [inviteCode]);

  const uploadHistoriaImage = async (historiaId: string, file: File) => {
    setUploadingHistoriaId(historiaId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("section", "historia");
      const response = await fetch(`/api/admin/${inviteCode}/resources`, {
        method: "POST",
        body: fd,
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "No se pudo subir la imagen");
      }
      const resource = (data as { resource?: ResourceItem }).resource;
      if (!resource?.url_publica) {
        throw new Error("La subida no devolvio una URL publica");
      }
      updateH(historiaId, "imagen", resource.url_publica);
      setResources((prev) => [resource, ...prev]);
      showMsg("ok", "Imagen subida a Drive y enlazada en historia");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al subir imagen");
    } finally {
      setUploadingHistoriaId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historia, timeline }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Error al guardar");
      }
      showMsg("ok", "Contenido guardado.");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Contenido de la web</h1>
          <p className="mt-1 text-sm text-stone-500">Gestiona la historia y el timeline visibles en la invitación.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-amber-800"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {msg && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            msg.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 border-b border-stone-200">
        {(["historia", "timeline"] as Tab[]).map((currentTab) => (
          <button
            key={currentTab}
            onClick={() => setTab(currentTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === currentTab ? "border-amber-700 text-amber-700" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {({ historia: "Historia", timeline: "El gran dia" } as Record<Tab, string>)[currentTab]}
          </button>
        ))}
      </div>

      {tab === "historia" && (
        <div className="space-y-3">
          {historia.map((e) => (
            <div key={e.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  onClick={() => setEditandoH(editandoH === e.id ? null : e.id)}
                  className="flex-1 text-left text-sm font-semibold text-stone-700 hover:text-amber-700"
                >
                  {e.titulo || "(sin titulo)"} <span className="font-normal text-stone-400">{e.fecha}</span>
                  <span className="ml-2 text-stone-400">{editandoH === e.id ? "▲" : "▼"}</span>
                </button>
                <button
                  onClick={() => {
                    if (!confirm("Eliminar esta entrada de la historia?")) return;
                    setHistoria((prev) => prev.filter((item) => item.id !== e.id));
                  }}
                  className="ml-4 text-xs text-red-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
              {editandoH === e.id && (
                <div className="border-t border-stone-100 px-5 pb-5 pt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label-field">Titulo</label>
                    <input className="input-field" value={e.titulo} onChange={(ev) => updateH(e.id, "titulo", ev.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Fecha / periodo</label>
                    <input className="input-field" value={e.fecha} onChange={(ev) => updateH(e.id, "fecha", ev.target.value)} placeholder="Verano 2022" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Descripcion</label>
                    <textarea rows={3} className="input-field" value={e.descripcion} onChange={(ev) => updateH(e.id, "descripcion", ev.target.value)} />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="label-field">Imagen</label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        className="input-field"
                        value={e.imagen ?? ""}
                        onChange={(ev) => updateH(e.id, "imagen", ev.target.value || undefined)}
                      >
                        <option value="">Sin imagen</option>
                        {resourcesForHistoria.map((resource) => (
                          <option key={resource.id} value={resource.url_publica ?? ""}>
                            {resource.nombre}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex cursor-pointer items-center rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                        {uploadingHistoriaId === e.id ? "Subiendo..." : "Subir archivo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingHistoriaId === e.id}
                          onChange={(ev) => {
                            const file = ev.target.files?.[0];
                            if (file) {
                              void uploadHistoriaImage(e.id, file);
                            }
                            ev.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <input
                      className="input-field"
                      value={e.imagen ?? ""}
                      onChange={(ev) => updateH(e.id, "imagen", ev.target.value || undefined)}
                      placeholder="Tambien puedes pegar URL manual"
                    />
                    {loadingResources && <p className="text-xs text-stone-400">Cargando recursos de Drive...</p>}
                    {e.imagen && (
                      <img
                        src={previewSrcForAdmin(inviteCode, e.imagen)}
                        alt="Preview historia"
                        className="h-24 w-24 rounded-lg border border-stone-200 object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <label className="label-field">Lado</label>
                    <select className="input-field" value={e.lado} onChange={(ev) => updateH(e.id, "lado", ev.target.value as "izquierda" | "derecha")}>
                      <option value="derecha">Derecha</option>
                      <option value="izquierda">Izquierda</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={addH}
            className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
          >
            + Anadir entrada a la historia
          </button>
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">
            Configura los eventos del dia con hora, icono y enlace de Google Maps para indicar como llegar.
          </p>
          {timeline.map((e) => (
            <div key={e.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-stone-700">
                  {e.hora} {e.titulo || "(sin titulo)"}
                </p>
                <button
                  onClick={() => {
                    if (!confirm("Eliminar este evento del timeline?")) return;
                    setTimeline((prev) => prev.filter((item) => item.id !== e.id));
                  }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-field">Hora</label>
                  <input className="input-field" value={e.hora} placeholder="12:00" onChange={(ev) => updateT(e.id, "hora", ev.target.value)} />
                </div>
                <div>
                  <label className="label-field">Icono</label>
                  <select className="input-field" value={e.icono} onChange={(ev) => updateT(e.id, "icono", ev.target.value)}>
                    {ICONO_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Titulo</label>
                  <input className="input-field" value={e.titulo} onChange={(ev) => updateT(e.id, "titulo", ev.target.value)} />
                </div>
                <div>
                  <label className="label-field">Descripcion / lugar</label>
                  <input className="input-field" value={e.descripcion} onChange={(ev) => updateT(e.id, "descripcion", ev.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Enlace Google Maps (como llegar)</label>
                  <input
                    type="url"
                    className="input-field"
                    value={e.enlaceMaps ?? ""}
                    onChange={(ev) => updateT(e.id, "enlaceMaps", ev.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              setTimeline((prev) => [...prev, { id: uid(), hora: "", titulo: "", descripcion: "", icono: "rings", enlaceMaps: "" }])
            }
            className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
          >
            + Anadir evento al dia
          </button>
        </div>
      )}
    </div>
  );
}