"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type {
  FuenteRol,
  PortadaColorModo,
  PortadaDispositivoConfig,
  PortadaElementoLayout,
  PortadaLibreConfig,
} from "@/config/wedding.config";
import { PortadaElementoContenido, getPortadaBoxStyle, resolvePortadaColor } from "@/components/wedding/PortadaLibre";
import { FONT_ROLE_KEYS, FONT_ROLE_LABELS } from "@/lib/theme-fonts";
import {
  ASPECTOS_PREDEFINIDOS,
  PANTALLA_ASPECTO,
  clampLayout,
  getElementoLayout,
  getPantallas,
  normalizePortadaLibre,
  type PortadaDispositivo,
} from "@/lib/portada-libre";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type DragMode = Handle | "move";
type DragState = { id: string; mode: DragMode; startX: number; startY: number; start: PortadaElementoLayout };

const HANDLES: Array<{ key: Handle; style: CSSProperties; cursor: string }> = [
  { key: "nw", style: { left: -6, top: -6 }, cursor: "nwse-resize" },
  { key: "n", style: { left: "calc(50% - 6px)", top: -6 }, cursor: "ns-resize" },
  { key: "ne", style: { right: -6, top: -6 }, cursor: "nesw-resize" },
  { key: "e", style: { right: -6, top: "calc(50% - 6px)" }, cursor: "ew-resize" },
  { key: "se", style: { right: -6, bottom: -6 }, cursor: "nwse-resize" },
  { key: "s", style: { left: "calc(50% - 6px)", bottom: -6 }, cursor: "ns-resize" },
  { key: "sw", style: { left: -6, bottom: -6 }, cursor: "nesw-resize" },
  { key: "w", style: { left: -6, top: "calc(50% - 6px)" }, cursor: "ew-resize" },
];

const MIN_SIZE_PCT = 2;
const round1 = (n: number) => Math.round(n * 10) / 10;

type RoleOption = { key: string; label: string };

type Props = {
  config: PortadaLibreConfig | undefined;
  dispositivo: PortadaDispositivo;
  roles: RoleOption[];
  roleColors: Record<string, string | undefined>;
  resolveSrc: (src?: string) => string;
  onChange: (next: PortadaLibreConfig) => void;
};

function NumberField({ label, value, onChange, step = 1, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <label className="block text-[11px] text-stone-600">
      {label}
      <input
        type="number"
        className="input-field h-8 text-xs"
        value={Number.isFinite(value) ? round1(value) : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />
    </label>
  );
}

function ColorControl({
  label,
  modo,
  rol,
  hex,
  roles,
  originalLabel,
  onChange,
}: {
  label: string;
  modo: PortadaColorModo;
  rol?: string;
  hex?: string;
  roles: RoleOption[];
  originalLabel: string;
  onChange: (patch: { colorModo: PortadaColorModo; colorRol?: string; colorHex?: string }) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] text-stone-600">
        {label}
        <select
          className="input-field h-8 text-xs"
          value={modo}
          onChange={(e) => {
            const next = e.target.value as PortadaColorModo;
            onChange({
              colorModo: next,
              colorRol: next === "paleta" ? (rol ?? roles[0]?.key) : rol,
              colorHex: next === "personalizado" ? (hex ?? "#000000") : hex,
            });
          }}
        >
          <option value="original">{originalLabel}</option>
          <option value="paleta">Color de la paleta</option>
          <option value="personalizado">Color personalizado</option>
        </select>
      </label>
      {modo === "paleta" && (
        <select className="input-field h-8 text-xs" value={rol ?? ""} onChange={(e) => onChange({ colorModo: modo, colorRol: e.target.value, colorHex: hex })}>
          {roles.map((role) => (
            <option key={role.key} value={role.key}>{role.label}</option>
          ))}
        </select>
      )}
      {modo === "personalizado" && (
        <input
          type="color"
          className="h-8 w-full rounded border border-stone-300"
          value={hex || "#000000"}
          onChange={(e) => onChange({ colorModo: modo, colorRol: rol, colorHex: e.target.value })}
        />
      )}
    </div>
  );
}

