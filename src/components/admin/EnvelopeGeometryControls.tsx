"use client";

import { normalizeIntroEnvelopeConfig, type IntroEnvelopeConfig } from "@/config/wedding.config";
import { useId } from "react";

export default function EnvelopeGeometryControls({ value, onChange }: {
  value: IntroEnvelopeConfig;
  onChange: (patch: Partial<IntroEnvelopeConfig>) => void;
}) {
  const config = normalizeIntroEnvelopeConfig(value);
  const modeId = useId();
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={modeId} className="label-field">Geometría y relieve del papel</label>
        <select id={modeId} className="input-field" value={config.geometriaSobre} onChange={(e) => {
          if (e.target.value === "papel" || e.target.value === "clasica") onChange({ geometriaSobre: e.target.value });
        }}>
          <option value="papel">Papel plegado con solapa inferior</option>
          <option value="clasica">Compatible: aspecto anterior</option>
        </select>
      </div>
      {config.geometriaSobre === "papel" ? <>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="label-field">Altura inferior (% del alto del sobre)</span>
            <input type="number" min={5} max={95} step={1} className="input-field" value={config.alturaSolapaInferiorPorcentaje}
              onChange={(e) => onChange({ alturaSolapaInferiorPorcentaje: Number(e.target.value) })} />
          </label>
          <label>
            <span className="label-field">Extremo plano (% del ancho del sobre)</span>
            <input type="number" min={0} max={80} step={1} className="input-field" value={config.anchoPlanoSolapaInferiorPorcentaje}
              onChange={(e) => onChange({ anchoPlanoSolapaInferiorPorcentaje: Number(e.target.value) })} />
          </label>
          <label>
            <span className="label-field">Redondeo inferior (% de los lados)</span>
            <input type="number" min={0} max={50} step={1} className="input-field" value={config.redondeoSolapaInferiorPorcentaje}
              onChange={(e) => onChange({ redondeoSolapaInferiorPorcentaje: Number(e.target.value) })} />
          </label>
        </div>
        <p className="text-xs text-stone-500">
          Altura medida desde abajo. Extremo 0%: pico; redondeo 0%: ángulos vivos; 50%: curva amplia.
          Las costuras inferiores quedan detrás de la solapa superior. El relieve reutiliza la luz, el color y la intensidad de grosor existentes.
        </p>
      </> : null}
    </div>
  );
}
