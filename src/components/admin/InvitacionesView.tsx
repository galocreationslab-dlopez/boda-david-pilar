"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

// ── Types ──────────────────────────────────────────────────────────────────
type Nec = {
  alojamiento?: string | null;
  alergias?: string | null;
};
type Asistente = { id: string; nombre: string; edad: number|null; tipo_persona: string; estado_asistencia: string; transporte: string[]; necesidades: Nec; comentarios: string|null };
type Invitacion = { id: string; invite_code: string; nombre_visible: string; tipo_invitacion: string; estado: string; nombre1?: string | null; nombre2?: string | null; adultos_estimados: number; adolescentes_estimados: number; ninos_estimados: number; bebes_estimados: number; created_at: string; asistentes: Asistente[] };

const ESTADO_BADGE: Record<string,string> = {
  confirmada:"bg-emerald-100 text-emerald-700 border-emerald-200",
  rechazada:"bg-red-100 text-red-700 border-red-200",
  pendiente:"bg-stone-100 text-stone-500 border-stone-200",
  pendiente_respondida:"bg-amber-100 text-amber-700 border-amber-200",
};
const TIPO_OPTIONS = ["pareja","soltero","familia","individual","otro"];
const ESTADO_INV_OPTIONS = ["pendiente","confirmada","rechazada","pendiente_respondida"];
const TIPO_PERSONA_OPTIONS = ["adulto","adolescente","nino","bebe"];
const ESTADO_ASIST_OPTIONS = ["si","no","pendiente"];
const TRANSP_LABELS: Record<string,string> = {"granada-beas":"GR→Beas","beas-torre":"Beas→Torre","torre-granada":"Torre→GR"};
const TRANSP_KEYS = ["granada-beas","beas-torre","torre-granada"];

const TEMPLATE_CSV = `NombreVisible;TipoInvitacion;Adultos;Adolescentes;Ninos;Bebes;Nombre1;Nombre2
Juan y Maria Garcia;pareja;2;0;1;0;Juan;Maria
Carlos Lopez;soltero;1;0;0;0;Carlos;`;

