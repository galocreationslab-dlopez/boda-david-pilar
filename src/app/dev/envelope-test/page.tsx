"use client";

import { useState } from "react";
import EnvelopeOpenReveal from "@/components/motion/EnvelopeOpenReveal";
import type { IntroEnvelopeAjusteAspecto, IntroEnvelopeAspectoModo, IntroEnvelopeConfig, IntroEnvelopeDescensoModo, IntroEnvelopeModoFondo } from "@/config/wedding.config";

const DEFAULT_CONFIG: IntroEnvelopeConfig = {
  modoFondo: "colores",
  colorBase: "#e8ddc7",
  colorTrasera: "#e0d2ab",
  colorBorde: "#a9895f",
  grosorBordePorcentaje: 0.6,
  radioEsquinasPorcentaje: 2,
  colorSolapaInterior: "#c9b48c",
  colorCostura: "#8a6a44",
  sombraColor: "rgba(0,0,0,0.35)",
  sombraDesenfoquePorcentaje: 3,
  alturaSolapaPorcentaje: 42,
  radioPicoSolapaPorcentaje: 10,
  margenPantallaPorcentaje: 6,
  margenContenidoPorcentaje: 4,
  modoAspectoSobre: "automatico",
  ajusteAspectoSobre: "ancho",
  aspectoAnchoSobre: 3,
  aspectoAltoSobre: 2,
  colorSombraApertura: "rgba(0,0,0,0.55)",
  intensidadSombraAperturaPorcentaje: 45,
  colorGrosorPapel: "rgba(0,0,0,0.4)",
  intensidadGrosorPapelPorcentaje: 35,
  fondoExteriorColor: "#2E1F0E",
  modoDescensoSobre: "desplazamiento",
  duracionAperturaMs: 900,
  duracionDescensoMs: 700,
  duracionZoomMs: 900,
};

