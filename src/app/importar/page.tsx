"use client";

import { useState } from "react";

export default function ImportarPage() {
  const [csvText, setCsvText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    setStatus(null);

    try {
      if (!csvText.trim()) {
        throw new Error("El CSV está vacío");
      }

      const response = await fetch("/api/invitations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "No se pudo importar");
      }

      setStatus(`Importación correcta. Invitaciones creadas: ${result.created?.length || 0}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ha ocurrido un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-800">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Importación</p>
          <h1 className="text-3xl font-semibold text-stone-900">Importar invitaciones desde CSV</h1>
          <p className="mt-2 text-sm text-stone-600">
            Pega aquí el contenido del CSV exportado desde Google Sheets. El importador acepta tanto comas como punto y coma y también maneja celdas entre comillas.
          </p>
        </div>

        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          className="min-h-[320px] rounded-2xl border border-stone-300 bg-stone-50 p-4 font-mono text-sm"
          placeholder='Invitados;Adultos;Adolescentes;Niños;Bebés;\n"Pilar y David";2;0;0;0;'
        />

        <button
          onClick={handleImport}
          disabled={loading || !csvText.trim()}
          className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Importando..." : "Importar CSV"}
        </button>

        {status && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