export default function PortadaLibreEditor({ config, dispositivo, roles, roleColors, resolveSrc, onChange }: Props) {
  const normalizado = normalizePortadaLibre(config);
  const disp = normalizado[dispositivo];
  const porPantallas = disp.alturaModo === "pantallas";
  const aspecto = disp.aspecto && disp.aspecto > 0 ? disp.aspecto : PANTALLA_ASPECTO[dispositivo];
  const pantallas = porPantallas ? getPantallas(normalizado, dispositivo) : 1;

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [anchoPx, setAnchoPx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const normalizadoRef = useRef(normalizado);
  normalizadoRef.current = normalizado;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setAnchoPx(el.clientWidth));
    observer.observe(el);
    setAnchoPx(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const unitPx = porPantallas ? anchoPx / PANTALLA_ASPECTO[dispositivo] : anchoPx / aspecto;
  const alturaPx = unitPx * pantallas;
  const maxY = !porPantallas ? 100 : (disp.pantallas ?? 1) > 0 ? pantallas * 100 : 2000;

  const patchDisp = useCallback((patch: Partial<PortadaDispositivoConfig>) => {
    const current = normalizadoRef.current;
    onChangeRef.current({ ...current, [dispositivo]: { ...current[dispositivo], ...patch } });
  }, [dispositivo]);

  const patchLayout = useCallback((id: string, patch: Partial<PortadaElementoLayout>, limitY?: number) => {
    const current = normalizadoRef.current;
    const index = current.elementos.findIndex((el) => el.id === id);
    if (index < 0) return;
    const base = getElementoLayout(current, dispositivo, current.elementos[index], index);
    const next = clampLayout({ ...base, ...patch }, limitY ?? 2000);
    onChangeRef.current({
      ...current,
      [dispositivo]: { ...current[dispositivo], layout: { ...current[dispositivo].layout, [id]: next } },
    });
  }, [dispositivo]);

  const unitPxRef = useRef(unitPx);
  unitPxRef.current = unitPx;
  const anchoRef = useRef(anchoPx);
  anchoRef.current = anchoPx;
  const maxYRef = useRef(maxY);
  maxYRef.current = maxY;

  useEffect(() => {
    if (!drag) return;
    const onMove = (event: PointerEvent) => {
      if (!anchoRef.current || !unitPxRef.current) return;
      const dx = ((event.clientX - drag.startX) / anchoRef.current) * 100;
      const dy = ((event.clientY - drag.startY) / unitPxRef.current) * 100;
      const s = drag.start;
      let { x, y, w, h } = s;
      if (drag.mode === "move") {
        x = s.x + dx;
        y = s.y + dy;
      } else {
        if (drag.mode.includes("e")) w = Math.max(MIN_SIZE_PCT, s.w + dx);
        if (drag.mode.includes("w")) {
          w = Math.max(MIN_SIZE_PCT, s.w - dx);
          x = s.x + (s.w - w);
        }
        if (drag.mode.includes("s")) h = Math.max(MIN_SIZE_PCT, s.h + dy);
        if (drag.mode.includes("n")) {
          h = Math.max(MIN_SIZE_PCT, s.h - dy);
          y = s.y + (s.h - h);
        }
      }
      patchLayout(drag.id, { x: round1(x), y: round1(y), w: round1(w), h: round1(h) }, maxYRef.current);
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, patchLayout]);

  const startDrag = (event: ReactPointerEvent, id: string, mode: DragMode, layout: PortadaElementoLayout) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(id);
    setDrag({ id, mode, startX: event.clientX, startY: event.clientY, start: layout });
  };

  const selectedIndex = normalizado.elementos.findIndex((el) => el.id === selectedId);
  const selected = selectedIndex >= 0 ? normalizado.elementos[selectedIndex] : null;
  const selectedLayout = selected ? getElementoLayout(normalizado, dispositivo, selected, selectedIndex) : null;

  const copyFromOther = () => {
    const other: PortadaDispositivo = dispositivo === "pc" ? "movil" : "pc";
    if (!confirm(`Copiar posiciones y estilos desde ${other === "pc" ? "PC" : "móvil"} a ${dispositivo === "pc" ? "PC" : "móvil"}?`)) return;
    patchDisp({ layout: { ...normalizado[other].layout } });
  };

  const fondoColor = resolvePortadaColor(disp.fondoModo, disp.fondoRol, disp.fondoHex, roleColors);
  const maxZ = normalizado.elementos.reduce((m, el, i) => Math.max(m, getElementoLayout(normalizado, dispositivo, el, i).z ?? 1), 1);

  return (
    <div className="space-y-3 p-3" style={{ fontFamily: "system-ui, sans-serif", color: "#292524" }}>
      <div className="grid gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-[11px] text-stone-600">
          Altura del lienzo ({dispositivo === "pc" ? "PC" : "móvil"})
          <select
            className="input-field h-8 text-xs"
            value={disp.alturaModo}
            onChange={(e) => patchDisp({ alturaModo: e.target.value as "aspecto" | "pantallas" })}
          >
            <option value="pantallas">Pantallas completas</option>
            <option value="aspecto">Relación de aspecto</option>
          </select>
        </label>
        {porPantallas ? (
          <NumberField
            label="Nº de pantallas (0 = automático)"
            value={disp.pantallas ?? 1}
            min={0}
            max={20}
            onChange={(v) => patchDisp({ pantallas: Math.max(0, Math.floor(v)) })}
          />
        ) : (
          <>
            <label className="block text-[11px] text-stone-600">
              Aspecto predefinido
              <select
                className="input-field h-8 text-xs"
                value={ASPECTOS_PREDEFINIDOS.find((a) => Math.abs(a.value - aspecto) < 0.001)?.label ?? ""}
                onChange={(e) => {
                  const found = ASPECTOS_PREDEFINIDOS.find((a) => a.label === e.target.value);
                  if (found) patchDisp({ aspecto: found.value });
                }}
              >
                <option value="">Personalizado</option>
                {ASPECTOS_PREDEFINIDOS.map((a) => (
                  <option key={a.label} value={a.label}>{a.label}</option>
                ))}
              </select>
            </label>
            <NumberField
              label="Ancho / alto"
              value={aspecto}
              step={0.05}
              min={0.2}
              max={5}
              onChange={(v) => patchDisp({ aspecto: Math.min(5, Math.max(0.2, v)) })}
            />
          </>
        )}
        <div className="sm:col-span-2 lg:col-span-1">
          <ColorControl
            label="Fondo del lienzo"
            modo={disp.fondoModo ?? "original"}
            rol={disp.fondoRol}
            hex={disp.fondoHex}
            roles={roles}
            originalLabel="Sin fondo (el de la sección)"
            onChange={(p) => patchDisp({ fondoModo: p.colorModo, fondoRol: p.colorRol, fondoHex: p.colorHex })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {normalizado.elementos.length === 0 && (
          <p className="text-xs text-stone-500">Añade imágenes o textos en la pestaña Contenido para colocarlos aquí.</p>
        )}
        {normalizado.elementos.map((el, index) => (
          <button
            key={el.id}
            type="button"
            onClick={() => setSelectedId(el.id)}
            className={`rounded border px-2 py-1 text-[11px] ${selectedId === el.id ? "border-amber-500 bg-amber-100 text-amber-800" : "border-stone-300 bg-white text-stone-600"}`}
          >
            {el.tipo === "texto" ? "T" : "Img"} · {el.nombre || el.texto?.slice(0, 16) || `Elemento ${index + 1}`}
          </button>
        ))}
        <button type="button" onClick={copyFromOther} className="ml-auto rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-600 hover:bg-stone-50">
          Copiar desde {dispositivo === "pc" ? "móvil" : "PC"}
        </button>
      </div>

      <div className="mx-auto" style={{ maxWidth: dispositivo === "movil" ? 430 : undefined }}>
        <div
          ref={canvasRef}
          className="relative w-full select-none overflow-hidden border border-dashed border-stone-400"
          style={{
            height: alturaPx || undefined,
            aspectRatio: alturaPx ? undefined : String(aspecto),
            backgroundColor: fondoColor ?? "#ffffff",
            backgroundImage: "linear-gradient(45deg,#0000000d 25%,transparent 25%,transparent 75%,#0000000d 75%),linear-gradient(45deg,#0000000d 25%,transparent 25%,transparent 75%,#0000000d 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 8px 8px",
            containerType: "inline-size",
            touchAction: "none",
          }}
          onPointerDown={() => setSelectedId(null)}
        >
          {porPantallas && Array.from({ length: pantallas - 1 }, (_, i) => (
            <div key={i} className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-rose-400" style={{ top: unitPx * (i + 1), zIndex: 9999 }}>
              <span className="absolute right-1 -top-4 rounded bg-rose-500 px-1 text-[10px] text-white">Pantalla {i + 2}</span>
            </div>
          ))}

          {normalizado.elementos.map((el, index) => {
            const layout = getElementoLayout(normalizado, dispositivo, el, index);
            const isSelected = selectedId === el.id;
            const box = getPortadaBoxStyle(layout, disp.alturaModo, unitPx);
            return (
              <div
                key={el.id}
                style={{
                  ...box,
                  opacity: layout.oculto ? 0.15 : box.opacity,
                  outline: isSelected ? "2px solid #b45309" : "1px dashed #a8a29e",
                  cursor: "move",
                }}
                onPointerDown={(event) => startDrag(event, el.id, "move", layout)}
              >
                <div className="pointer-events-none h-full w-full">
                  <PortadaElementoContenido elemento={el} layout={layout} dispositivo={dispositivo} roleColors={roleColors} resolveSrc={resolveSrc} />
                </div>
                {isSelected && HANDLES.map((handle) => (
                  <span
                    key={handle.key}
                    onPointerDown={(event) => startDrag(event, el.id, handle.key, layout)}
                    style={{
                      position: "absolute",
                      width: 12,
                      height: 12,
                      background: "#fff",
                      border: "2px solid #b45309",
                      borderRadius: 2,
                      cursor: handle.cursor,
                      zIndex: 10000,
                      ...handle.style,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {selected && selectedLayout && (
        <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
          <p className="text-xs font-semibold text-stone-700">
            {selected.tipo === "texto" ? "Texto" : "Imagen"}: {selected.nombre || selected.texto?.slice(0, 30) || selected.url?.slice(-30) || selected.id}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <NumberField label="X (%)" value={selectedLayout.x} step={0.5} onChange={(v) => patchLayout(selected.id, { x: v }, maxY)} />
            <NumberField label="Y (%)" value={selectedLayout.y} step={0.5} onChange={(v) => patchLayout(selected.id, { y: v }, maxY)} />
            <NumberField label="Ancho (%)" value={selectedLayout.w} step={0.5} min={MIN_SIZE_PCT} onChange={(v) => patchLayout(selected.id, { w: v }, maxY)} />
            <NumberField label="Alto (%)" value={selectedLayout.h} step={0.5} min={MIN_SIZE_PCT} onChange={(v) => patchLayout(selected.id, { h: v }, maxY)} />
            <NumberField label="Opacidad (%)" value={selectedLayout.opacidad ?? 100} min={0} max={100} onChange={(v) => patchLayout(selected.id, { opacidad: Math.min(100, Math.max(0, v)) }, maxY)} />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-600">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={Boolean(selectedLayout.oculto)} onChange={(e) => patchLayout(selected.id, { oculto: e.target.checked }, maxY)} />
              Oculto en {dispositivo === "pc" ? "PC" : "móvil"}
            </label>
            <button type="button" className="rounded border border-stone-300 px-2 py-1 hover:bg-stone-50" onClick={() => patchLayout(selected.id, { z: maxZ + 1 }, maxY)}>
              Traer al frente
            </button>
            <button type="button" className="rounded border border-stone-300 px-2 py-1 hover:bg-stone-50" onClick={() => patchLayout(selected.id, { z: Math.max(0, (selectedLayout.z ?? 1) - 1) }, maxY)}>
              Bajar una capa
            </button>
            <span>Capa: {selectedLayout.z ?? 1}</span>
          </div>

          {selected.tipo === "imagen" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorControl
                label="Color de la imagen"
                modo={selectedLayout.colorModo ?? "original"}
                rol={selectedLayout.colorRol}
                hex={selectedLayout.colorHex}
                roles={roles}
                originalLabel="Color original"
                onChange={(p) => patchLayout(selected.id, p, maxY)}
              />
              <label className="block text-[11px] text-stone-600">
                Ajuste
                <select className="input-field h-8 text-xs" value={selectedLayout.ajuste ?? "contain"} onChange={(e) => patchLayout(selected.id, { ajuste: e.target.value as "contain" | "cover" }, maxY)}>
                  <option value="contain">Contener (sin recortar)</option>
                  <option value="cover">Cubrir (recorta)</option>
                </select>
              </label>
              {(selectedLayout.colorModo ?? "original") !== "original" && (
                <p className="text-[11px] text-stone-500 sm:col-span-2">
                  El color se aplica sobre la silueta de la imagen: usa PNG o SVG con transparencia. Las imágenes de otros dominios necesitan permitir CORS.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-[11px] text-stone-600">
                Fuente
                <select className="input-field h-8 text-xs" value={selectedLayout.fuenteRol ?? "titulos"} onChange={(e) => patchLayout(selected.id, { fuenteRol: e.target.value as FuenteRol }, maxY)}>
                  {FONT_ROLE_KEYS.map((role) => (
                    <option key={role} value={role}>{FONT_ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </label>
              <NumberField
                label={`Tamaño (px a ${dispositivo === "pc" ? "1200" : "400"} px de ancho)`}
                value={selectedLayout.tamano ?? 32}
                min={4}
                max={600}
                onChange={(v) => patchLayout(selected.id, { tamano: Math.min(600, Math.max(4, v)) }, maxY)}
              />
              <ColorControl
                label="Color del texto"
                modo={selectedLayout.colorModo ?? "paleta"}
                rol={selectedLayout.colorRol}
                hex={selectedLayout.colorHex}
                roles={roles}
                originalLabel="Color por defecto"
                onChange={(p) => patchLayout(selected.id, p, maxY)}
              />
              <div className="space-y-1 text-[11px] text-stone-600">
                <label className="block">
                  Alineación horizontal
                  <select className="input-field h-8 text-xs" value={selectedLayout.alineacion ?? "center"} onChange={(e) => patchLayout(selected.id, { alineacion: e.target.value as "left" | "center" | "right" }, maxY)}>
                    <option value="left">Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="right">Derecha</option>
                  </select>
                </label>
                <label className="block">
                  Alineación vertical
                  <select className="input-field h-8 text-xs" value={selectedLayout.alineacionVertical ?? "center"} onChange={(e) => patchLayout(selected.id, { alineacionVertical: e.target.value as "start" | "center" | "end" }, maxY)}>
                    <option value="start">Arriba</option>
                    <option value="center">Centro</option>
                    <option value="end">Abajo</option>
                  </select>
                </label>
                <div className="flex gap-3">
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={Boolean(selectedLayout.negrita)} onChange={(e) => patchLayout(selected.id, { negrita: e.target.checked }, maxY)} />Negrita</label>
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={Boolean(selectedLayout.cursiva)} onChange={(e) => patchLayout(selected.id, { cursiva: e.target.checked }, maxY)} />Cursiva</label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
