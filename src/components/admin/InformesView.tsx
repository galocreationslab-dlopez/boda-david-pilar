"use client";

import { useState } from "react";

type Asistente = {
  nombre: string;
  edad: number | null;
  tipo_persona: string;
  estado_asistencia: string;
  transporte: string[];
  necesidades: Record<string, any>;
  comentarios: string | null;
};

type Invitacion = {
  id: string;
  invite_code: string;
  nombre_visible: string;
  tipo_invitacion: string;
  estado: string;
  adultos_estimados: number;
  adolescentes_estimados: number;
  ninos_estimados: number;
  bebes_estimados: number;
  created_at: string;
  asistentes: Asistente[];
};

const ESTADO_BADGE: Record<string, string> = {
  confirmada: "bg-emerald-100 text-emerald-700",
  rechazada:  "bg-red-100 text-red-700",
  pendiente:  "bg-stone-100 text-stone-600",
  pendiente_respondida: "bg-amber-100 text-amber-700",
};

export default function InformesView({
  inviteCode,
  invitaciones,
}: {
  inviteCode: string;
  invitaciones: Invitacion[];
}) {
  const [filtro, setFiltro] = useState<"todos" | "confirmada" | "pendiente" | "rechazada">("todos");
  const [descargando, setDescargando] = useState(false);

  const filtradas = filtro === "todos"
    ? invitaciones
    : invitaciones.filter((i) =>
        filtro === "pendiente"
          ? i.estado === "pendiente" || i.estado === "pendiente_respondida"
          : i.estado === filtro
      );

  const totalAsistentes = invitaciones
    .flatMap((i) => i.asistentes)
    .filter((a) => a.estado_asistencia === "si").length;

  const handleExport = async () => {
    setDescargando(true);
    try {
      const res = await fetch(`/api/admin/${inviteCode}/export`);
      if (!res.ok) throw new Error("Error al generar el Excel");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invitados-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera + acciones */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Informes</h1>
          <p className="mt-1 text-sm text-stone-500">
            {invitaciones.length} invitaciones · {totalAsistentes} asistentes confirmados
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={descargando}
          className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-amber-800 transition-colors"
        >
          {descargando ? "Generando…" : "⬇ Exportar Excel"}
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total",       value: invitaciones.length,                                                   color: "bg-stone-100" },
          { label: "Confirmadas", value: invitaciones.filter((i) => i.estado === "confirmada").length,          color: "bg-emerald-50" },
          { label: "Pendientes",  value: invitaciones.filter((i) => i.estado.startsWith("pendiente")).length,   color: "bg-amber-50" },
          { label: "Rechazadas",  value: invitaciones.filter((i) => i.estado === "rechazada").length,           color: "bg-red-50" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl p-5 ${color}`}>
            <p className="text-3xl font-semibold text-stone-800">{value}</p>
            <p className="mt-1 text-sm text-stone-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        {(["todos", "confirmada", "pendiente", "rechazada"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
              filtro === f ? "bg-stone-800 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}s
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-5 py-3 text-left">Invitación</th>
              <th className="px-5 py-3 text-left">Tipo</th>
              <th className="px-5 py-3 text-left">Estado</th>
              <th className="px-5 py-3 text-center">Adultos est.</th>
              <th className="px-5 py-3 text-center">Niños est.</th>
              <th className="px-5 py-3 text-left">Asistentes confirmados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtradas.map((inv) => {
              const confirmados = inv.asistentes.filter((a) => a.estado_asistencia === "si");
              return (
                <tr key={inv.id} className="hover:bg-stone-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-stone-800">{inv.nombre_visible}</p>
                    <p className="text-xs text-stone-400">{inv.invite_code}</p>
                  </td>
                  <td className="px-5 py-4 text-stone-500">{inv.tipo_invitacion}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[inv.estado] ?? "bg-stone-100 text-stone-600"}`}>
                      {inv.estado}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">{inv.adultos_estimados}</td>
                  <td className="px-5 py-4 text-center">{inv.ninos_estimados}</td>
                  <td className="px-5 py-4">
                    {confirmados.length === 0 ? (
                      <span className="text-stone-400">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {confirmados.map((a, i) => {
                          const nec = a.necesidades ?? {};
                          const transp = Array.isArray(a.transporte) ? a.transporte : [];
                          return (
                            <li key={i} className="text-stone-700">
                              <span className="font-medium">{a.nombre}</span>
                              {a.edad != null && <span className="text-stone-400"> · {a.edad} años</span>}
                              {nec.alojamiento && <span className="ml-2 text-xs text-stone-400">🏨 {nec.alojamiento}</span>}
                              {transp.length > 0 && (
                                <span className="ml-2 text-xs text-stone-400">
                                  🚌 {transp.map((t: string) => ({ "granada-beas": "GR→Beas", "beas-torre": "Beas→Torre", "torre-granada": "Torre→GR" }[t] ?? t)).join(", ")}
                                </span>
                              )}
                              {nec.alergias && <span className="ml-2 text-xs text-amber-600">⚠ {nec.alergias}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtradas.length === 0 && (
          <p className="py-12 text-center text-sm text-stone-400">No hay invitaciones con este filtro.</p>
        )}
      </div>
    </div>
  );
}
