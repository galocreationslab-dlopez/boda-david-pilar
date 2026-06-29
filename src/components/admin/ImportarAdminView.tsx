"use client";

import { useState } from "react";

const TEMPLATE = `NombreVisible;TipoInvitacion;Adultos;Adolescentes;Ninos;Bebes;Nombre1;Nombre2
Juan y María García;pareja;2;0;1;0;Juan;María
Carlos López;soltero;1;0;0;0;Carlos;
Familia Rodríguez;familia;2;1;2;1;Pedro;Ana`;

const COLUMNAS_INFO = [
  { nombre: "NombreVisible",   desc: "Nombre que verán los invitados (requerido)" },
  { nombre: "TipoInvitacion",  desc: "pareja, soltero, familia, individual, otro, admin" },
  { nombre: "Adultos",         desc: "Número de adultos estimados" },
  { nombre: "Adolescentes",    desc: "Número de adolescentes estimados" },
  { nombre: "Ninos",           desc: "Número de niños estimados" },
  { nombre: "Bebes",           desc: "Número de bebés estimados" },
  { nombre: "Nombre1",         desc: "Nombre del primer invitado (requerido)" },
  { nombre: "Nombre2",         desc: "Nombre del segundo invitado (solo parejas)" },
];

export default function ImportarAdminView({ inviteCode }: { inviteCode: string }) {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; created?: any[]; errors?: any[]; message?: string } | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/invitations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Error desconocido" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-stone-800">Importar invitaciones</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pega un CSV o texto con formato de tabla para crear las invitaciones en masa.
          Se usa <code className="text-xs bg-stone-100 px-1 py-0.5 rounded">;</code> o{" "}
          <code className="text-xs bg-stone-100 px-1 py-0.5 rounded">,</code> como separador.
        </p>
      </div>

      {/* Referencia de columnas */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <button
          type="button"
          onClick={() => setShowTemplate((s) => !s)}
          className="flex w-full items-center justify-between text-sm font-semibold text-stone-700"
        >
          <span>Columnas disponibles y ejemplo</span>
          <span className="text-stone-400">{showTemplate ? "▲" : "▼"}</span>
        </button>

        {showTemplate && (
          <div className="mt-4 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-stone-100">
              <table className="w-full text-xs">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-stone-500 font-medium">Columna</th>
                    <th className="px-4 py-2 text-left text-stone-500 font-medium">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {COLUMNAS_INFO.map((c) => (
                    <tr key={c.nombre}>
                      <td className="px-4 py-2 font-mono font-medium text-amber-700">{c.nombre}</td>
                      <td className="px-4 py-2 text-stone-600">{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-stone-500 uppercase tracking-wider">Ejemplo CSV</p>
              <pre className="rounded-xl bg-stone-900 p-4 text-xs text-stone-100 overflow-x-auto whitespace-pre">{TEMPLATE}</pre>
              <button
                type="button"
                onClick={() => setCsvText(TEMPLATE)}
                className="mt-2 text-xs text-amber-700 hover:text-amber-800 underline"
              >
                Usar este ejemplo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Área de pegado */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
        <label className="block text-sm font-semibold text-stone-700">Datos CSV</label>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={"NombreVisible;TipoInvitacion;Adultos;Ninos;Bebes;Nombre1;Nombre2\nJuan y María;pareja;2;0;0;Juan;María"}
          rows={10}
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 font-mono text-sm resize-y focus:border-amber-400 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-400">
            {csvText.trim().split("\n").filter(Boolean).length} líneas
            {csvText.trim().split("\n").filter(Boolean).length > 1
              ? ` (${csvText.trim().split("\n").filter(Boolean).length - 1} invitaciones)`
              : ""}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setCsvText(""); setResult(null); }}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || !csvText.trim()}
              className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-amber-800 transition-colors"
            >
              {loading ? "Importando…" : "Importar"}
            </button>
          </div>
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`rounded-2xl border p-5 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          {result.ok ? (
            <div className="space-y-3">
              <p className="font-semibold text-emerald-700">
                ✓ {result.created?.length ?? 0} invitaciones creadas correctamente
              </p>
              {result.created && result.created.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-600">
                      <tr>
                        <th className="px-4 py-2 text-left">Nombre visible</th>
                        <th className="px-4 py-2 text-left">Código de invitación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {result.created.map((inv: any) => (
                        <tr key={inv.invite_code}>
                          <td className="px-4 py-2 text-stone-700">{inv.nombre_visible}</td>
                          <td className="px-4 py-2 font-mono text-xs text-stone-500">{inv.invite_code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-700">Advertencias:</p>
                  <ul className="mt-1 space-y-1">
                    {result.errors.map((e: any, i: number) => (
                      <li key={i} className="text-sm text-amber-600">{e.nombre_visible}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-700">{result.message ?? "Error al importar"}</p>
          )}
        </div>
      )}
    </div>
  );
}
