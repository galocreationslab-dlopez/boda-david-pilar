"use client";

import { ChangeEvent, useMemo, useState } from "react";
import AutoDrawSVG, { useAutoDrawControls } from "@/components/motion/AutoDrawSVG";

const SVG_EJEMPLO = `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Demo autodraw">
  <rect x="20" y="20" width="600" height="320" rx="16" fill="none" stroke="#4a3728" stroke-width="3" />
  <g data-grupo="sol">
    <circle cx="500" cy="95" r="36" fill="none" stroke="#8c6b3f" stroke-width="4" />
    <line x1="500" y1="40" x2="500" y2="18" stroke="#8c6b3f" stroke-width="3" />
    <line x1="500" y1="172" x2="500" y2="150" stroke="#8c6b3f" stroke-width="3" />
    <line x1="445" y1="95" x2="423" y2="95" stroke="#8c6b3f" stroke-width="3" />
    <line x1="577" y1="95" x2="555" y2="95" stroke="#8c6b3f" stroke-width="3" />
  </g>
  <path d="M90 255 C 170 170, 270 310, 360 225" fill="none" stroke="#6b7a4f" stroke-width="6" stroke-linecap="round" />
  <path d="M360 225 C 420 170, 470 250, 530 210" fill="none" stroke="#6b7a4f" stroke-width="6" stroke-linecap="round" />
  <polygon points="86,268 192,268 139,316" fill="#8c6b3f" />
  <text x="68" y="92" font-size="42" fill="#4a3728" font-family="serif">P & D</text>
</svg>`;

export default function AutoDrawTestPage() {
  const controls = useAutoDrawControls();
  const [svgSource, setSvgSource] = useState<string>(SVG_EJEMPLO);
  const [sequential, setSequential] = useState(true);
  const [staggerMs, setStaggerMs] = useState(80);
  const [durationMs, setDurationMs] = useState(900);
  const [strokeColorOverride, setStrokeColorOverride] = useState("#8c6b3f");
  const [usarOverride, setUsarOverride] = useState(false);

  const sourceMode = useMemo(() => (svgSource.trim().startsWith("<") ? "inline" : "url"), [svgSource]);

  const onUploadSvg = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (value.trim()) {
        setSvgSource(value);
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="section-title text-left">AutoDrawSVG Playground</h1>
      <p className="mb-6 text-sm text-[var(--brown-mid)]">
        Laboratorio de desarrollo para validar autodibujado en SVGs reales antes de integrar en portada, historia, timeline o galeria.
      </p>

      <section className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <aside className="card-wedding space-y-5">
          <div>
            <label className="label-field">Subir SVG desde archivo</label>
            <input type="file" accept=".svg,image/svg+xml" onChange={onUploadSvg} className="input-field" />
          </div>

          <div>
            <label className="label-field">O usar URL de /public (ejemplo: /images/mi-ilustracion.svg)</label>
            <input
              type="text"
              className="input-field"
              placeholder="/images/mi-ilustracion.svg"
              onChange={(event) => {
                const value = event.target.value.trim();
                if (value.length > 0) {
                  setSvgSource(value);
                }
              }}
            />
          </div>

          <div>
            <label className="label-field">Secuencial</label>
            <input
              type="checkbox"
              checked={sequential}
              onChange={(event) => setSequential(event.target.checked)}
              className="h-4 w-4"
            />
          </div>

          <div>
            <label className="label-field">staggerMs: {staggerMs}</label>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={staggerMs}
              onChange={(event) => setStaggerMs(Number(event.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="label-field">durationMs: {durationMs}</label>
            <input
              type="range"
              min={150}
              max={2500}
              step={50}
              value={durationMs}
              onChange={(event) => setDurationMs(Number(event.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="label-field">Forzar color de stroke</label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={usarOverride}
                onChange={(event) => setUsarOverride(event.target.checked)}
                className="h-4 w-4"
              />
              <input
                type="color"
                value={strokeColorOverride}
                onChange={(event) => setStrokeColorOverride(event.target.value)}
                className="h-9 w-14 rounded border border-[#d4cfc9]"
              />
              <span className="text-xs text-[var(--brown-mid)]">{strokeColorOverride}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={controls.restart}>
              Repetir
            </button>
            <button type="button" className="btn-secondary" onClick={controls.pause}>
              Pausar
            </button>
            <button type="button" className="btn-primary" onClick={controls.play}>
              Reanudar
            </button>
          </div>

          <p className="text-xs text-[var(--brown-mid)]">Modo de entrada actual: {sourceMode}</p>
        </aside>

        <article className="card-wedding min-h-[420px]">
          <div className="rounded-2xl border border-[#e4ddd4] bg-[#fffdfa] p-4">
            <AutoDrawSVG
              ref={controls.autoDrawRef}
              svgSource={svgSource}
              sequential={sequential}
              staggerMs={staggerMs}
              durationMs={durationMs}
              strokeColorOverride={usarOverride ? strokeColorOverride : undefined}
              respectReducedMotion
            />
          </div>
        </article>
      </section>
    </main>
  );
}
