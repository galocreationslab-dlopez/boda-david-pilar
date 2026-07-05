"use client";

import { useState } from "react";
import type { Localizacion, WeddingConfig } from "@/config/wedding.config";

type Props = {
  inviteCode: string;
  config: WeddingConfig;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function toFechaHora(loc: Localizacion): string {
  const fecha = loc.fecha?.trim() ?? "";
  const hora = loc.hora?.trim() ?? "";
  if (!fecha && !hora) return "";
  if (!fecha) return hora;
  if (!hora) return fecha;
  return `${fecha} - ${hora}`;
}

function splitFechaHora(value: string): { fecha: string; hora: string } {
  const raw = value.trim();
  if (!raw) return { fecha: "", hora: "" };
  const sep = raw.split("-");
  if (sep.length === 1) return { fecha: raw, hora: "" };
  const fecha = sep.slice(0, sep.length - 1).join("-").trim();
  const hora = sep[sep.length - 1].trim();
  return { fecha, hora };
}

export default function DatosBodaView({ inviteCode, config }: Props) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [noviaNombre, setNoviaNombre] = useState(config.novia.nombre ?? "");
  const [novioNombre, setNovioNombre] = useState(config.novio.nombre ?? "");
  const [inicialNovia, setInicialNovia] = useState(config.iniciales.novia ?? "");
  const [inicialNovio, setInicialNovio] = useState(config.iniciales.novio ?? "");
  const [nombreConjunto, setNombreConjunto] = useState(config.nombreConjunto ?? `${config.novia.nombre} & ${config.novio.nombre}`);
  const [inicialesConjuntas, setInicialesConjuntas] = useState(config.inicialesConjuntas ?? `${config.iniciales.novia}&${config.iniciales.novio}`);
  const [bienvenida, setBienvenida] = useState(config.textos.bienvenida ?? "");
  const [fechaFormateada, setFechaFormateada] = useState(config.fechaFormateada ?? "");

  const [ubicaciones, setUbicaciones] = useState<Array<Localizacion & { fechaHoraTexto?: string }>>(
    (config.localizaciones ?? []).map((loc) => ({
      ...loc,
      fechaHoraTexto: toFechaHora(loc),
    })),
  );

  const showMsg = (type: "ok" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const updateUbicacion = (id: string, patch: Partial<Localizacion & { fechaHoraTexto?: string }>) => {
    setUbicaciones((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...patch } : loc)));
  };

  const addUbicacion = () => {
    const id = uid();
    setUbicaciones((prev) => [
      ...prev,
      {
        id,
        nombre: "",
        descripcion: "",
        direccion: "",
        coordenadas: { lat: 0, lng: 0 },
        hora: "",
        diaSemana: "",
        fecha: "",
        icono: "finca",
        enlaceMaps: "",
        fechaHoraTexto: "",
      },
    ]);
  };

  const removeUbicacion = (id: string) => {
    if (!confirm("¿Eliminar esta ubicación?")) return;
    setUbicaciones((prev) => prev.filter((loc) => loc.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      const localizaciones = ubicaciones.map((loc) => {
        const parsed = splitFechaHora(loc.fechaHoraTexto ?? "");
        const titulo = loc.nombre.trim() || "Ubicación";
        const lugar = loc.descripcion.trim() || "";
        return {
          ...loc,
          nombre: titulo,
          descripcion: lugar,
          fecha: parsed.fecha || loc.fecha || "",
          hora: parsed.hora || loc.hora || "",
        } as Localizacion;
      });

      const payload = {
        novia: { ...config.novia, nombre: noviaNombre },
        novio: { ...config.novio, nombre: novioNombre },
        iniciales: { novia: inicialNovia, novio: inicialNovio },
        nombreConjunto,
        inicialesConjuntas,
        fechaFormateada,
        textos: {
          ...config.textos,
          bienvenida,
        },
        localizaciones,
      };

      const res = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo guardar");
      showMsg("ok", "Datos de boda guardados correctamente.");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Datos Boda</h1>
          <p className="mt-1 text-sm text-stone-500">Configura los datos principales del HERO y las ubicaciones del evento.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl border p-4 text-sm ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-700">Novios</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label-field">Novi@ 1</label>
            <input className="input-field" value={noviaNombre} onChange={(e) => setNoviaNombre(e.target.value)} placeholder="Pilar" />
          </div>
          <div>
            <label className="label-field">Inicial Novi@ 1</label>
            <input className="input-field" value={inicialNovia} onChange={(e) => setInicialNovia(e.target.value)} placeholder="P" />
          </div>
          <div>
            <label className="label-field">Novi@ 2</label>
            <input className="input-field" value={novioNombre} onChange={(e) => setNovioNombre(e.target.value)} placeholder="David" />
          </div>
          <div>
            <label className="label-field">Inicial Novi@ 2</label>
            <input className="input-field" value={inicialNovio} onChange={(e) => setInicialNovio(e.target.value)} placeholder="D" />
          </div>
          <div>
            <label className="label-field">Nombre conjunto</label>
            <input className="input-field" value={nombreConjunto} onChange={(e) => setNombreConjunto(e.target.value)} placeholder="Pilar & David" />
          </div>
          <div>
            <label className="label-field">Iniciales conjuntas</label>
            <input className="input-field" value={inicialesConjuntas} onChange={(e) => setInicialesConjuntas(e.target.value)} placeholder="P&D" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-700">HERO</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label-field">Fecha visible</label>
            <input className="input-field" value={fechaFormateada} onChange={(e) => setFechaFormateada(e.target.value)} placeholder="6 de marzo de 2027" />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Texto de bienvenida</label>
            <textarea className="input-field" rows={3} value={bienvenida} onChange={(e) => setBienvenida(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-stone-700">Ubicaciones</h2>
          <button onClick={addUbicacion} className="rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:border-amber-400 hover:text-amber-600">+ Añadir ubicación</button>
        </div>

        {ubicaciones.map((loc) => (
          <div key={loc.id} className="rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-700">{loc.nombre || "Nueva ubicación"}</p>
              <button onClick={() => removeUbicacion(loc.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="label-field">Fecha y hora</label>
                <input className="input-field" value={loc.fechaHoraTexto ?? ""} onChange={(e) => updateUbicacion(loc.id, { fechaHoraTexto: e.target.value })} placeholder="06mar27 - 12:00" />
              </div>
              <div>
                <label className="label-field">Título</label>
                <input className="input-field" value={loc.nombre} onChange={(e) => updateUbicacion(loc.id, { nombre: e.target.value })} placeholder="Ceremonia en la iglesia" />
              </div>
              <div>
                <label className="label-field">Lugar</label>
                <input className="input-field" value={loc.descripcion} onChange={(e) => updateUbicacion(loc.id, { descripcion: e.target.value })} placeholder="Dirección en texto" />
              </div>
              <div>
                <label className="label-field">Cómo llegar (Google Maps URL)</label>
                <input className="input-field" value={loc.enlaceMaps ?? ""} onChange={(e) => updateUbicacion(loc.id, { enlaceMaps: e.target.value })} placeholder="https://maps.google.com/..." />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-base font-semibold text-stone-700">Permisos (fase siguiente)</h2>
        <p className="mt-2 text-sm text-stone-500">La gestión de roles personalizados de invitado se implementará en la siguiente fase junto al sistema de visibilidad por rol.</p>
      </section>
    </div>
  );
}
