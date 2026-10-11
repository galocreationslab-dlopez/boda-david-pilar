"use client";

import type { SeccionDiseno } from "@/config/wedding.config";

export default function SectionTitleControls({ section, onChange }: {
  section: SeccionDiseno;
  onChange: (patch: Partial<SeccionDiseno>) => void;
}) {
  if (!["historia", "timeline", "galeria", "carrusel", "portadaLibre"].includes(section.tipo)) return null;

  const alignment = section.tituloAlineacion ?? "izquierda";
  return (
    <div className="space-y-2">
      <label className="label-field">
        Posicion horizontal del titulo
        <select
          className="input-field mt-1"
          value={alignment}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "izquierda" || value === "centrada" || value === "derecha" || value === "personalizada") {
              onChange({ tituloAlineacion: value });
            }
          }}
        >
          <option value="izquierda">Izquierda</option>
          <option value="centrada">Centrada</option>
          <option value="derecha">Derecha</option>
          <option value="personalizada">Personalizada</option>
        </select>
      </label>
      {alignment === "personalizada" && (
        <label className="label-field">
          Padding izquierdo del titulo (px)
          <input
            type="number"
            min={0}
            step="any"
            className="input-field mt-1"
            value={section.tituloPaddingIzquierdoPx ?? 0}
            onChange={(event) => {
              const value = event.target.value === "" ? 0 : event.target.valueAsNumber;
              if (Number.isFinite(value) && value >= 0) {
                onChange({ tituloPaddingIzquierdoPx: value });
              } else {
                event.currentTarget.reportValidity();
              }
            }}
          />
        </label>
      )}
      <p className="text-xs text-stone-500">
        Solo afecta a la cabecera colapsable. El padding personalizado se mide desde su borde izquierdo y se limita al espacio disponible.
      </p>
    </div>
  );
}
