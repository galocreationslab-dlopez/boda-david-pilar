"use client";

import { useState, type ReactNode } from "react";
import type { TimelineDispositivoConfig, TimelinePlantillaConfig, TimelineZona } from "@/config/wedding.config";
import { NumberField } from "@/components/admin/PortadaLibreEditor";
import { TIMELINE_MEDIDAS, normalizeTimelinePlantilla } from "@/lib/timeline-layout";
import { FONT_ROLE_KEYS, FONT_ROLE_LABELS } from "@/lib/theme-fonts";

const LABELS = {
  ancho: "Ancho de entrada (px)",
  alturaMinima: "Altura mínima de entrada (px)",
  margenExterior: "Margen exterior, fuera del marco (px)",
  rellenoInterior: "Relleno interior, marco a contenido (px)",
  separacion: "Separación entre zonas (px)",
  grosorBorde: "Grosor del borde (px)",
  redondeo: "Radio de las esquinas (px)",
};
const ELEMENT_LABELS = { logo: "Logo", hora: "Hora", titulo: "Título", descripcion: "Descripción" };

export default function TimelinePlantillaEditor({ value, roles, onChange, device: forcedDevice, renderPreview }: {
  value?: TimelinePlantillaConfig;
  roles: { key: string; label: string }[];
  onChange: (next: TimelinePlantillaConfig) => void;
  device?: "pc" | "movil";
  renderPreview?: (device: "pc" | "movil") => ReactNode;
}) {
  const [selectedDevice, setDevice] = useState<"pc" | "movil">("pc");
  const device = forcedDevice ?? selectedDevice;
  const config = normalizeTimelinePlantilla(value);
  const layout = config[device];
  const patch = (change: Partial<TimelineDispositivoConfig>) =>
    onChange(normalizeTimelinePlantilla({ ...config, [device]: { ...layout, ...change } }));
  const roleSelect = (label: string, value: string, update: (role: string) => void) => (
    <label className="block text-xs text-stone-600">
      {label}
      <select className="input-field" value={value} onChange={(event) => update(event.target.value)}>
        {!roles.some((role) => role.key === value) && <option value={value}>{value} (rol conservado)</option>}
        {roles.map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}
      </select>
    </label>
  );
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={config.activa} onChange={(event) => onChange({ ...config, activa: event.target.checked })} />
        Usar formato compartido de entradas
      </label>
      <p className="text-xs text-stone-600">
        La plantilla pertenece a esta sección. Contenido, hora y Maps siguen siendo propios de cada entrada.
        Al activarla, el tamaño y la posición compartidos del logo prevalecen; los valores individuales se conservan para el diseño antiguo.
      </p>
      {!forcedDevice && (
        <div className="flex gap-2" aria-label="Dispositivo de la plantilla">
          {(["pc", "movil"] as const).map((key) => (
            <button key={key} type="button" aria-pressed={device === key} onClick={() => setDevice(key)}
              className={`rounded border px-3 py-1 text-xs ${device === key ? "border-amber-600 bg-amber-100" : "border-stone-300"}`}>
              {key === "pc" ? "PC" : "Móvil"}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-stone-600" role="status">
        Editando {device === "pc" ? "PC: entradas horizontales" : "móvil: entradas verticales"}.
        {config.activa ? " Formato compartido activo." : " Diseño antiguo activo; estos ajustes se conservan sin aplicarse."}
      </p>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={layout.marcoVisible} onChange={(event) => patch({ marcoVisible: event.target.checked })} />
        Mostrar fondo y borde del marco (ocultarlo mantiene su espacio)
      </label>
      <div className="grid grid-cols-2 gap-2">
        {roleSelect("Rol del fondo", layout.fondoRol, (fondoRol) => patch({ fondoRol }))}
        {roleSelect("Rol del borde", layout.bordeRol, (bordeRol) => patch({ bordeRol }))}
        {Object.entries(TIMELINE_MEDIDAS).map(([rawKey, range]) => {
          const key = rawKey as keyof typeof TIMELINE_MEDIDAS;
          return <NumberField key={key} label={`${LABELS[key]} · ${range.min}–${range.max}`}
            value={layout[key]} min={range.min} max={range.max} onChange={(number) => patch({ [key]: number })} />;
        })}
        <label className="block text-xs text-stone-600">
          Posición vertical del conjunto
          <select className="input-field" value={layout.alineacionVertical}
            onChange={(event) => patch({ alineacionVertical: event.target.value as TimelineDispositivoConfig["alineacionVertical"] })}>
            <option value="start">Arriba</option><option value="center">Centro</option><option value="end">Abajo</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-stone-500">
        Las medidas se limitan al rango indicado. El ancho se adapta al espacio disponible; margen y relleno se reducen en pantallas estrechas.
        La altura es mínima: todas las entradas se igualan al contenido más alto. Los textos no se recortan ni se superponen.
      </p>
      {layout.orden.map((key, index) => {
        const zone = layout.zonas[key];
        const patchZone = (change: Partial<TimelineZona>) => patch({ zonas: { ...layout.zonas, [key]: { ...zone, ...change } } });
        const move = (target: number) => {
          const orden = [...layout.orden];
          [orden[index], orden[target]] = [orden[target], orden[index]];
          patch({ orden });
        };
        return (
          <fieldset key={key} className="space-y-2 rounded-lg border border-stone-200 p-2">
            <legend className="px-1 text-xs font-semibold">{index + 1}. {ELEMENT_LABELS[key]}</legend>
            <div className="flex gap-2">
              <button type="button" disabled={index === 0} onClick={() => move(index - 1)}
                aria-label={`Subir ${ELEMENT_LABELS[key]}`} className="rounded border px-2 text-xs disabled:opacity-40">Subir</button>
              <button type="button" disabled={index === layout.orden.length - 1} onClick={() => move(index + 1)}
                aria-label={`Bajar ${ELEMENT_LABELS[key]}`} className="rounded border px-2 text-xs disabled:opacity-40">Bajar</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-stone-600">Posición horizontal
                <select className="input-field" value={zone.alineacion}
                  onChange={(event) => patchZone({ alineacion: event.target.value as TimelineZona["alineacion"] })}>
                  <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
                </select>
              </label>
              {roleSelect("Rol del color", zone.colorRol, (colorRol) => patchZone({ colorRol }))}
              {key !== "logo" && <label className="block text-xs text-stone-600">Fuente (rol)
                <select className="input-field" value={zone.fuenteRol}
                  onChange={(event) => patchZone({ fuenteRol: event.target.value as TimelineZona["fuenteRol"] })}>
                  {FONT_ROLE_KEYS.map((role) => <option key={role} value={role}>{FONT_ROLE_LABELS[role]}</option>)}
                </select>
              </label>}
              <NumberField label={key === "logo" ? "Lado mayor del logo (px) · 16–240" : "Tamaño de fuente (px) · 12–96"}
                value={zone.tamano} min={key === "logo" ? 16 : 12} max={key === "logo" ? 240 : 96}
                onChange={(tamano) => patchZone({ tamano })} />
            </div>
          </fieldset>
        );
      })}
      <p className="text-xs text-stone-500">
        Previsualiza el resultado y guarda los cambios de la sección. Pulsa dentro para ver Maps y fuera para volver.
        Por teclado: Enter/Espacio abre; Escape o salir del marco devuelve el frontal. Sin animación con movimiento reducido.
      </p>
      {renderPreview && <div className="min-w-0 overflow-hidden rounded-lg border border-stone-200" aria-label="Previsualización del formato timeline">
        {renderPreview(device)}
      </div>}
    </div>
  );
}
