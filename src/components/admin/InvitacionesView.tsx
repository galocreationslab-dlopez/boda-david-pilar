"use client";

import { useState } from "react";

type Asistente = {
  id: string;
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
  confirmada:           "bg-emerald-100 text-emerald-700 border-emerald-200",
  rechazada:            "bg-red-100 text-red-700 border-red-200",
  pendiente:            "bg-stone-100 text-stone-500 border-stone-200",
  pendiente_respondida: "bg-amber-100 text-amber-700 border-amber-200",
};

const ASISTENCIA_ICON: Record<string, string> = { si: "✓", no: "✗", pendiente: "·" };
const ASISTENCIA_COLOR: Record<string, string> = {
  si: "text-emerald-600 font-semibold",
  no: "text-red-500",
  pendiente: "text-stone-400",
};

const TRANSPORTE_LABELS: Record<string, string> = {
  "granada-beas": "GR→Beas",
  "beas-torre": "Beas→Torre",
  "torre-granada": "Torre→GR",
};

function AsistenteRow({ a }: { a: Asistente }) {
  const nec = a.necesidades ?? {};
  const transp: string[] = Array.isArray(a.transporte) ? a.transporte : [];
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-base ${ASISTENCIA_COLOR[a.estado_asistencia] ?? ""}`}>
            {ASISTENCIA_ICON[a.estado_asistencia] ?? "·"}
          </span>
          <span className="font-medium text-stone-800">{a.nombre}</span>
          {a.edad != null && <span className="text-xs text-stone-400">({a.edad} años)</span>}
          <span className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-xs text-stone-500">
            {a.tipo_persona}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 text-xs text-stone-500">
        {nec.alojamiento && (
          <span>🏨 <span className="text-stone-700">{nec.alojamiento}</span></span>
        )}
        {transp.length > 0 && (
          <span>🚌 {transp.map((t) => TRANSPORTE_LABELS[t] ?? t).join(", ")}</span>
        )}
        {nec.alergias && (
          <span className="text-amber-600">⚠ {nec.alergias}</span>
        )}
        {nec.necesidades_alimentarias && (
          <span>🍽 {nec.necesidades_alimentarias}</span>
        )}
        {nec.menu_adulto && <span>📋 Menú adulto</span>}
        {nec.necesita_trona && <span>🪑 Trona</span>}
        {a.comentarios && (
          <span className="italic text-stone-400">"{a.comentarios}"</span>
        )}
      </div>
    </div>
  );
}

function InvitacionRow({ inv }: { inv: Invitacion }) {
  const [expanded, setExpanded] = useState(false);
  const confirmados = inv.asistentes.filter((a) => a.estado_asistencia === "si").length;
  const totalEstimados =
    inv.adultos_estimados + inv.adolescentes_estimados + inv.ninos_estimados + inv.bebes_estimados;

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {/* Cabecera (siempre visible) */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-stone-50"
      >
        {/* Expand icon */}
        <span className="text-stone-400 text-sm w-4 flex-shrink-0">
          {expanded ? "▼" : "▶"}
        </span>

        {/* Nombre + código */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800 truncate">{inv.nombre_visible}</p>
          <p className="text-xs text-stone-400 font-mono">{inv.invite_code}</p>
        </div>

        {/* Estado */}
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[inv.estado] ?? "bg-stone-100 text-stone-500 border-stone-200"}`}>
          {inv.estado.replace("_", " ")}
        </span>

        {/* Tipo */}
        <span className="text-xs text-stone-400 hidden sm:block">{inv.tipo_invitacion}</span>

        {/* Contadores */}
        <div className="flex items-center gap-3 text-xs text-stone-500 flex-shrink-0">
          <span title="Estimados">
            📋 {totalEstimados}
          </span>
          <span title="Confirmados" className={confirmados > 0 ? "text-emerald-600 font-semibold" : ""}>
            ✓ {confirmados}
          </span>
          {inv.asistentes.length > 0 && (
            <span className="text-stone-400">({inv.asistentes.length} respuestas)</span>
          )}
        </div>
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-stone-100 px-5 py-4">
          {inv.asistentes.length === 0 ? (
            <p className="text-sm text-stone-400 italic">
              Todavía no han enviado ninguna respuesta.
            </p>
          ) : (
            <div className="space-y-2">
              {inv.asistentes.map((a) => (
                <AsistenteRow key={a.id} a={a} />
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-stone-400">
            Enlace de invitación:&nbsp;
            <span className="font-mono">/?inviteCode={inv.invite_code}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function InvitacionesView({
  inviteCode,
  invitaciones,
}: {
  inviteCode: string;
  invitaciones: Invitacion[];
}) {
  const [filtro, setFiltro] = useState<"todos" | "confirmada" | "pendiente" | "rechazada" | "sin_respuesta">("todos");
  const [busqueda, setBusqueda] = useState("");

  const filtradas = invitaciones
    .filter((i) => {
      if (filtro === "sin_respuesta") return i.asistentes.length === 0;
      if (filtro === "pendiente")
        return i.estado === "pendiente" || i.estado === "pendiente_respondida";
      if (filtro !== "todos") return i.estado === filtro;
      return true;
    })
    .filter((i) =>
      busqueda.trim() === "" ||
      i.nombre_visible.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.invite_code.toLowerCase().includes(busqueda.toLowerCase())
    );

  const totales = {
    total:        invitaciones.length,
    confirmadas:  invitaciones.filter((i) => i.estado === "confirmada").length,
    pendientes:   invitaciones.filter((i) => i.estado.startsWith("pendiente")).length,
    rechazadas:   invitaciones.filter((i) => i.estado === "rechazada").length,
    sin_respuesta: invitaciones.filter((i) => i.asistentes.length === 0).length,
  };
  const totalConfirmados = invitaciones.flatMap((i) => i.asistentes).filter((a) => a.estado_asistencia === "si").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-800">Invitaciones</h1>
        <p className="mt-1 text-sm text-stone-500">
          {invitaciones.length} invitaciones · {totalConfirmados} personas confirmadas
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total",         value: totales.total,         color: "bg-stone-100" },
          { label: "Confirmadas",   value: totales.confirmadas,   color: "bg-emerald-50" },
          { label: "Pendientes",    value: totales.pendientes,    color: "bg-amber-50" },
          { label: "Rechazadas",    value: totales.rechazadas,    color: "bg-red-50" },
          { label: "Sin respuesta", value: totales.sin_respuesta, color: "bg-stone-50 border border-stone-200" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl p-4 ${color}`}>
            <p className="text-2xl font-semibold text-stone-800">{value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5 flex-wrap">
          {([
            ["todos",        "Todas"],
            ["confirmada",   "Confirmadas"],
            ["pendiente",    "Pendientes"],
            ["rechazada",    "Rechazadas"],
            ["sin_respuesta","Sin respuesta"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFiltro(val)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtro === val
                  ? "bg-stone-800 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar por nombre o código…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="ml-auto w-full sm:w-64 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm"
        />
      </div>

      {/* Lista de invitaciones */}
      <div className="space-y-2">
        {filtradas.map((inv) => (
          <InvitacionRow key={inv.id} inv={inv} />
        ))}
        {filtradas.length === 0 && (
          <p className="py-12 text-center text-sm text-stone-400">
            No hay invitaciones con estos criterios.
          </p>
        )}
      </div>
    </div>
  );
}
