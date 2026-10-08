"use client";

import { useId } from "react";
import { normalizeEnvelopeTimeline, type IntroEnvelopeTimelineConfig } from "@/config/wedding.config";

const EVENTS: { label: string; start: keyof IntroEnvelopeTimelineConfig; duration: keyof IntroEnvelopeTimelineConfig }[] = [
  { label: "Desvanecimiento del lacre", start: "inicioFadeLacreMs", duration: "duracionFadeLacreMs" },
  { label: "Apertura de la solapa", start: "inicioAperturaMs", duration: "duracionAperturaMs" },
  { label: "Desvanecimiento total del sobre", start: "inicioFadeSobreMs", duration: "duracionFadeSobreMs" },
  { label: "Zoom de la web", start: "inicioZoomMs", duration: "duracionZoomMs" },
];

export default function EnvelopeTimelineControls({ value, onChange }: {
  value?: Partial<IntroEnvelopeTimelineConfig>;
  onChange: (value: IntroEnvelopeTimelineConfig) => void;
}) {
  const id = useId();
  const timeline = normalizeEnvelopeTimeline(value);
  return (
    <fieldset className="space-y-3">
      <legend className="label-field">Línea temporal desde el clic</legend>
      <p className="text-xs text-stone-500">
        El clic sobre el lacre es el instante 0. Los efectos pueden solaparse: no esperan a que termine el anterior.
        El sobre completo, incluida la solapa y el sello seco, se desvanece sin descenso.
        El zoom solo se aplica si la web aún no está a su tamaño y posición definitivos.
      </p>
      {EVENTS.map(({ label, start, duration }) => (
        <div key={start} className="rounded-lg border border-stone-200 p-3">
          <p className="mb-2 text-sm font-medium">{label}</p>
          <div className="grid grid-cols-2 gap-3">
            {([start, duration] as const).map((key, index) => (
              <div key={key}>
                <label htmlFor={`${id}-${key}`} className="label-field">{index === 0 ? "Inicio desde el clic (ms)" : "Duración (ms)"}</label>
                <input id={`${id}-${key}`} data-envelope-timing={key} type="number" min={0} step={50}
                  className="input-field" value={timeline[key]}
                  onChange={(event) => onChange(normalizeEnvelopeTimeline({ ...timeline, [key]: Number(event.target.value) }))} />
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500">Finaliza a los {timeline[start] + timeline[duration]} ms del clic.</p>
        </div>
      ))}
      <p className="text-xs text-stone-500">Duración 0: cambio instantáneo en el inicio indicado. Con movimiento reducido se omite toda la secuencia.</p>
    </fieldset>
  );
}