// ── Row de edicion de asistente ──────────────────────────────────────────────
function AsistenteEditRow({ a, adminCode, onSaved, onDeleted }: { a: Asistente; adminCode: string; onSaved: (a: Asistente) => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...a });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const nec = { ...form.necesidades };
    const payload = { nombre: form.nombre, edad: form.edad, tipo_persona: form.tipo_persona, estado_asistencia: form.estado_asistencia, transporte: form.transporte, necesidades: nec, comentarios: form.comentarios };
    const res = await fetch(`/api/admin/${adminCode}/asistentes/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { onSaved({ ...a, ...payload }); setEditing(false); }
  };
  const del = async () => {
    if (!confirm(`Eliminar asistente &quot;${a.nombre}&quot;?`)) return;
    const res = await fetch(`/api/admin/${adminCode}/asistentes/${a.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  };
  const toggleTransp = (k: string) => setForm((f) => ({ ...f, transporte: f.transporte.includes(k) ? f.transporte.filter((t) => t !== k) : [...f.transporte, k] }));

  const nec = a.necesidades ?? {};
  const transp: string[] = Array.isArray(a.transporte) ? a.transporte : [];

  if (!editing) return (
    <div className="flex flex-col gap-1 rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-base font-bold ${a.estado_asistencia==="si"?"text-emerald-600":a.estado_asistencia==="no"?"text-red-500":"text-stone-400"}`}>{a.estado_asistencia==="si"?"✓":a.estado_asistencia==="no"?"✗":"·"}</span>
          <span className="font-medium text-stone-800 truncate">{a.nombre}</span>
          {a.edad!=null && <span className="text-xs text-stone-400 flex-shrink-0">({a.edad}a)</span>}
          <span className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-xs text-stone-500 flex-shrink-0">{a.tipo_persona}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setEditing(true)} className="text-xs text-amber-600 hover:text-amber-800">Editar</button>
          <button onClick={del} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 text-xs text-stone-500">
        {nec.alojamiento && <span>🏨 {nec.alojamiento}</span>}
        {transp.length > 0 && <span>🚌 {transp.map((t) => TRANSP_LABELS[t]??t).join(", ")}</span>}
        {nec.alergias && <span className="text-amber-600">⚠ {nec.alergias}</span>}
        {a.comentarios && <span className="italic text-stone-400">&quot;{a.comentarios}&quot;</span>}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label-field">Nombre</label><input className="input-field" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></div>
        <div><label className="label-field">Edad</label><input type="number" min="0" className="input-field" value={form.edad??""} onChange={(e) => setForm((f) => ({ ...f, edad: e.target.value?Number(e.target.value):null }))} /></div>
        <div><label className="label-field">Tipo</label><select className="input-field" value={form.tipo_persona} onChange={(e) => setForm((f) => ({ ...f, tipo_persona: e.target.value }))}>{TIPO_PERSONA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        <div><label className="label-field">Asistencia</label><select className="input-field" value={form.estado_asistencia} onChange={(e) => setForm((f) => ({ ...f, estado_asistencia: e.target.value }))}>{ESTADO_ASIST_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        <div><label className="label-field">Alojamiento</label><input className="input-field" value={form.necesidades?.alojamiento??""} onChange={(e) => setForm((f) => ({ ...f, necesidades: { ...f.necesidades, alojamiento: e.target.value||null } }))} /></div>
        <div><label className="label-field">Alergias</label><input className="input-field" value={form.necesidades?.alergias??""} onChange={(e) => setForm((f) => ({ ...f, necesidades: { ...f.necesidades, alergias: e.target.value||null } }))} /></div>
      </div>
      <div>
        <label className="label-field">Transporte</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {TRANSP_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={form.transporte.includes(k)} onChange={() => toggleTransp(k)} /> {TRANSP_LABELS[k]}
            </label>
          ))}
        </div>
      </div>
      <div><label className="label-field">Comentarios</label><input className="input-field" value={form.comentarios??""} onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value||null }))} /></div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{saving?"Guardando...":"Guardar"}</button>
        <button onClick={() => setEditing(false)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600">Cancelar</button>
      </div>
    </div>
  );
}