export default function EnvelopeTestPage() {
  const [config, setConfig] = useState<IntroEnvelopeConfig>(DEFAULT_CONFIG);
  const [sealBroken, setSealBroken] = useState(false);
  const [runId, setRunId] = useState(0);

  const patch = (p: Partial<IntroEnvelopeConfig>) => setConfig((prev) => ({ ...prev, ...p }));

  const replay = () => {
    setSealBroken(false);
    setRunId((id) => id + 1);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="section-title text-left">Envelope Opening Playground</h1>
      <p className="mb-6 text-sm text-[var(--brown-mid)]">
        Prueba aislada de la animación de apertura de sobre. Pulsa el lacre para romperlo y observa cómo se abre la solapa
        y la portada sale del sobre. El sobre ocupa siempre la ventana real (fixed), por eso este panel queda por encima.
      </p>

      <section className="relative z-50 grid gap-6 lg:grid-cols-[340px,1fr]">
        <aside className="card-wedding space-y-4">
          <button type="button" className="btn-secondary w-full" onClick={replay}>
            Reiniciar animación
          </button>

          <div>
            <label className="label-field">Acabado</label>
            <select
              className="input-field"
              value={config.modoFondo}
              onChange={(e) => patch({ modoFondo: e.target.value as IntroEnvelopeModoFondo })}
            >
              <option value="colores">Solo colores</option>
              <option value="textura">Textura</option>
              <option value="svgPersonalizado">Imagen propia</option>
            </select>
          </div>

          {config.modoFondo !== "colores" && (
            <div>
              <label className="label-field">URL de imagen</label>
              <input className="input-field" value={config.imagenUrl ?? ""} onChange={(e) => patch({ imagenUrl: e.target.value })} placeholder="/images/archivo.jpg" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Color frontal</label>
              <input type="color" className="input-field h-10 w-full" value={config.colorBase} onChange={(e) => patch({ colorBase: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Color trasera/solapa</label>
              <input type="color" className="input-field h-10 w-full" value={config.colorTrasera} onChange={(e) => patch({ colorTrasera: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Interior solapa</label>
              <input type="color" className="input-field h-10 w-full" value={config.colorSolapaInterior} onChange={(e) => patch({ colorSolapaInterior: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Color borde</label>
              <input type="color" className="input-field h-10 w-full" value={config.colorBorde} onChange={(e) => patch({ colorBorde: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Grosor borde (% pantalla)</label>
              <input type="number" step={0.1} className="input-field" value={config.grosorBordePorcentaje} onChange={(e) => patch({ grosorBordePorcentaje: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <label className="label-field">Radio esquinas (% pantalla)</label>
            <input type="number" step={0.5} className="input-field" value={config.radioEsquinasPorcentaje} onChange={(e) => patch({ radioEsquinasPorcentaje: Number(e.target.value) })} />
          </div>

          <div>
            <label className="label-field">Altura solapa (%): {config.alturaSolapaPorcentaje}</label>
            <input type="range" min={20} max={70} className="w-full" value={config.alturaSolapaPorcentaje} onChange={(e) => patch({ alturaSolapaPorcentaje: Number(e.target.value) })} />
          </div>

          <div>
            <label className="label-field">Redondeo del pico (%): {config.radioPicoSolapaPorcentaje}</label>
            <input type="range" min={0} max={50} className="w-full" value={config.radioPicoSolapaPorcentaje} onChange={(e) => patch({ radioPicoSolapaPorcentaje: Number(e.target.value) })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Margen sobre/pantalla (%)</label>
              <input type="number" className="input-field" value={config.margenPantallaPorcentaje} onChange={(e) => patch({ margenPantallaPorcentaje: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-field">Margen portada/sobre (%)</label>
              <input type="number" className="input-field" value={config.margenContenidoPorcentaje} onChange={(e) => patch({ margenContenidoPorcentaje: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <label className="label-field">Relación de aspecto</label>
            <select
              className="input-field"
              value={config.modoAspectoSobre}
              onChange={(e) => patch({ modoAspectoSobre: e.target.value as IntroEnvelopeAspectoModo })}
            >
              <option value="automatico">Automática</option>
              <option value="fijo">Fija</option>
            </select>
          </div>

          {config.modoAspectoSobre === "fijo" && (
            <>
              <div>
                <label className="label-field">Ajustar exactamente a...</label>
                <select
                  className="input-field"
                  value={config.ajusteAspectoSobre}
                  onChange={(e) => patch({ ajusteAspectoSobre: e.target.value as IntroEnvelopeAjusteAspecto })}
                >
                  <option value="ancho">Ancho (puede sobresalir arriba/abajo)</option>
                  <option value="alto">Alto (puede sobresalir a los lados)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Ancho relación</label>
                  <input type="number" step={0.1} className="input-field" value={config.aspectoAnchoSobre} onChange={(e) => patch({ aspectoAnchoSobre: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label-field">Alto relación</label>
                  <input type="number" step={0.1} className="input-field" value={config.aspectoAltoSobre} onChange={(e) => patch({ aspectoAltoSobre: Number(e.target.value) })} />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Color sombra apertura</label>
              <input className="input-field" value={config.colorSombraApertura} onChange={(e) => patch({ colorSombraApertura: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Intensidad sombra (%)</label>
              <input type="number" className="input-field" value={config.intensidadSombraAperturaPorcentaje} onChange={(e) => patch({ intensidadSombraAperturaPorcentaje: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Color grosor papel</label>
              <input className="input-field" value={config.colorGrosorPapel} onChange={(e) => patch({ colorGrosorPapel: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Intensidad grosor (%)</label>
              <input type="number" className="input-field" value={config.intensidadGrosorPapelPorcentaje} onChange={(e) => patch({ intensidadGrosorPapelPorcentaje: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <label className="label-field">Color fondo exterior (mesa)</label>
            <input type="color" className="input-field h-10 w-full" value={config.fondoExteriorColor} onChange={(e) => patch({ fondoExteriorColor: e.target.value })} />
          </div>

          <div>
            <label className="label-field">Al descender, el sobre...</label>
            <select
              className="input-field"
              value={config.modoDescensoSobre}
              onChange={(e) => patch({ modoDescensoSobre: e.target.value as IntroEnvelopeDescensoModo })}
            >
              <option value="desplazamiento">Solo se desplaza</option>
              <option value="fade">Solo se desvanece</option>
              <option value="ambos">Ambos a la vez</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Apertura (ms)</label>
              <input type="number" className="input-field" value={config.duracionAperturaMs} onChange={(e) => patch({ duracionAperturaMs: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-field">Descenso (ms)</label>
              <input type="number" className="input-field" value={config.duracionDescensoMs} onChange={(e) => patch({ duracionDescensoMs: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-field">Zoom (ms)</label>
              <input type="number" className="input-field" value={config.duracionZoomMs} onChange={(e) => patch({ duracionZoomMs: Number(e.target.value) })} />
            </div>
          </div>
        </aside>

        <article className="card-wedding relative flex h-40 items-center justify-center p-6 text-center text-sm text-[var(--brown-mid)]">
          El sobre se renderiza a pantalla completa (fixed inset-0), superpuesto a toda esta página.
          <EnvelopeOpenReveal
            key={runId}
            config={config}
            fondo="#2E1F0E"
            sealBroken={sealBroken}
            sealSlot={
              !sealBroken ? (
                <button
                  type="button"
                  onClick={() => setSealBroken(true)}
                  className="flex h-full w-full items-center justify-center rounded-full bg-[#C4964A] text-xs font-semibold uppercase tracking-wide text-white shadow-md"
                >
                  Abrir
                </button>
              ) : null
            }
            onComplete={() => console.log("envelope intro complete")}
          >
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),rgba(241,234,224,0.9))] p-6">
              <div className="max-w-xl rounded-3xl border border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.85)] p-6 text-center shadow-[0_18px_45px_rgba(0,0,0,0.08)] sm:p-8">
                <h2 className="font-display text-3xl text-[var(--brown-dark)] sm:text-4xl">Portada revelada</h2>
                <p className="mt-3 text-sm text-[var(--brown-mid)] sm:text-base">
                  Este bloque simula la portada real que aparece tras la apertura del sobre.
                </p>
              </div>
            </div>
          </EnvelopeOpenReveal>
        </article>
      </section>
    </main>
  );
}
