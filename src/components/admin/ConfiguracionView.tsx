"use client";

import { useState } from "react";
import type { WeddingConfig, EventoHistoria, EventoTimeline } from "@/config/wedding.config";

type Tab = "diseno" | "historia" | "timeline";
const ICONO_OPTIONS = ["rings","cocktail","fork","cake","music","car","iglesia","finca"];
const COLOR_LABELS: Record<string, { label: string; desc: string }> = {
  bronze:      { label: "Bronce principal",       desc: "Bordes, lineas, separadores" },
  bronzeLight: { label: "Bronce claro - botones", desc: "Botones primarios, acentos activos" },
  olive:       { label: "Oliva",                  desc: "Detalles secundarios" },
  oliveMuted:  { label: "Oliva suave",            desc: "Texto y elementos tenues" },
  cream:       { label: "Fondo claro",            desc: "Fondo de secciones claras" },
  brownDark:   { label: "Fondo portada",          desc: "Fondo del hero y cabeceras oscuras" },
  white:       { label: "Blanco base",            desc: "Superficies de tarjetas y formularios" },
};
function uid() { return Math.random().toString(36).slice(2); }

export default function ConfiguracionView({ inviteCode, config: ic }: { inviteCode: string; config: WeddingConfig }) {
  const [tab, setTab] = useState<Tab>("diseno");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok"|"error"; text: string } | null>(null);
  const [colores, setColores] = useState({ ...ic.tema.colores });
  const [fuentes, setFuentes] = useState({ ...ic.tema.fuentes });
  const [logoUrl, setLogoUrl] = useState(ic.logo ?? "");
  const [historia, setHistoria] = useState<EventoHistoria[]>(structuredClone(ic.historia));
  const [editandoH, setEditandoH] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<(EventoTimeline & { enlaceMaps?: string })[]>(
    structuredClone(ic.timeline).map((e: any) => ({ ...e, enlaceMaps: e.enlaceMaps ?? "" }))
  );

  const showMsg = (type: "ok"|"error", text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { tema: { colores, fuentes }, historia, timeline };
      if (logoUrl) payload.logo = logoUrl;
      const res = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al guardar");
      showMsg("ok", "Cambios guardados. Recarga la pagina para verlos.");
    } catch (e) { showMsg("error", e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!confirm("Restaurar todos los valores al diseno original? Esta accion no se puede deshacer.")) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/${inviteCode}/config/reset`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      showMsg("ok", "Valores restaurados. Recarga para ver el diseno original.");
    } catch (e) { showMsg("error", e instanceof Error ? e.message : "Error"); }
    finally { setResetting(false); }
  };

  const updateH = (id: string, f: keyof EventoHistoria, v: any) =>
    setHistoria((p) => p.map((e) => (e.id === id ? { ...e, [f]: v } : e)));
  const addH = () => {
    const e: EventoHistoria = { id: uid(), fecha: "", titulo: "", descripcion: "", lado: "derecha" };
    setHistoria((p) => [...p, e]); setEditandoH(e.id);
  };
  const updateT = (id: string, f: string, v: any) => setTimeline((p) => p.map((e) => (e.id === id ? { ...e, [f]: v } : e)));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Configuracion</h1>
          <p className="mt-1 text-sm text-stone-500">Los cambios se aplican tras guardar y recargar la pagina.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} disabled={resetting}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50">
            {resetting ? "Restaurando..." : "Restaurar valores por defecto"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-amber-800">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl border p-4 text-sm ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 border-b border-stone-200">
        {(["diseno","historia","timeline"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===t ? "border-amber-700 text-amber-700" : "border-transparent text-stone-500 hover:text-stone-700"}`}>
            {({"diseno":"Diseno","historia":"Historia","timeline":"El gran dia"} as any)[t]}
          </button>
        ))}
      </div>

      {tab === "diseno" && (
        <div className="space-y-8">
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-5 text-base font-semibold text-stone-700">Colores de la web</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.entries(colores) as [string,string][]).map(([key,val]) => {
                const info = COLOR_LABELS[key] ?? { label: key, desc: "" };
                return (
                  <label key={key} className="flex items-center gap-4 rounded-xl border border-stone-100 bg-stone-50 p-3 cursor-pointer hover:border-stone-200">
                    <input type="color" value={val} onChange={(e) => setColores((c) => ({ ...c, [key]: e.target.value }))}
                      className="h-12 w-12 cursor-pointer rounded-xl border-0 p-0.5 bg-transparent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800">{info.label}</p>
                      <p className="text-xs text-stone-500">{info.desc}</p>
                      <p className="text-xs font-mono text-stone-400 mt-0.5">{val}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-stone-700">Tipografias</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {(["display","body"] as const).map((k) => (
                <div key={k}>
                  <label className="label-field">{k==="display" ? "Fuente titular" : "Fuente cuerpo"}</label>
                  <input type="text" value={fuentes[k]} onChange={(e) => setFuentes((f) => ({ ...f, [k]: e.target.value }))}
                    className="input-field font-mono" placeholder="'Nombre Fuente', fallback, serif" />
                  <p className="mt-1.5 text-sm text-stone-500" style={{ fontFamily: fuentes[k] }}>Vista previa: Pilar &amp; David</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-stone-700">Sello / Logo</h2>
            <div className="flex items-start gap-5">
              {logoUrl && <img src={logoUrl} alt="Sello" className="h-20 w-20 rounded-xl object-contain border border-stone-200 bg-stone-50 flex-shrink-0" />}
              <div className="flex-1">
                <label className="label-field">URL de la imagen</label>
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... o /images/sello.svg" className="input-field" />
                <p className="mt-1 text-xs text-stone-400">Si esta vacio se usa el sello SVG generado automaticamente.</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "historia" && (
        <div className="space-y-3">
          {historia.map((e) => (
            <div key={e.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <button onClick={() => setEditandoH(editandoH===e.id ? null : e.id)}
                  className="flex-1 text-left text-sm font-semibold text-stone-700 hover:text-amber-700">
                  {e.titulo || "(sin titulo)"} <span className="font-normal text-stone-400">{e.fecha}</span>
                  <span className="ml-2 text-stone-400">{editandoH===e.id ? "▲" : "▼"}</span>
                </button>
                <button onClick={() => setHistoria((p) => p.filter((h) => h.id!==e.id))} className="ml-4 text-xs text-red-400 hover:text-red-600">Eliminar</button>
              </div>
              {editandoH===e.id && (
                <div className="border-t border-stone-100 px-5 pb-5 pt-4 grid gap-4 sm:grid-cols-2">
                  <div><label className="label-field">Titulo</label><input className="input-field" value={e.titulo} onChange={(ev) => updateH(e.id,"titulo",ev.target.value)} /></div>
                  <div><label className="label-field">Fecha / periodo</label><input className="input-field" value={e.fecha} onChange={(ev) => updateH(e.id,"fecha",ev.target.value)} placeholder="Verano 2022" /></div>
                  <div className="sm:col-span-2"><label className="label-field">Descripcion</label><textarea rows={3} className="input-field" value={e.descripcion} onChange={(ev) => updateH(e.id,"descripcion",ev.target.value)} /></div>
                  <div><label className="label-field">Imagen (URL)</label><input className="input-field" value={e.imagen??""} onChange={(ev) => updateH(e.id,"imagen",ev.target.value||undefined)} placeholder="https://..." /></div>
                  <div><label className="label-field">Lado</label>
                    <select className="input-field" value={e.lado} onChange={(ev) => updateH(e.id,"lado",ev.target.value as "izquierda"|"derecha")}>
                      <option value="derecha">Derecha</option><option value="izquierda">Izquierda</option>
                    </select></div>
                </div>
              )}
            </div>
          ))}
          <button onClick={addH} className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
            + Anadir entrada a la historia
          </button>
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">Configura los eventos del dia con hora, icono y enlace de Google Maps para indicar como llegar.</p>
          {timeline.map((e) => (
            <div key={e.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-stone-700">{e.hora} {e.titulo || "(sin titulo)"}</p>
                <button onClick={() => setTimeline((p) => p.filter((t) => t.id!==e.id))} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label-field">Hora</label><input className="input-field" value={e.hora} placeholder="12:00" onChange={(ev) => updateT(e.id,"hora",ev.target.value)} /></div>
                <div><label className="label-field">Icono</label>
                  <select className="input-field" value={e.icono} onChange={(ev) => updateT(e.id,"icono",ev.target.value)}>
                    {ICONO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select></div>
                <div><label className="label-field">Titulo</label><input className="input-field" value={e.titulo} onChange={(ev) => updateT(e.id,"titulo",ev.target.value)} /></div>
                <div><label className="label-field">Descripcion / lugar</label><input className="input-field" value={e.descripcion} onChange={(ev) => updateT(e.id,"descripcion",ev.target.value)} /></div>
                <div className="sm:col-span-2"><label className="label-field">Enlace Google Maps (como llegar)</label>
                  <input type="url" className="input-field" value={(e as any).enlaceMaps??""} onChange={(ev) => updateT(e.id,"enlaceMaps",ev.target.value)} placeholder="https://maps.app.goo.gl/..." /></div>
              </div>
            </div>
          ))}
          <button onClick={() => setTimeline((p) => [...p, { id: uid(), hora: "", titulo: "", descripcion: "", icono: "rings", enlaceMaps: "" }])}
            className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
            + Anadir evento al dia
          </button>
        </div>
      )}
    </div>
  );
}