// ── Fila nueva asistente ──────────────────────────────────────────────────────
function NuevoAsistente({ adminCode, invitacionId, onCreated, onCancel }: { adminCode: string; invitacionId: string; onCreated: (a: Asistente) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ nombre: "", edad: "", tipo_persona: "adulto", estado_asistencia: "si", alojamiento: "", alergias: "", transporte: [] as string[], comentarios: "" });
  const [saving, setSaving] = useState(false);
  const toggleTransp = (k: string) => setForm((f) => ({ ...f, transporte: f.transporte.includes(k) ? f.transporte.filter((t) => t !== k) : [...f.transporte, k] }));
  const save = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const payload = { invitation_id: invitacionId, nombre: form.nombre, edad: form.edad?Number(form.edad):null, tipo_persona: form.tipo_persona, estado_asistencia: form.estado_asistencia, transporte: form.transporte, necesidades: { alojamiento: form.alojamiento||null, alergias: form.alergias||null }, comentarios: form.comentarios||null };
    const res = await fetch(`/api/admin/${adminCode}/asistentes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { const d = await res.json(); onCreated(d.asistente); }
  };
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3 text-sm">
      <p className="text-xs font-semibold text-emerald-700">Nuevo asistente</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label-field">Nombre *</label><input className="input-field" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></div>
        <div><label className="label-field">Edad</label><input type="number" min="0" className="input-field" value={form.edad} onChange={(e) => setForm((f) => ({ ...f, edad: e.target.value }))} /></div>
        <div><label className="label-field">Tipo</label><select className="input-field" value={form.tipo_persona} onChange={(e) => setForm((f) => ({ ...f, tipo_persona: e.target.value }))}>{TIPO_PERSONA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        <div><label className="label-field">Asistencia</label><select className="input-field" value={form.estado_asistencia} onChange={(e) => setForm((f) => ({ ...f, estado_asistencia: e.target.value }))}>{ESTADO_ASIST_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        <div><label className="label-field">Alojamiento</label><input className="input-field" value={form.alojamiento} onChange={(e) => setForm((f) => ({ ...f, alojamiento: e.target.value }))} /></div>
        <div><label className="label-field">Alergias</label><input className="input-field" value={form.alergias} onChange={(e) => setForm((f) => ({ ...f, alergias: e.target.value }))} /></div>
      </div>
      <div>
        <label className="label-field">Transporte</label>
        <div className="flex flex-wrap gap-2 mt-1">{TRANSP_KEYS.map((k) => (<label key={k} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={form.transporte.includes(k)} onChange={() => toggleTransp(k)} /> {TRANSP_LABELS[k]}</label>))}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving||!form.nombre.trim()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{saving?"Guardando...":"Crear asistente"}</button>
        <button onClick={onCancel} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600">Cancelar</button>
      </div>
    </div>
  );
}

// ── Fila de invitacion ─────────────────────────────────────────────────────────
function InvitacionRow({ inv: initInv, adminCode, selected, onSelect, onDeleted }: { inv: Invitacion; adminCode: string; selected: boolean; onSelect: (id: string) => void; onDeleted: (id: string) => void }) {
  const [inv, setInv] = useState(initInv);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nombre_visible: inv.nombre_visible, tipo_invitacion: inv.tipo_invitacion, estado: inv.estado, nombre1: inv.nombre1 ?? "", nombre2: inv.nombre2 ?? "", adultos_estimados: inv.adultos_estimados, ninos_estimados: inv.ninos_estimados, bebes_estimados: inv.bebes_estimados, adolescentes_estimados: inv.adolescentes_estimados });
  const [savingInv, setSavingInv] = useState(false);
  const [addingA, setAddingA] = useState(false);

  const saveInv = async () => {
    setSavingInv(true);
    const res = await fetch(`/api/admin/${adminCode}/invitaciones/${inv.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSavingInv(false);
    if (res.ok) { setInv((i) => ({ ...i, ...form })); setEditing(false); }
  };
  const delInv = async () => {
    if (!confirm(`Eliminar invitacion &quot;${inv.nombre_visible}&quot; y todos sus asistentes?`)) return;
    const res = await fetch(`/api/admin/${adminCode}/invitaciones/${inv.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(inv.id);
  };
  const updateAsist = (a: Asistente) => setInv((i) => ({ ...i, asistentes: i.asistentes.map((x) => (x.id === a.id ? a : x)) }));
  const delAsist = (id: string) => setInv((i) => ({ ...i, asistentes: i.asistentes.filter((x) => x.id !== id) }));
  const addAsist = (a: Asistente) => { setInv((i) => ({ ...i, asistentes: [...i.asistentes, a] })); setAddingA(false); };

  const confirmados = inv.asistentes.filter((a) => a.estado_asistencia === "si").length;
  const total = inv.adultos_estimados + inv.ninos_estimados + inv.bebes_estimados + inv.adolescentes_estimados;

  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${selected ? "border-amber-300 bg-amber-50/30" : "border-stone-200 bg-white"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <input type="checkbox" checked={selected} onChange={() => onSelect(inv.invite_code)} className="h-4 w-4 rounded flex-shrink-0" />
        <button onClick={() => setExpanded((e) => !e)} className="text-stone-400 flex-shrink-0 text-xs">{expanded ? "▼" : "▶"}</button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
          <p className="font-semibold text-stone-800 truncate text-sm">{inv.nombre_visible}</p>
          <p className="text-xs text-stone-400 font-mono">{inv.invite_code}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${ESTADO_BADGE[inv.estado] ?? "bg-stone-100 text-stone-500 border-stone-200"}`}>{inv.estado.replace("_"," ")}</span>
        <span className="text-xs text-stone-400 hidden md:block flex-shrink-0">{inv.tipo_invitacion}</span>
        <div className="flex items-center gap-3 text-xs text-stone-500 flex-shrink-0">
          <span title="Estimados">📋 {total}</span>
          <span title="Confirmados" className={confirmados>0?"text-emerald-600 font-semibold":""}>✓ {confirmados}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setEditing((e) => !e)} className="text-xs text-amber-600 hover:text-amber-800">Editar</button>
          <button onClick={delInv} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
        </div>
      </div>

      {/* Edicion de la invitacion */}
      {editing && (
        <div className="border-t border-amber-200 bg-amber-50/60 px-5 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label-field">Nombre visible</label><input className="input-field" value={form.nombre_visible} onChange={(e) => setForm((f) => ({ ...f, nombre_visible: e.target.value }))} /></div>
            <div><label className="label-field">Nombre 1</label><input className="input-field" value={form.nombre1} onChange={(e) => setForm((f) => ({ ...f, nombre1: e.target.value }))} /></div>
            <div><label className="label-field">Nombre 2</label><input className="input-field" value={form.nombre2} onChange={(e) => setForm((f) => ({ ...f, nombre2: e.target.value }))} /></div>
            <div><label className="label-field">Tipo</label><select className="input-field" value={form.tipo_invitacion} onChange={(e) => setForm((f) => ({ ...f, tipo_invitacion: e.target.value }))}>{TIPO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div><label className="label-field">Estado</label><select className="input-field" value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>{ESTADO_INV_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
            <div><label className="label-field">Adultos est.</label><input type="number" min="0" className="input-field" value={form.adultos_estimados} onChange={(e) => setForm((f) => ({ ...f, adultos_estimados: Number(e.target.value) }))} /></div>
            <div><label className="label-field">Ninos est.</label><input type="number" min="0" className="input-field" value={form.ninos_estimados} onChange={(e) => setForm((f) => ({ ...f, ninos_estimados: Number(e.target.value) }))} /></div>
            <div><label className="label-field">Bebes est.</label><input type="number" min="0" className="input-field" value={form.bebes_estimados} onChange={(e) => setForm((f) => ({ ...f, bebes_estimados: Number(e.target.value) }))} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={saveInv} disabled={savingInv} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{savingInv?"Guardando...":"Guardar"}</button>
            <button onClick={() => setEditing(false)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600">Cancelar</button>
          </div>
        </div>
      )}

      {/* Asistentes */}
      {expanded && (
        <div className="border-t border-stone-100 px-4 py-3 space-y-2">
          {inv.asistentes.length === 0 && !addingA && <p className="text-sm text-stone-400 italic">Sin respuestas todavia.</p>}
          {inv.asistentes.map((a) => (
            <AsistenteEditRow key={a.id} a={a} adminCode={adminCode} onSaved={updateAsist} onDeleted={() => delAsist(a.id)} />
          ))}
          {addingA
            ? <NuevoAsistente adminCode={adminCode} invitacionId={inv.id} onCreated={addAsist} onCancel={() => setAddingA(false)} />
            : <button onClick={() => setAddingA(true)} className="mt-1 rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-xs text-stone-500 hover:border-amber-400 hover:text-amber-600">+ Anadir asistente</button>
          }
          <p className="text-xs text-stone-400 mt-2">Enlace: <span className="font-mono">/?inviteCode={inv.invite_code}</span></p>
        </div>
      )}
    </div>
  );
}

// ── Modal importacion ─────────────────────────────────────────────────────────
function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; created?: Array<{ invite_code: string; nombre_visible: string }>; errors?: Array<{ nombre_visible: string; error: string }>; error?: string } | null>(null);
  const doImport = async () => {
    if (!csv.trim()) return;
    setLoading(true);
    const res = await fetch("/api/invitations/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csvText: csv }) });
    setLoading(false);
    const d = await res.json();
    setResult(d);
    if (d.ok) onImported();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-base font-semibold text-stone-800">Importar invitaciones (CSV)</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-stone-500">Formato: <span className="font-mono">NombreVisible;TipoInvitacion;Adultos;Adolescentes;Ninos;Bebes;Nombre1;Nombre2</span></p>
          <div className="text-right"><button onClick={() => setCsv(TEMPLATE_CSV)} className="text-xs text-amber-600 hover:underline">Usar plantilla de ejemplo</button></div>
          <textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 font-mono text-sm resize-y" placeholder="Pega aqui el CSV..." />
          {result && (
            <div className={`rounded-xl border p-3 text-sm ${result.ok?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-red-200 bg-red-50 text-red-700"}`}>
              {result.ok ? `OK: ${result.created?.length??0} invitaciones creadas.` : result.error ?? "Error"}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-600">Cerrar</button>
            <button onClick={doImport} disabled={loading||!csv.trim()} className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading?"Importando...":"Importar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────────────────────
function buildRows(invitaciones: Invitacion[]) {
  const rows: Record<string, string | number>[] = [];
  for (const inv of invitaciones) {
    if (inv.asistentes.length === 0) {
      rows.push({ "Invitacion": inv.nombre_visible, "Codigo": inv.invite_code, "Tipo": inv.tipo_invitacion, "Estado invitacion": inv.estado, "Adultos est.": inv.adultos_estimados, "Ninos est.": inv.ninos_estimados, "Asistente": "", "Tipo persona": "", "Asistira": "", "Alojamiento": "", "Granada-Beas": "", "Beas-Torre": "", "Torre-GR": "", "Alergias": "", "Comentarios": "" });
    } else {
      for (const a of inv.asistentes) {
        const t = Array.isArray(a.transporte)?a.transporte:[];
        const n = a.necesidades??{};
        rows.push({ "Invitacion": inv.nombre_visible, "Codigo": inv.invite_code, "Tipo": inv.tipo_invitacion, "Estado invitacion": inv.estado, "Adultos est.": inv.adultos_estimados, "Ninos est.": inv.ninos_estimados, "Asistente": a.nombre, "Tipo persona": a.tipo_persona, "Asistira": a.estado_asistencia, "Alojamiento": n.alojamiento??"", "Granada-Beas": t.includes("granada-beas")?"Si":"No", "Beas-Torre": t.includes("beas-torre")?"Si":"No", "Torre-GR": t.includes("torre-granada")?"Si":"No", "Alergias": n.alergias??"", "Comentarios": a.comentarios??"" });
      }
    }
  }
  return rows;
}

function exportCSV(invitaciones: Invitacion[]) {
  const rows = buildRows(invitaciones);
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(";"), ...rows.map((r) => keys.map((k) => `"${String(r[k]).replace(/"/g,'""')}"`).join(";"))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `invitados-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}
function exportJSON(invitaciones: Invitacion[]) {
  const blob = new Blob([JSON.stringify(invitaciones, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `invitados-${new Date().toISOString().slice(0,10)}.json`; a.click();
}
function exportExcel(invitaciones: Invitacion[]) {
  const rows = buildRows(invitaciones);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Invitaciones");
  const totalConf = invitaciones.flatMap((i) => i.asistentes).filter((a) => a.estado_asistencia==="si").length;
  const resumen = [ { "Metrica": "Total invitaciones", "Valor": invitaciones.length }, { "Metrica": "Confirmadas", "Valor": invitaciones.filter((i) => i.estado==="confirmada").length }, { "Metrica": "Asistentes confirmados", "Valor": totalConf } ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");
  XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `invitados-${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InvitacionesView({ inviteCode, invitaciones: init }: { inviteCode: string; invitaciones: Invitacion[] }) {
  const [invitaciones, setInvitaciones] = useState(init);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<"todos"|"confirmada"|"pendiente"|"rechazada"|"sin_respuesta">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const filtradas = invitaciones
    .filter((i) => {
      if (filtro==="sin_respuesta") return i.asistentes.length===0;
      if (filtro==="pendiente") return i.estado==="pendiente"||i.estado==="pendiente_respondida";
      if (filtro!=="todos") return i.estado===filtro;
      return true;
    })
    .filter((i) => !busqueda.trim() || i.nombre_visible.toLowerCase().includes(busqueda.toLowerCase()) || i.invite_code.toLowerCase().includes(busqueda.toLowerCase()));

  const selectionForExport = filtradas.filter((i) => selected.size===0 || selected.has(i.invite_code));

  const toggleSelect = (code: string) => setSelected((s) => { const n = new Set(s); if (n.has(code)) n.delete(code); else n.add(code); return n; });
  const toggleAll = () => {
    if (selected.size === filtradas.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtradas.map((i) => i.invite_code)));
  };
  const handleDeleted = (id: string) => setInvitaciones((p) => p.filter((i) => i.id!==id));

  const totales = { total: invitaciones.length, confirmadas: invitaciones.filter((i) => i.estado==="confirmada").length, pendientes: invitaciones.filter((i) => i.estado.startsWith("pendiente")).length, rechazadas: invitaciones.filter((i) => i.estado==="rechazada").length, sin_respuesta: invitaciones.filter((i) => i.asistentes.length===0).length };
  const totalConf = invitaciones.flatMap((i) => i.asistentes).filter((a) => a.estado_asistencia==="si").length;

  return (
    <div className="space-y-5">
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); window.location.reload(); }} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Invitaciones</h1>
          <p className="mt-1 text-sm text-stone-500">{invitaciones.length} invitaciones · {totalConf} confirmados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)} className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">Importar CSV</button>
          <div className="relative">
            <button onClick={() => setShowExportMenu((s) => !s)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
              Exportar {selected.size>0?`(${selected.size} sel.)`:"(filtro)"} ▾
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-stone-200 bg-white shadow-lg overflow-hidden">
                {[["Excel (.xlsx)", () => exportExcel(selectionForExport)],["CSV (.csv)", () => exportCSV(selectionForExport)],["JSON (.json)", () => exportJSON(selectionForExport)]].map(([label, fn]) => (
                  <button key={label as string} onClick={() => { (fn as ()=>void)(); setShowExportMenu(false); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 text-stone-700">{label as string}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[{l:"Total",v:totales.total,c:"bg-stone-100"},{l:"Confirmadas",v:totales.confirmadas,c:"bg-emerald-50"},{l:"Pendientes",v:totales.pendientes,c:"bg-amber-50"},{l:"Rechazadas",v:totales.rechazadas,c:"bg-red-50"},{l:"Sin respuesta",v:totales.sin_respuesta,c:"bg-stone-50 border border-stone-200"}].map(({l,v,c}) => (
          <div key={l} className={`rounded-xl p-4 ${c}`}><p className="text-2xl font-semibold text-stone-800">{v}</p><p className="text-xs text-stone-500 mt-0.5">{l}</p></div>
        ))}
      </div>

      {/* Filtros + busqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5 flex-wrap">
          {([["todos","Todas"],["confirmada","Confirmadas"],["pendiente","Pendientes"],["rechazada","Rechazadas"],["sin_respuesta","Sin respuesta"]] as const).map(([v,l]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filtro===v?"bg-stone-800 text-white":"border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}>{l}</button>
          ))}
        </div>
        <input type="search" placeholder="Buscar por nombre o codigo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="ml-auto w-full sm:w-64 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm" />
      </div>

      {/* Header tabla */}
      {filtradas.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 text-xs text-stone-500">
          <input type="checkbox" checked={selected.size===filtradas.length && filtradas.length>0} onChange={toggleAll} className="h-4 w-4 rounded" />
          <span>Seleccionar todo ({filtradas.length})</span>
          {selected.size > 0 && <span className="text-amber-700 font-medium">{selected.size} seleccionadas</span>}
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.map((inv) => (
          <InvitacionRow key={inv.id} inv={inv} adminCode={inviteCode} selected={selected.has(inv.invite_code)} onSelect={toggleSelect} onDeleted={handleDeleted} />
        ))}
        {filtradas.length===0 && <p className="py-12 text-center text-sm text-stone-400">No hay invitaciones con estos criterios.</p>}
      </div>
    </div>
  );
}