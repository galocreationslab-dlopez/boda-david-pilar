"use client";

import { useMemo, useState } from "react";

const DEFAULT_PREVIEW_ASPECT_RATIO = 16 / 9;

function parseNumericDimension(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function detectDemoHtmlAspectRatio(demoHtml: string): number {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(demoHtml, "text/html");
    const svg = doc.querySelector("svg");

    if (!svg) {
      return DEFAULT_PREVIEW_ASPECT_RATIO;
    }

    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
      const tokens = viewBox
        .trim()
        .split(/[\s,]+/)
        .map((token) => Number(token));

      if (tokens.length === 4) {
        const width = tokens[2];
        const height = tokens[3];
        if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
          return width / height;
        }
      }
    }

    const width = parseNumericDimension(svg.getAttribute("width"));
    const height = parseNumericDimension(svg.getAttribute("height"));
    if (width && height) {
      return width / height;
    }

    return DEFAULT_PREVIEW_ASPECT_RATIO;
  } catch {
    return DEFAULT_PREVIEW_ASPECT_RATIO;
  }
}

function getBaseFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export default function AutoDrawTestPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [lineAliveDetail, setLineAliveDetail] = useState("");
  const [lineAliveLoading, setLineAliveLoading] = useState(false);
  const [lineAliveError, setLineAliveError] = useState<string | null>(null);
  const [lineAliveDemoHtml, setLineAliveDemoHtml] = useState<string>("");
  const [previewAspectRatio, setPreviewAspectRatio] = useState<number>(DEFAULT_PREVIEW_ASPECT_RATIO);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [downloadBaseName, setDownloadBaseName] = useState("linealive_result");
  const [lastRequestMs, setLastRequestMs] = useState<number | null>(null);

  const canGenerate = useMemo(() => !lineAliveLoading && !!imageFile, [lineAliveLoading, imageFile]);
  const canUsePreview = useMemo(() => !!lineAliveDemoHtml, [lineAliveDemoHtml]);

  const onGenerateLineAlive = async () => {
    if (!imageFile) {
      setLineAliveError("Selecciona una imagen antes de generar.");
      return;
    }

    setLineAliveLoading(true);
    setLineAliveError(null);
    setLastRequestMs(null);

    try {
      const startedAt = performance.now();
      const body = new FormData();
      body.append("image", imageFile, imageFile.name);
      if (lineAliveDetail.trim()) {
        body.append("detail", lineAliveDetail.trim());
      }

      const response = await fetch("/api/generate-animation", {
        method: "POST",
        body,
      });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.message || "Error al generar animacion con LineAlive.");
      }

      const demoHtml = typeof json.animation_html === "string"
        ? json.animation_html.trim()
        : typeof json.demo_html === "string"
          ? json.demo_html.trim()
          : "";
      if (!demoHtml) {
        throw new Error("LineAlive respondio sin animation_html. Revisa la integracion del servicio.");
      }

      setLineAliveDemoHtml(demoHtml);
      setPreviewAspectRatio(detectDemoHtmlAspectRatio(demoHtml));
      setPreviewReloadKey((current) => current + 1);
      setDownloadBaseName(getBaseFileName(imageFile.name));
      setLastRequestMs(Math.round(performance.now() - startedAt));
    } catch (error) {
      setLineAliveError(error instanceof Error ? error.message : "Error desconocido.");
    } finally {
      setLineAliveLoading(false);
    }
  };

  const onReplayPreview = () => {
    setPreviewReloadKey((current) => current + 1);
  };

  const onDownloadPreview = () => {
    if (!lineAliveDemoHtml) return;
    const blob = new Blob([lineAliveDemoHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${downloadBaseName}_LA.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="section-title text-left">AutoDraw + LineAlive Playground</h1>
      <p className="mb-6 text-sm text-[var(--brown-mid)]">
        Prueba de concepto para generar animaciones SVG con LineAlive y visualizar el resultado final (demo_html) en un iframe.
      </p>

      <section className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <aside className="card-wedding space-y-5">
          <div className="rounded-xl border border-[#dfd7cd] bg-[#fffaf3] p-3 space-y-3">
            <p className="text-xs text-[var(--brown-mid)]">
              Sube una imagen (png/jpg/webp), genera la animacion y visualiza el HTML autosuficiente devuelto por LineAlive.
            </p>
            <div>
              <label className="label-field">Imagen para LineAlive</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="input-field"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <label className="label-field">detail (opcional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="high | medium | low"
                value={lineAliveDetail}
                onChange={(event) => setLineAliveDetail(event.target.value)}
              />
            </div>
            <button type="button" className="btn-primary" onClick={onGenerateLineAlive} disabled={!canGenerate}>
              {lineAliveLoading ? "Generando..." : "Generar con LineAlive"}
            </button>
            {lastRequestMs !== null && <p className="text-xs text-[var(--brown-mid)]">Tiempo de generacion: {lastRequestMs} ms</p>}
            {lineAliveError && <p className="text-xs text-red-700">{lineAliveError}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={onReplayPreview} disabled={!canUsePreview}>
              Reproducir de nuevo
            </button>
            <button type="button" className="btn-primary" onClick={onDownloadPreview} disabled={!canUsePreview}>
              Descargar HTML
            </button>
          </div>

          <p className="text-xs text-[var(--brown-mid)]">
            El archivo se descarga como <strong>{downloadBaseName}_LA.html</strong>.
          </p>
        </aside>

        <article className="card-wedding min-h-[420px]">
          <div className="rounded-2xl border border-[#e4ddd4] bg-[#fffdfa] p-4">
            <h2 className="label-field mb-2">Preview demo_html de LineAlive</h2>
            {lineAliveLoading ? (
              <div className="flex h-[420px] items-center justify-center rounded-xl border border-[#ddd5cb] bg-[#f7f3ee]">
                <p className="text-sm text-[var(--brown-mid)]">Generando preview...</p>
              </div>
            ) : lineAliveDemoHtml ? (
              <div
                className="mx-auto w-full max-w-[980px] overflow-hidden rounded-xl border border-[#ddd5cb] bg-white"
                style={{ aspectRatio: `${previewAspectRatio}` }}
              >
                <iframe
                  key={previewReloadKey}
                  title="LineAlive Demo HTML"
                  srcDoc={lineAliveDemoHtml}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-xl border border-[#ddd5cb] bg-[#f7f3ee]">
                <p className="text-sm text-[var(--brown-mid)]">Aun no hay demo_html generado.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
