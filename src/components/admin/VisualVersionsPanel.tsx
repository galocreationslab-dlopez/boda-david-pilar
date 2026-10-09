"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeddingConfig } from "@/config/wedding.config";
import { captureVisualSnapshot, compareVisualSnapshots, type ResourceIssue, type VisualSnapshot, type VisualVersionSummary } from "@/lib/visual-versions";

type Preview = {
  version: VisualVersionSummary & { snapshot: VisualSnapshot };
  revision: string;
  changes: ReturnType<typeof compareVisualSnapshots>;
  warnings: string[];
  resources: ResourceIssue[];
};

async function request<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(url, body ? {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "No se pudo completar la operacion.");
  return data;
}

export default function VisualVersionsPanel({
  inviteCode, draft, onApplied,
}: {
  inviteCode: string;
  draft: WeddingConfig;
  onApplied: (snapshot: VisualSnapshot) => void;
}) {
  const endpoint = `/api/admin/${encodeURIComponent(inviteCode)}/visual-versions`;
  const [versions, setVersions] = useState<VisualVersionSummary[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [mode, setMode] = useState<"toggle" | "split">("toggle");
  const [side, setSide] = useState<"A" | "B">("B");
  const [device, setDevice] = useState<"pc" | "movil">("pc");
  const [reload, setReload] = useState(0);
  const previewSequence = useRef(0);

  const refresh = useCallback(async () => {
    const result = await request<{ versions: VisualVersionSummary[] }>(endpoint);
    setVersions(result.versions);
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    request<{ versions: VisualVersionSummary[] }>(endpoint)
      .then((result) => { if (active) setVersions(result.versions); })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : "Error al cargar versiones."); });
    return () => { active = false; };
  }, [endpoint]);

  const save = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await request<{ version: VisualVersionSummary }>(endpoint, { action: "save", name, snapshot: captureVisualSnapshot(draft) });
      await refresh();
      setSelected(result.version.id); setPreview(null); setName("");
      setMessage("Version guardada con el estilo del editor. No se ha publicado ni aplicado.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se guardo la version."); }
    finally { setBusy(false); }
  };

  const previewVersion = useCallback(async (versionId: string) => {
    if (!versionId) {
      ++previewSequence.current; setPreview(null); setAcknowledged(false);
      return;
    }
    const sequence = ++previewSequence.current;
    setBusy(true); setError(""); setMessage(""); setPreview(null); setAcknowledged(false);
    try {
      const result = await request<Preview>(`${endpoint}?id=${encodeURIComponent(versionId)}`);
      if (sequence !== previewSequence.current) return;
      setPreview(result); setSide("B"); setReload((n) => n + 1);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo previsualizar."); }
    finally { setBusy(false); }
  }, [endpoint]);

  useEffect(() => {
    void previewVersion(selected);
  }, [previewVersion, selected]);

  const showPreview = () => { void previewVersion(selected); };

  const deleteSelected = async () => {
    const version = versions.find((item) => item.id === selected);
    if (!version || !confirm(`Eliminar "${version.name}"${version.kind === "backup" ? ", que es una copia recuperable" : ""}? Esta accion no se puede deshacer. No cambia el diseno actualmente aplicado.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await request<{ ok: true }>(endpoint, { id: version.id }, "DELETE");
      ++previewSequence.current;
      setPreview(null); setAcknowledged(false); setSelected("");
      await refresh();
      setMessage("Version eliminada. El diseno actual no ha cambiado.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo eliminar la version."); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    if (!preview || !confirm(`Aplicar "${preview.version.name}" a la web? Se guardaran una copia del estilo publicado y otra del borrador del editor. No se cambiaran contenido ni geometria.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      // Keep the unpublished editor design recoverable too; the published backup is atomic in SQL.
      await request(endpoint, {
        action: "save", name: `Borrador antes de ${preview.version.name}`.slice(0, 120), snapshot: captureVisualSnapshot(draft),
      });
      const result = await request<{ backupId: string; warnings: string[] }>(endpoint, {
        action: "apply", id: preview.version.id, expectedRevision: preview.revision,
        acknowledgeResources: acknowledged,
      });
      onApplied(preview.version.snapshot);
      setPreview(null);
      await refresh();
      setSelected(result.backupId);
      setMessage(`Version aplicada. Copia anterior seleccionada para recuperarla.${result.warnings.length ? " Algunas asignaciones se han omitido; consulta la comparacion." : ""}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se aplico la version.");
      await refresh().catch((refreshError: unknown) => setError((previous) => `${previous} ${refreshError instanceof Error ? refreshError.message : "No se pudo actualizar la lista."}`));
    } finally { setBusy(false); }
  };

  const iframe = (label: "A" | "B") => (
    <div className="space-y-2 min-w-0">
      <h3 className="font-semibold text-sm">{label === "A" ? "A · Actual publicada" : `B · ${preview?.version.name}`}</h3>
      <div className="overflow-auto rounded border bg-white">
        <iframe
          key={`${label}-${preview?.revision}-${reload}`}
          title={label === "A" ? "Version visual actual" : "Version visual candidata"}
          src={`/visual-preview/${encodeURIComponent(inviteCode)}/${label === "A" ? "current" : preview?.version.id}?revision=${preview?.revision}`}
          className="block border-0"
          style={{ width: device === "movil" ? 390 : 1100, height: 700 }}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="same-origin"
        />
      </div>
    </div>
  );

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 space-y-4" aria-label="Versiones visuales">
      <h2 className="text-lg font-semibold">Versiones visuales persistentes</h2>
      <p className="text-sm text-stone-600">
        Guardar captura una version completa del estilo del editor, no solo la paleta. Elegir una version actualiza la previsualizacion B;
        no la publica. A muestra la web publicada. Aplicar version es una accion aparte y crea copias recuperables.
        No se guardan ni cambian contenido, invitados, RSVP ni geometria.
      </p>
      <details className="text-sm text-stone-600">
        <summary className="cursor-pointer font-medium">Que incluye una version visual</summary>
        <p className="mt-2">Paletas completas y paleta activa; colores, texturas y asignaciones de roles a componentes; roles y fuentes con referencias a sus archivos, asignacion por componente y tamaños de texto; overrides de color, fuente, borde y tamaño tipografico; fondo, tratamientos de imagen y separadores; asignaciones visuales de Portada libre y pie por PC/movil; colores, fuente y tamaños de texto de navegación; lacre e imagen/color/acabado del sobre.</p>
        <p className="mt-1">No incluye posiciones, dimensiones ni proporciones; geometría del sobre; márgenes; tamaño de gráficos; contenido o medios insertados; orden, visibilidad, tipo o perfiles de secciones; textos, invitados, RSVP ni mensajes. Los recursos se referencian, no se copian.</p>
      </details>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Nombre de la version" className="input-field max-w-sm" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la version" />
        <button type="button" className="btn-primary" disabled={busy || !name.trim()} onClick={save}>Guardar version sin publicar</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Version guardada" className="input-field max-w-xl" value={selected} disabled={busy} onChange={(event) => {
          ++previewSequence.current; setSelected(event.target.value); setPreview(null); setAcknowledged(false);
        }}>
          <option value="">Selecciona una version</option>
          {versions.map((version) => <option key={version.id} value={version.id}>
            {version.kind === "backup" ? "[Copia recuperable] " : ""}{version.name} · {new Date(version.created_at).toLocaleString("es-ES")}
          </option>)}
        </select>
        <button type="button" className="btn-outline" disabled={busy || !selected} onClick={showPreview}>Actualizar previsualización A/B</button>
        <button type="button" className="btn-outline border-red-300 text-red-700" disabled={busy || !selected} onClick={deleteSelected}>Eliminar versión</button>
        <button type="button" className="btn-outline" disabled={busy} onClick={() => { setError(""); void refresh().catch((failure: unknown) => setError(failure instanceof Error ? failure.message : "Error al actualizar.")); }}>Actualizar lista</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      {busy && <p role="status" className="text-sm">Procesando...</p>}
      {preview && (
        <div className="space-y-3">
          <p className="text-sm">          B muestra ahora {preview.version.name} · Esquema {preview.version.snapshot.schema} v{preview.version.snapshot.schemaVersion} · Roles {preview.version.snapshot.rolesModel}. A y B conservan contenido y geometria actuales; alterna A/B o usa la vista lado a lado. Esto no publica los cambios.</p>
          <details>
            <summary className="cursor-pointer text-sm font-semibold">{preview.changes.length} diferencias visuales efectivas con la actual</summary>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs"><thead><tr><th>Campo</th><th>A · Actual</th><th>B · Version</th></tr></thead>
                <tbody>{preview.changes.map((change) => <tr key={change.path} className="border-t">
                  <td className="p-2 break-all">{change.path}</td>
                  <td className="p-2 break-all">{JSON.stringify(change.current)}</td>
                  <td className="p-2 break-all">{JSON.stringify(change.candidate)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
          {preview.warnings.length > 0 && <ul className="text-sm text-amber-800">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          {preview.resources.length > 0 && (
            <div className="rounded border border-amber-200 p-3 text-sm text-amber-900">
              <p className="font-semibold">Recursos ausentes o no verificables (no se duplican ni sustituyen)</p>
              <ul>{preview.resources.map((resource) => <li key={resource.reference} className="break-all">{resource.status === "missing" ? "Ausente" : "Sin verificar"}: {resource.reference} · {resource.detail}</li>)}</ul>
              <label className="flex gap-2 mt-2"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />He revisado los recursos y acepto aplicar conservando sus referencias.</label>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline" aria-pressed={mode === "toggle"} onClick={() => setMode("toggle")}>Alternar A/B</button>
            <button type="button" className="btn-outline" aria-pressed={mode === "split"} onClick={() => setMode("split")}>Lado a lado</button>
            {mode === "toggle" && <><button type="button" className="btn-outline" aria-pressed={side === "A"} onClick={() => setSide("A")}>A · Actual</button><button type="button" className="btn-outline" aria-pressed={side === "B"} onClick={() => setSide("B")}>B · Version</button></>}
            <select aria-label="Dispositivo A/B" className="input-field max-w-40" value={device} onChange={(event) => setDevice(event.target.value === "movil" ? "movil" : "pc")}><option value="pc">PC</option><option value="movil">Movil</option></select>
            <button type="button" className="btn-outline" onClick={() => setReload((n) => n + 1)}>Reiniciar previsualizacion</button>
            <button type="button" className="btn-primary" disabled={busy || (preview.resources.length > 0 && !acknowledged)} onClick={apply}>Aplicar version explicitamente</button>
          </div>
          <div className={mode === "split" ? "grid gap-4 xl:grid-cols-2" : ""}>
            {(mode === "split" || side === "A") && iframe("A")}
            {(mode === "split" || side === "B") && iframe("B")}
          </div>
        </div>
      )}
    </section>
  );
}
