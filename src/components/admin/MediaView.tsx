"use client";

import { useState } from "react";
import type { DriveConfig } from "@/config/wedding.config";

type Props = {
  inviteCode: string;
  drive: DriveConfig;
};

export default function MediaView({ inviteCode, drive: initialDrive }: Props) {
  const [drive, setDrive] = useState(initialDrive);
  const [savingDrive, setSavingDrive] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Recursos</h1>
          <p className="mt-1 text-sm text-stone-500">Define dónde se guardan los recursos visuales que usa la web.</p>
        </div>
      </div>

      {feedback && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{feedback}</div>}

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-700">Drive de recursos</h2>
        <p className="text-sm text-stone-500">Estas rutas son usadas por Configuración para subir y enlazar imágenes de historia/timeline.</p>
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
    </div>
  );
}