"use client";

import { useState } from "react";
import type { WeddingConfig, EventoHistoria, EventoTimeline, Localizacion } from "@/config/wedding.config";

type Tab = "diseno" | "historia" | "timeline";

const ICONO_TIMELINE_OPTIONS = ["rings", "cocktail", "fork", "cake", "music", "car"];
const ICONO_LOCALIZACION_OPTIONS = ["iglesia", "finca", "cocktail", "music"];
const LADO_OPTIONS: Array<"izquierda" | "derecha"> = ["izquierda", "derecha"];

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function ConfiguracionView({
  inviteCode,
  config: initialConfig,
}: {
  inviteCode: string;
  config: WeddingConfig;
}) {
  const [tab, setTab] = useState<Tab>("diseno");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Estado de colores ─────────────────────────────────────────
  const [colores, setColores] = useState({ ...initialConfig.tema.colores });

  // ── Estado de fuentes ─────────────────────────────────────────
  const [fuentes, setFuentes] = useState({ ...initialConfig.tema.fuentes });

  // ── Estado de sello ───────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState(initialConfig.logo ?? "");

  // ── Estado de historia ────────────────────────────────────────
  const [historia, setHistoria] = useState<EventoHistoria[]>(
    structuredClone(initialConfig.historia)
  );
  const [editandoHistoria, setEditandoHistoria] = useState<string | null>(null);

  // ── Estado de timeline ────────────────────────────────────────
  const [timeline, setTimeline] = useState<EventoTimeline[]>(
    structuredClone(initialConfig.timeline)
  );
  const [localizaciones, setLocalizaciones] = useState<Localizacion[]>(
    structuredClone(initialConfig.localizaciones)
  );

  // ── Guardar ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      const payload: any = {
        tema: { colores, fuentes },
        historia,
        timeline,
        localizaciones,
      };
      if (logoUrl) payload.logo = logoUrl;

      const res = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }
      setSavedMsg("Cambios guardados. Recarga la web para verlos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  // ── Historia helpers ──────────────────────────────────────────
  const updateHistoria = (id: string, field: keyof EventoHistoria, value: any) => {
    setHistoria((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };
  const addHistoriaEntry = () => {
    const entry: EventoHistoria = { id: uid(), fecha: "", titulo: "", descripcion: "", lado: "derecha" };
    setHistoria((prev) => [...prev, entry]);
    setEditandoHistoria(entry.id);
  };
  const removeHistoria = (id: string) => setHistoria((prev) => prev.filter((e) => e.id !== id));

  // ── Timeline helpers ──────────────────────────────────────────
  const updateTimeline = (id: string, field: keyof EventoTimeline, value: any) => {
    setTimeline((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };
  const addTimelineEntry = () => {
    setTimeline((prev) => [...prev, { id: uid(), hora: "", titulo: "", descripcion: "", icono: "rings" }]);
  };
  const removeTimeline = (id: string) => setTimeline((prev) => prev.filter((e) => e.id !== id));

  // ── Localizaciones helpers ────────────────────────────────────
  const updateLocalizacion = (id: string, field: string, value: any) => {
    setLocalizaciones((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (field.startsWith("coord.")) {
          return { ...l, coordenadas: { ...l.coordenadas, [field.slice(6)]: Number(value) } };
        }
        return { ...l, [field]: value };
      })
    );
  };
  const addLocalizacion = () => {
    setLocalizaciones((prev) => [
      ...prev,
      { id: uid(), nombre: "", descripcion: "", direccion: "", coordenadas: { lat: 0, lng: 0 }, hora: "", diaSemana: "", fecha: "", icono: "finca" },
    ]);
  };
  const removeLocalizacion = (id: string) => setLocalizaciones((prev) => prev.filter((l) => l.id !== id));

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Configuración</h1>
          <p className="mt-1 text-sm text-stone-500">Los cambios se aplican al guardar y se verán en la próxima carga de la página.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-amber-800 transition-colors"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {savedMsg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{savedMsg}</div>}
      {error    && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        {(["diseno", "historia", "timeline"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-amber-700 text-amber-700" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {{ diseno: "Diseño", historia: "Historia", timeline: "El gran día" }[t]}
          </button>
        ))}
      </div>

      {/* ── TAB: DISEÑO ── */}
      {tab === "diseno" && (
        <div className="space-y-8">
          {/* Colores */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-stone-700">Colores</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {(Object.entries(colores) as [string, string][]).map(([key, val]) => (
                <label key={key} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3">
                  <input
                    type="color"
                    value={val}
                    onChange={(e) => setColores((c) => ({ ...c, [key]: e.target.value }))}
                    className="h-10 w-10 cursor-pointer rounded-lg border-0 p-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-700 capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="text-xs text-stone-400 font-mono">{val}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Fuentes */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-stone-700">Tipografías</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["display", "body"] as const).map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-stone-600 capitalize">{key === "display" ? "Fuente titular" : "Fuente cuerpo"}</label>
                  <input
                    type="text"
                    value={fuentes[key]}
                    onChange={(e) => setFuentes((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm font-mono"
                    placeholder="'Nombre Fuente', fallback, serif"
                  />
                  <p className="mt-1 text-xs text-stone-400" style={{ fontFamily: fuentes[key] }}>
                    Vista previa: Pilar &amp; David
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Sello / Logo */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-stone-700">Imagen del sello</h2>
            <div className="flex items-start gap-6">
              {logoUrl && (
                <img src={logoUrl} alt="Sello actual" className="h-24 w-24 rounded-xl object-contain border border-stone-200" />
              )}
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-stone-600">URL de la imagen</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://… o /images/sello.svg"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm"
                />
                <p className="mt-1 text-xs text-stone-400">
                  Sube la imagen a Supabase Storage o cualquier CDN y pega la URL aquí. Si está vacío se usa el sello SVG por defecto.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── TAB: HISTORIA ── */}
      {tab === "historia" && (
        <div className="space-y-4">
          {historia.map((evento) => (
            <div key={evento.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => setEditandoHistoria(editandoHistoria === evento.id ? null : evento.id)}
                  className="text-sm font-semibold text-stone-700 hover:text-amber-700"
                >
                  {evento.titulo || "(sin título)"} {editandoHistoria === evento.id ? "▲" : "▼"}
                </button>
                <button onClick={() => removeHistoria(evento.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
              </div>

              {editandoHistoria === evento.id && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label-field">Título</label>
                    <input type="text" className="input-field" value={evento.titulo}
                      onChange={(e) => updateHistoria(evento.id, "titulo", e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Fecha / periodo</label>
                    <input type="text" className="input-field" value={evento.fecha}
                      onChange={(e) => updateHistoria(evento.id, "fecha", e.target.value)}
                      placeholder="Ej: Verano 2022" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Descripción</label>
                    <textarea rows={3} className="input-field" value={evento.descripcion}
                      onChange={(e) => updateHistoria(evento.id, "descripcion", e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Imagen (URL)</label>
                    <input type="text" className="input-field" value={evento.imagen ?? ""}
                      onChange={(e) => updateHistoria(evento.id, "imagen", e.target.value || undefined)}
                      placeholder="https://… o /images/foto.jpg" />
                  </div>
                  <div>
                    <label className="label-field">Lado</label>
                    <select className="input-field" value={evento.lado}
                      onChange={(e) => updateHistoria(evento.id, "lado", e.target.value as "izquierda" | "derecha")}>
                      {LADO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button onClick={addHistoriaEntry} className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
            + Añadir entrada a la historia
          </button>
        </div>
      )}

      {/* ── TAB: TIMELINE ── */}
      {tab === "timeline" && (
        <div className="space-y-8">
          {/* Localizaciones */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-stone-700">Lugares</h2>
            {localizaciones.map((loc) => (
              <div key={loc.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="mb-3 flex justify-between">
                  <p className="text-sm font-semibold text-stone-700">{loc.nombre || "(sin nombre)"}</p>
                  <button onClick={() => removeLocalizacion(loc.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Nombre",       field: "nombre",      type: "text" },
                    { label: "Hora",         field: "hora",        type: "text",  placeholder: "12:00" },
                    { label: "Descripción",  field: "descripcion", type: "text" },
                    { label: "Dirección",    field: "direccion",   type: "text" },
                    { label: "Día semana",   field: "diaSemana",   type: "text",  placeholder: "Sábado" },
                    { label: "Fecha",        field: "fecha",       type: "text",  placeholder: "6 de marzo de 2027" },
                    { label: "Google Maps",  field: "enlaceMaps",  type: "url" },
                  ].map(({ label, field, type, placeholder }) => (
                    <div key={field}>
                      <label className="label-field">{label}</label>
                      <input type={type} className="input-field"
                        value={(loc as any)[field] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => updateLocalizacion(loc.id, field, e.target.value)} />
                    </div>
                  ))}
                  <div>
                    <label className="label-field">Icono</label>
                    <select className="input-field" value={loc.icono}
                      onChange={(e) => updateLocalizacion(loc.id, "icono", e.target.value)}>
                      {ICONO_LOCALIZACION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addLocalizacion} className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
              + Añadir lugar
            </button>
          </section>

          {/* Timeline de eventos */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-stone-700">Eventos del día</h2>
            {timeline.map((evento) => (
              <div key={evento.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="mb-3 flex justify-between">
                  <p className="text-sm font-semibold text-stone-700">{evento.hora} {evento.titulo || "(sin título)"}</p>
                  <button onClick={() => removeTimeline(evento.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label-field">Hora</label>
                    <input type="text" className="input-field" value={evento.hora}
                      placeholder="12:00"
                      onChange={(e) => updateTimeline(evento.id, "hora", e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Icono</label>
                    <select className="input-field" value={evento.icono}
                      onChange={(e) => updateTimeline(evento.id, "icono", e.target.value as EventoTimeline["icono"])}>
                      {ICONO_TIMELINE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Título</label>
                    <input type="text" className="input-field" value={evento.titulo}
                      onChange={(e) => updateTimeline(evento.id, "titulo", e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Descripción</label>
                    <input type="text" className="input-field" value={evento.descripcion}
                      onChange={(e) => updateTimeline(evento.id, "descripcion", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addTimelineEntry} className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
              + Añadir evento al día
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
