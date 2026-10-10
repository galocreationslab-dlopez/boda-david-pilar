"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicationItem } from "@/lib/resource-publication";

function isItem(value: unknown): value is PublicationItem {
  return Boolean(value && typeof value === "object" &&
    "fileId" in value && typeof value.fileId === "string" &&
    "source" in value && typeof value.source === "string" &&
    "name" in value && typeof value.name === "string" &&
    "status" in value && ["pending", "published", "error", "uploading"].includes(String(value.status)) &&
    "error" in value && (value.error === null || typeof value.error === "string") &&
    "publishedUrl" in value && (value.publishedUrl === null || typeof value.publishedUrl === "string"));
}

async function readResponse(response: Response): Promise<unknown> {
  const data: unknown = await response.json();
  if (!response.ok) {
    throw new Error(data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error : `No se pudo publicar: HTTP ${response.status}`);
  }
  return data;
}

export default function ResourcePublicationPanel({
  inviteCode, disabled, beforePublish, onBusyChange,
}: {
  inviteCode: string;
  disabled: boolean;
  beforePublish: () => Promise<boolean>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<PublicationItem[]>([]);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null);
  const [result, setResult] = useState("");
  const endpoint = `/api/admin/${encodeURIComponent(inviteCode)}/resources/publish`;
  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    const data = await readResponse(await fetch(endpoint, { cache: "no-store", signal }));
    if (!data || typeof data !== "object" || !("items" in data) || !Array.isArray(data.items) ||
      !data.items.every(isItem) || !("storageConfigured" in data) || typeof data.storageConfigured !== "boolean") {
      throw new Error("El servidor devolvio un estado de publicacion invalido.");
    }
    return { items: data.items, configured: data.storageConfigured };
  }, [endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    void loadStatus(controller.signal).then((status) => {
      if (controller.signal.aborted) return;
      setItems(status.items);
      setConfigured(status.configured);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo consultar la publicacion.");
    });
    return () => controller.abort();
  }, [loadStatus]);

  const publish = async () => {
    setBusy(true);
    onBusyChange(true);
    setError("");
    setResult("");
    setProgress(null);
    try {
      // Check setup before saving content, then get the exact newly saved selection.
      const setup = await loadStatus();
      setConfigured(setup.configured);
      if (!setup.configured) throw new Error("Conecta Vercel Blob publico y configura BLOB_READ_WRITE_TOKEN en el servidor.");
      if (!(await beforePublish())) throw new Error("No se publico ningun recurso porque no se pudo guardar el contenido.");
      const selection = await loadStatus();
      setItems(selection.items);
      let published = 0;
      let reused = 0;
      let failed = 0;
      for (const [index, item] of selection.items.entries()) {
        setProgress({ done: index, total: selection.items.length, name: item.name });
        setItems((previous) => previous.map((entry) => entry.fileId === item.fileId ? { ...entry, status: "uploading", error: null } : entry));
        try {
          const response = await fetch(endpoint, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId: item.fileId }),
          });
          const data = await readResponse(response);
          if (!data || typeof data !== "object" || !("item" in data) || !isItem(data.item) ||
            !("reused" in data) || typeof data.reused !== "boolean") {
            throw new Error("El servidor devolvio un resultado de publicacion invalido.");
          }
          const updated = data.item;
          setItems((previous) => previous.map((entry) => entry.fileId === updated.fileId ? updated : entry));
          if (data.reused) reused++; else published++;
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "No se pudo publicar el recurso.";
          failed++;
          setItems((previous) => previous.map((entry) => entry.fileId === item.fileId ? { ...entry, status: "error", error: message } : entry));
        }
        setProgress({ done: index + 1, total: selection.items.length, name: "" });
      }
      setResult(`${published} publicados, ${reused} reutilizados y ${failed} fallidos.${failed ? " Pulsa Reintentar para comprobar y publicar de nuevo." : ""}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron publicar los recursos.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };

  const failures = items.filter((item) => item.status === "error");
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-stone-800">Recursos en servidor</h2>
          <p className="mt-1 text-sm text-stone-600">
            Guarda el contenido actual y publica copias exactas de las imagenes seleccionadas en Vercel Blob.
            Incluye PC, movil y texturas configuradas. Los originales permanecen en Drive.
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Las copias son publicas para quien tenga su URL. No se comprimen ni se borran versiones anteriores.
            Puedes repetir la operacion: los originales sin cambios se reutilizan.
          </p>
        </div>
        <button type="button" onClick={() => void publish()} disabled={disabled || busy}
          className="rounded-xl bg-stone-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-stone-900">
          {busy ? "Publicando recursos..." : failures.length ? "Reintentar publicacion" : "Guardar recursos en servidor"}
        </button>
      </div>
      <div role="status" aria-live="polite" className="text-sm text-stone-700">
        {progress && <p>{progress.done} de {progress.total} comprobados{progress.name ? `: ${progress.name}` : ""}</p>}
        {result || (!busy && !error && `${items.filter((item) => item.publishedUrl).length} de ${items.length} recursos tienen copia publicada.`)}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!configured && !error && <p className="text-sm text-amber-800">Falta conectar Vercel Blob publico y configurar BLOB_READ_WRITE_TOKEN.</p>}
      {failures.length > 0 && <ul className="space-y-1 text-sm text-red-700">
        {failures.map((item) => <li key={item.fileId}>{item.name}: {item.error}</li>)}
      </ul>}
    </section>
  );
}
