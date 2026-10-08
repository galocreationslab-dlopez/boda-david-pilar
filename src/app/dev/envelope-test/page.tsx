"use client";

import { useState } from "react";
import EnvelopeOpenReveal from "@/components/motion/EnvelopeOpenReveal";
import IntroReveal from "@/components/motion/IntroReveal";
import EnvelopeTimelineControls from "@/components/admin/EnvelopeTimelineControls";
import type { IntroEnvelopeAjusteAspecto, IntroEnvelopeAspectoModo, IntroEnvelopeConfig, IntroEnvelopeDescensoModo, IntroEnvelopeModoFondo } from "@/config/wedding.config";

const DEFAULT_CONFIG: IntroEnvelopeConfig = {
  modoFondo: "colores",
  colorBase: "#e8ddc7",
  colorTrasera: "#e0d2ab",
  radioEsquinasPorcentaje: 2,
  colorSolapaInterior: "#c9b48c",
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
  const [triggerTimeMs, setTriggerTimeMs] = useState<number>();
  const [runId, setRunId] = useState(0);
  const [integration, setIntegration] = useState(false);
  const [lacreUrl, setLacreUrl] = useState("/images/Sello.jpg");
  const [textureUrl, setTextureUrl] = useState("");
  const [completions, setCompletions] = useState(0);
  const texture = textureUrl ? { url: textureUrl, sizePx: 256, color: config.colorBase ?? "#e8ddc7" } : undefined;
  const content = (
    <div data-envelope-test-cover className="wedding-fixed fixed inset-y-0 flex items-center justify-center bg-[#f1eae0] p-6">
      <div className="max-w-xl rounded-3xl border border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.85)] p-6 text-center shadow-[0_18px_45px_rgba(0,0,0,0.08)] sm:p-8">
        <h2 className="font-display text-3xl text-[var(--brown-dark)] sm:text-4xl">Portada revelada</h2>
        <p className="mt-3 text-sm text-[var(--brown-mid)] sm:text-base">Este bloque simula la portada real que aparece tras la apertura del sobre.</p>
      </div>
    </div>
  );

  const patch = (p: Partial<IntroEnvelopeConfig>) => setConfig((prev) => ({ ...prev, ...p }));

  const replay = () => {
    setSealBroken(false);
    setTriggerTimeMs(undefined);
    setCompletions(0);
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
        <aside className="card-wedding relative z-[200] space-y-4">
          <button type="button" className="btn-secondary w-full" onClick={replay}>
            Reiniciar animación
          </button>
          <p role="status">Finalizaciones: {completions}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={integration} onChange={(e) => { setIntegration(e.target.checked); replay(); }} />
            Probar IntroReveal (scroll y persistencia)
          </label>
          <div>
            <label htmlFor="test-lacre-url" className="label-field">URL del lacre (IntroReveal)</label>
            <input id="test-lacre-url" className="input-field" value={lacreUrl} onChange={(e) => setLacreUrl(e.target.value)} />
          </div>
          {config.modoSalidaSobre !== "fadeProgramado" ? <>
          <label className="flex items-center gap-2 text-sm">
            <input id="envelope-seal-fade" type="checkbox" checked={config.lacreFadeDuranteApertura ?? false}
              onChange={(e) => patch({ lacreFadeDuranteApertura: e.target.checked })} />
            Desvanecer lacre durante apertura
          </label>
          <div>
            <label htmlFor="envelope-seal-fade-duration" className="label-field">Duración fade lacre (ms)</label>
            <input id="envelope-seal-fade-duration" type="number" min={0} step={50} className="input-field"
              disabled={!config.lacreFadeDuranteApertura} value={config.duracionFadeLacreMs ?? 900}
              onChange={(e) => patch({ duracionFadeLacreMs: Number(e.target.value) })} />
          </div>
          </> : null}
          <div>
            <label htmlFor="test-texture-url" className="label-field">URL textura de papel</label>
            <input id="test-texture-url" className="input-field" value={textureUrl} onChange={(e) => setTextureUrl(e.target.value)} />
          </div>
          <div>
            <label htmlFor="envelope-exit" className="label-field">Modo de salida</label>
            <select id="envelope-exit" className="input-field" value={config.modoSalidaSobre ?? "descensoZoom"}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "fadeApertura" || value === "descensoZoom" || value === "fadeProgramado") patch({ modoSalidaSobre: value });
              }}>
              <option value="descensoZoom">Descenso y zoom</option>
              <option value="fadeApertura">Fade durante apertura</option>
              <option value="fadeProgramado">Desvanecimiento con línea temporal</option>
            </select>
          </div>
          {config.modoSalidaSobre === "fadeProgramado" ? <EnvelopeTimelineControls value={config.lineaTemporal}
            onChange={(lineaTemporal) => patch({ lineaTemporal })} /> : null}
          <div>
            <label htmlFor="envelope-angle" className="label-field">Ángulo máximo (grados)</label>
            <input id="envelope-angle" type="number" min={1} max={180} className="input-field" value={config.anguloMaximoAperturaGrados ?? 180} onChange={(e) => patch({ anguloMaximoAperturaGrados: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="envelope-light" className="label-field">Origen de luz (grados)</label>
            <input id="envelope-light" type="number" min={0} max={360} className="input-field" value={config.direccionLuzGrados ?? 225} onChange={(e) => patch({ direccionLuzGrados: Number(e.target.value) })} />
            <p className="text-xs">0° derecha; 90° arriba; 180° izquierda; 270° abajo. La sombra va al lado opuesto.</p>
          </div>
          <div>
            <label htmlFor="envelope-softness" className="label-field">Suavidad de sombras (% vmin)</label>
            <input id="envelope-softness" type="number" min={0} step={0.1} className="input-field" value={config.sombraDesenfoquePorcentaje ?? 3} onChange={(e) => patch({ sombraDesenfoquePorcentaje: Number(e.target.value) })} />
          </div>

          <div>
            <label htmlFor="dry-stamp-url" className="label-field">Sello seco (PNG, JPG o SVG animado)</label>
            <input id="dry-stamp-url" className="input-field" value={config.selloSecoUrl ?? ""} onChange={(e) => patch({ selloSecoUrl: e.target.value })} placeholder="/images/sello.svg" />
          </div>
          <div>
            <label htmlFor="dry-stamp-size" className="label-field">Ancho sello seco (% sobre)</label>
            <input id="dry-stamp-size" type="number" min={5} max={40} className="input-field" value={config.selloSecoTamanoPorcentaje ?? 18} onChange={(e) => patch({ selloSecoTamanoPorcentaje: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="dry-stamp-blend" className="label-field">Mezcla del sello seco PNG/JPG</label>
            <select id="dry-stamp-blend" className="input-field" value={config.selloSecoMezclaImagen ?? "overlay"}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "overlay" || value === "soft-light" || value === "hard-light" || value === "normal") patch({ selloSecoMezclaImagen: value });
              }}>
              <option value="overlay">Overlay</option>
              <option value="soft-light">Soft light</option>
              <option value="hard-light">Hard light</option>
              <option value="normal">Sin mezcla</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input id="dry-stamp-svg-relief" type="checkbox" checked={config.selloSecoRelieveSvg ?? false} onChange={(e) => patch({ selloSecoRelieveSvg: e.target.checked })} />
            Simular relieve del SVG con luz y sombra
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="dry-stamp-x" className="label-field">Centro X (% solapa)</label>
              <input id="dry-stamp-x" type="number" min={0} max={100} className="input-field" value={config.selloSecoXPorcentaje ?? 50} onChange={(e) => patch({ selloSecoXPorcentaje: Number(e.target.value) })} />
            </div>
            <div>
              <label htmlFor="dry-stamp-y" className="label-field">Centro Y (% solapa)</label>
              <input id="dry-stamp-y" type="number" min={0} max={100} className="input-field" value={config.selloSecoYPorcentaje ?? 35} onChange={(e) => patch({ selloSecoYPorcentaje: Number(e.target.value) })} />
            </div>
          </div>

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
              <label htmlFor="envelope-shadow-color" className="label-field">Color sombra apertura</label>
              <input id="envelope-shadow-color" className="input-field" value={config.colorSombraApertura} onChange={(e) => patch({ colorSombraApertura: e.target.value })} />
            </div>
            <div>
              <label htmlFor="envelope-shadow-intensity" className="label-field">Intensidad sombra (%)</label>
              <input id="envelope-shadow-intensity" type="number" min={0} max={100} className="input-field" value={config.intensidadSombraAperturaPorcentaje} onChange={(e) => patch({ intensidadSombraAperturaPorcentaje: Number(e.target.value) })} />
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

          {config.modoSalidaSobre !== "fadeProgramado" ? <>
          <div>
            <label className="label-field">Al descender, el sobre...</label>
            <select
              className="input-field"
              value={config.modoDescensoSobre}
              disabled={config.modoSalidaSobre === "fadeApertura"}
              onChange={(e) => patch({ modoDescensoSobre: e.target.value as IntroEnvelopeDescensoModo })}
            >
              <option value="desplazamiento">Solo se desplaza</option>
              <option value="fade">Solo se desvanece</option>
              <option value="ambos">Ambos a la vez</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="envelope-duration" className="label-field">Apertura (ms)</label>
              <input id="envelope-duration" type="number" min={300} max={5000} className="input-field" value={config.duracionAperturaMs} onChange={(e) => patch({ duracionAperturaMs: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-field">Descenso (ms)</label>
              <input type="number" className="input-field" disabled={config.modoSalidaSobre === "fadeApertura"} value={config.duracionDescensoMs} onChange={(e) => patch({ duracionDescensoMs: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-field">Zoom (ms)</label>
              <input type="number" className="input-field" disabled={config.modoSalidaSobre === "fadeApertura"} value={config.duracionZoomMs} onChange={(e) => patch({ duracionZoomMs: Number(e.target.value) })} />
            </div>
          </div>
          </> : null}
        </aside>

        <article className="card-wedding relative flex h-[100svh] items-center justify-center p-6 text-center text-sm text-[var(--brown-mid)]">
          El sobre se renderiza a pantalla completa (fixed inset-0), superpuesto a toda esta página.
          {integration ? (
            <IntroReveal key={runId} storageKey="envelope-playground" envelopeTexture={texture}
              config={{ activo: true, repetir: "siempre", lacreUrl, pc: { tipo: "envelope", envelope: config }, movil: { tipo: "envelope", envelope: config } }}>
              {content}
            </IntroReveal>
          ) : <EnvelopeOpenReveal
            key={runId}
            config={config}
            texture={texture}
            fondo="#2E1F0E"
            sealBroken={sealBroken}
            triggerTimeMs={triggerTimeMs}
            sealSlot={
                <button
                  type="button"
                  onClick={() => {
                    if (sealBroken) return;
                    const time = document.timeline.currentTime;
                    setTriggerTimeMs(typeof time === "number" ? time : performance.now());
                    setSealBroken(true);
                  }}
                  className="flex h-full w-full items-center justify-center rounded-full bg-[#C4964A] text-xs font-semibold uppercase tracking-wide text-white shadow-md"
                >
                  Abrir
                </button>
            }
            onComplete={() => setCompletions((count) => count + 1)}
          >
            {content}
          </EnvelopeOpenReveal>}
        </article>
      </section>
    </main>
  );
}
