"use client";

import { ChangeEvent, useState } from "react";
import RevealBook from "@/components/motion/RevealBook";

const SVG_PANEL_IZQ = "/images/Vidriera_Catedral.svg";
const SVG_PANEL_DER = "/images/Ventana_Alhambra.svg";

export default function RevealBookTestPage() {
  const [leftSource, setLeftSource] = useState(SVG_PANEL_IZQ);
  const [rightSource, setRightSource] = useState(SVG_PANEL_DER);
  const [duracion, setDuracion] = useState(1400);
  const [colorMarco, setColorMarco] = useState("#d8cec0");
  const [tintColor, setTintColor] = useState("#6b7a4f");

  const onUpload = (side: "left" | "right") => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      if (!content.trim()) return;
      if (side === "left") {
        setLeftSource(content);
      } else {
        setRightSource(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="section-title text-left">RevealBook Playground</h1>
      <p className="mb-6 text-sm text-[var(--brown-mid)]">
        Prueba de apertura tipo libro reutilizable para cualquier contenido: portada, historia, timeline, galeria o cualquier otro bloque inyectado por children.
      </p>

      <section className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <aside className="card-wedding space-y-5">
          <div className="rounded-xl border border-[#dfd7cd] bg-[#fffaf3] p-3">
            <p className="text-xs text-[var(--brown-mid)]">
              Carga inicial automatica con tus SVG reales:
              <br />
              <strong>Vidriera_Catedral.svg</strong> y <strong>Ventana_Alhambra.svg</strong>.
            </p>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() => {
                setLeftSource(SVG_PANEL_IZQ);
                setRightSource(SVG_PANEL_DER);
              }}
            >
              Restaurar SVGs reales
            </button>
          </div>

          <div>
            <label className="label-field">Panel izquierdo (archivo SVG)</label>
            <input type="file" accept=".svg,image/svg+xml" className="input-field" onChange={onUpload("left")} />
          </div>

          <div>
            <label className="label-field">Panel derecho (archivo SVG)</label>
            <input type="file" accept=".svg,image/svg+xml" className="input-field" onChange={onUpload("right")} />
          </div>

          <div>
            <label className="label-field">Duracion apertura (ms): {duracion}</label>
            <input
              type="range"
              min={500}
              max={2800}
              step={50}
              className="w-full"
              value={duracion}
              onChange={(event) => setDuracion(Number(event.target.value))}
            />
          </div>

          <div className="space-y-2">
            <label className="label-field">Color marco</label>
            <input
              type="color"
              className="h-9 w-14 rounded border border-[#d4cfc9]"
              value={colorMarco}
              onChange={(event) => setColorMarco(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="label-field">Tint de paneles (currentColor)</label>
            <input
              type="color"
              className="h-9 w-14 rounded border border-[#d4cfc9]"
              value={tintColor}
              onChange={(event) => setTintColor(event.target.value)}
            />
          </div>
        </aside>

        <article className="card-wedding min-h-[480px]">
          <RevealBook
            panelIzquierdo={{ svgSource: leftSource, alt: "Panel izquierdo" }}
            panelDerecho={{ svgSource: rightSource, alt: "Panel derecho" }}
            duracionAperturaMs={duracion}
            colorMarco={colorMarco}
            tintColor={tintColor}
          >
            <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),rgba(241,234,224,0.9))] p-6 sm:min-h-[430px]">
              <div className="max-w-xl rounded-3xl border border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.85)] p-6 text-center shadow-[0_18px_45px_rgba(0,0,0,0.08)] sm:p-8">
                <h2 className="font-display text-3xl text-[var(--brown-dark)] sm:text-4xl">Contenido Revelado</h2>
                <p className="mt-3 text-sm text-[var(--brown-mid)] sm:text-base">
                  Este bloque de ejemplo es intencionalmente neutro: el componente RevealBook no asume tema ni tipo de seccion.
                </p>
              </div>
            </div>
          </RevealBook>
        </article>
      </section>
    </main>
  );
}
