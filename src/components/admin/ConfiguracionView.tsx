"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  WeddingConfig,
  EventoHistoria,
  EventoTimeline,
  TemaColores,
  TemaPaleta,
  TemaColorExtra,
  SeparadorDiseno,
  SeccionDiseno,
  TipoSeccionDiseno,
} from "@/config/wedding.config";

type Tab = "diseno" | "historia" | "timeline";

const ICONO_OPTIONS = ["rings", "cocktail", "fork", "cake", "music", "car", "iglesia", "finca"];
const SECTION_TYPES: TipoSeccionDiseno[] = ["portada", "historia", "timeline", "galeria"];
const PROFILE_OPTIONS = ["publico", "familia", "amigos", "vip", "admin"];

const CORE_COLOR_KEYS: Array<keyof TemaColores> = [
  "bronze",
  "bronzeLight",
  "olive",
  "oliveMuted",
  "cream",
  "brownDark",
  "white",
];

const DEFAULT_COLOR_LABELS: Record<keyof TemaColores, string> = {
  bronze: "Bronce principal",
  bronzeLight: "Bronce claro",
  olive: "Oliva",
  oliveMuted: "Oliva suave",
  cream: "Fondo crema",
  brownDark: "Marron oscuro",
  white: "Blanco base",
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function normalizeTemaColores(colores: TemaColores): TemaColores {
  return {
    bronze: colores.bronze,
    bronzeLight: colores.bronzeLight,
    olive: colores.olive,
    oliveMuted: colores.oliveMuted,
    cream: colores.cream,
    brownDark: colores.brownDark,
    white: colores.white,
  };
}

function ensurePalette(paleta: TemaPaleta, fallback: TemaColores): TemaPaleta {
  const safe = {
    ...fallback,
    ...paleta.colores,
  };
  return {
    id: paleta.id,
    nombre: paleta.nombre,
    colores: normalizeTemaColores(safe),
    etiquetasColores: {
      ...DEFAULT_COLOR_LABELS,
      ...(paleta.etiquetasColores ?? {}),
    },
    coloresExtra: paleta.coloresExtra ?? [],
  };
}

function buildInitialPaletas(config: WeddingConfig): TemaPaleta[] {
  const fallback = normalizeTemaColores(config.tema.colores);
  const existing = (config.tema.paletas ?? []).map((p) => ensurePalette(p, fallback));
  if (existing.length > 0) return existing;

  return [
    {
      id: "paleta-principal",
      nombre: "Principal",
      colores: fallback,
      etiquetasColores: { ...DEFAULT_COLOR_LABELS },
      coloresExtra: [],
    },
  ];
}

function buildInitialSeparador(config: WeddingConfig): SeparadorDiseno {
  return {
    modo: config.diseno?.separador?.modo ?? "suave",
    grafico: config.diseno?.separador?.grafico ?? "ornamento",
  };
}

function defaultSection(paletaId: string, tipo: TipoSeccionDiseno = "portada"): SeccionDiseno {
  return {
    id: `sec-${uid()}`,
    nombre: tipo === "portada" ? "Portada" : "Nueva seccion",
    titulo: tipo === "portada" ? "Invitacion" : "Titulo",
    tipo,
    paletaId,
    visible: true,
    perfiles: ["publico"],
    items: [],
  };
}

function buildInitialSecciones(config: WeddingConfig, paletaId: string): SeccionDiseno[] {
  const fromConfig = config.diseno?.secciones;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) {
    return fromConfig.map((sec) => ({
      ...sec,
      paletaId: sec.paletaId || paletaId,
      perfiles: sec.perfiles?.length ? sec.perfiles : ["publico"],
      items: sec.items ?? [],
    }));
  }

  return [
    defaultSection(paletaId, "portada"),
    defaultSection(paletaId, "historia"),
    defaultSection(paletaId, "galeria"),
    defaultSection(paletaId, "timeline"),
  ];
}

function isDriveUrl(value: string): boolean {
  return value.includes("drive.google.com") || value.includes("drive.usercontent.google.com");
}

function previewSrcForAdmin(inviteCode: string, src: string): string {
  if (!src) return src;
  if (isDriveUrl(src)) {
    return `/api/admin/${encodeURIComponent(inviteCode)}/resources/preview?src=${encodeURIComponent(src)}`;
  }
  return src;
}

type ResourceItem = {
  id: string;
  nombre: string;
  url_publica: string | null;
  mime_type: string | null;
  subido_por: string | null;
  created_at: string;
};

export default function ConfiguracionView({ inviteCode, config: ic }: { inviteCode: string; config: WeddingConfig }) {
  const [tab, setTab] = useState<Tab>("diseno");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const initialPaletas = useMemo(() => buildInitialPaletas(ic), [ic]);
  const [paletas, setPaletas] = useState<TemaPaleta[]>(initialPaletas);
  const [paletaActivaId, setPaletaActivaId] = useState<string>(
    ic.tema.paletaActivaId && initialPaletas.some((p) => p.id === ic.tema.paletaActivaId)
      ? ic.tema.paletaActivaId
      : initialPaletas[0]?.id ?? "",
  );
  const [paletaEditandoId, setPaletaEditandoId] = useState<string>(
    ic.tema.paletaActivaId && initialPaletas.some((p) => p.id === ic.tema.paletaActivaId)
      ? ic.tema.paletaActivaId
      : initialPaletas[0]?.id ?? "",
  );

  const [separador, setSeparador] = useState<SeparadorDiseno>(buildInitialSeparador(ic));
  const [secciones, setSecciones] = useState<SeccionDiseno[]>(
    buildInitialSecciones(ic, initialPaletas[0]?.id ?? ""),
  );
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [previewRole, setPreviewRole] = useState<string>("publico");

  const [fuentes, setFuentes] = useState({ ...ic.tema.fuentes });
  const [logoUrl, setLogoUrl] = useState(ic.logo ?? "");
  const [historia, setHistoria] = useState<EventoHistoria[]>(structuredClone(ic.historia));
  const [editandoH, setEditandoH] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploadingHistoriaId, setUploadingHistoriaId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Array<EventoTimeline & { enlaceMaps?: string }>>(
    structuredClone(ic.timeline).map((e) => ({ ...e, enlaceMaps: "" })),
  );

  const paletaActiva = useMemo(
    () => paletas.find((p) => p.id === paletaActivaId) ?? paletas[0],
    [paletaActivaId, paletas],
  );

  const paletaEditando = useMemo(
    () => paletas.find((p) => p.id === paletaEditandoId) ?? paletaActiva,
    [paletaActiva, paletaEditandoId, paletas],
  );

  const visiblePreviewSections = useMemo(
    () =>
      secciones.filter((s) => {
        if (!s.visible) return false;
        if (!s.perfiles || s.perfiles.length === 0) return true;
        return s.perfiles.includes(previewRole) || s.perfiles.includes("publico");
      }),
    [previewRole, secciones],
  );

  const resourcesForHistoria = useMemo(
    () => resources.filter((item) => item.mime_type?.startsWith("image/") || item.mime_type === null),
    [resources],
  );

  const showMsg = (type: "ok" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const updatePaleta = (paletteId: string, updater: (current: TemaPaleta) => TemaPaleta) => {
    setPaletas((prev) => prev.map((p) => (p.id === paletteId ? updater(p) : p)));
  };

  const addPalette = () => {
    const base = paletaEditando ?? paletaActiva;
    const nueva: TemaPaleta = {
      id: `paleta-${uid()}`,
      nombre: `Paleta ${paletas.length + 1}`,
      colores: normalizeTemaColores(base?.colores ?? ic.tema.colores),
      etiquetasColores: { ...DEFAULT_COLOR_LABELS, ...(base?.etiquetasColores ?? {}) },
      coloresExtra: [...(base?.coloresExtra ?? [])],
    };
    setPaletas((prev) => [...prev, nueva]);
    setPaletaEditandoId(nueva.id);
  };

  const clonePalette = () => {
    if (!paletaEditando) return;
    const clon: TemaPaleta = {
      ...paletaEditando,
      id: `paleta-${uid()}`,
      nombre: `${paletaEditando.nombre} copia`,
      colores: normalizeTemaColores(paletaEditando.colores),
      etiquetasColores: { ...(paletaEditando.etiquetasColores ?? {}) },
      coloresExtra: [...(paletaEditando.coloresExtra ?? [])],
    };
    setPaletas((prev) => [...prev, clon]);
    setPaletaEditandoId(clon.id);
  };

  const removePalette = () => {
    if (!paletaEditando) return;
    if (paletas.length <= 1) {
      showMsg("error", "Debe existir al menos una paleta.");
      return;
    }
    if (!confirm("Eliminar esta paleta?")) return;

    const remaining = paletas.filter((p) => p.id !== paletaEditando.id);
    const nextActive = remaining[0]?.id ?? "";
    setPaletas(remaining);
    setPaletaEditandoId(nextActive);

    if (paletaActivaId === paletaEditando.id) {
      setPaletaActivaId(nextActive);
    }

    setSecciones((prev) =>
      prev.map((s) => ({
        ...s,
        paletaId: s.paletaId === paletaEditando.id ? nextActive : s.paletaId,
      })),
    );
  };

  const addExtraColor = () => {
    if (!paletaEditando) return;
    updatePaleta(paletaEditando.id, (p) => ({
      ...p,
      coloresExtra: [
        ...(p.coloresExtra ?? []),
        { id: `extra-${uid()}`, nombre: "Color extra", valor: "#000000" },
      ],
    }));
  };

  const removeExtraColor = (colorId: string) => {
    if (!paletaEditando) return;
    updatePaleta(paletaEditando.id, (p) => ({
      ...p,
      coloresExtra: (p.coloresExtra ?? []).filter((c) => c.id !== colorId),
    }));
  };

  const updateSection = (sectionId: string, patch: Partial<SeccionDiseno>) => {
    setSecciones((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  };

  const addSection = () => {
    const paletaId = paletaActiva?.id ?? paletas[0]?.id ?? "";
    setSecciones((prev) => [...prev, defaultSection(paletaId, "portada")]);
  };

  const cloneSection = (sectionId: string) => {
    const base = secciones.find((s) => s.id === sectionId);
    if (!base) return;
    const clone: SeccionDiseno = {
      ...base,
      id: `sec-${uid()}`,
      nombre: `${base.nombre} copia`,
      items: [...(base.items ?? [])].map((item) => ({ ...item, id: `item-${uid()}` })),
    };
    setSecciones((prev) => [...prev, clone]);
  };

  const removeSection = (sectionId: string) => {
    if (!confirm("Eliminar esta seccion?")) return;
    setSecciones((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    setSecciones((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx < 0) return prev;
      const next = idx + direction;
      if (next < 0 || next >= prev.length) return prev;
      const clone = [...prev];
      const [item] = clone.splice(idx, 1);
      clone.splice(next, 0, item);
      return clone;
    });
  };

  const reorderSections = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setSecciones((prev) => {
      const sourceIndex = prev.findIndex((s) => s.id === sourceId);
      const targetIndex = prev.findIndex((s) => s.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      const clone = [...prev];
      const [item] = clone.splice(sourceIndex, 1);
      clone.splice(targetIndex, 0, item);
      return clone;
    });
  };

  const updateSectionItem = (sectionId: string, itemId: string, patch: Partial<SeccionDiseno["items"][number]>) => {
    setSecciones((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          items: (s.items ?? []).map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        };
      }),
    );
  };

  const addSectionItem = (sectionId: string, tipo: TipoSeccionDiseno) => {
    setSecciones((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const next = {
          id: `item-${uid()}`,
          titulo: tipo === "timeline" ? "Nuevo hito" : "Nueva entrada",
          descripcion: "",
          hora: tipo === "timeline" ? "12:00" : undefined,
        };
        return { ...s, items: [...(s.items ?? []), next] };
      }),
    );
  };

  const removeSectionItem = (sectionId: string, itemId: string) => {
    setSecciones((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, items: (s.items ?? []).filter((item) => item.id !== itemId) };
      }),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const colors = paletaActiva?.colores ?? ic.tema.colores;
      const payload: Record<string, unknown> = {
        tema: {
          colores: colors,
          fuentes,
          paletas,
          paletaActivaId,
        },
        diseno: {
          separador,
          secciones,
        },
        historia,
        timeline,
        logo: logoUrl,
      };

      const res = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Error al guardar");
      }
      showMsg("ok", "Diseno guardado. Refresca la web publica para verlo aplicado.");
    } catch (e) {
      showMsg("error", e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Restaurar todos los valores al diseno original? Esta accion no se puede deshacer.")) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/${inviteCode}/config/reset`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      showMsg("ok", "Valores restaurados. Recarga para ver el diseno original.");
    } catch (e) {
      showMsg("error", e instanceof Error ? e.message : "Error");
    } finally {
      setResetting(false);
    }
  };

  const updateH = (id: string, f: keyof EventoHistoria, v: EventoHistoria[keyof EventoHistoria]) =>
    setHistoria((p) => p.map((e) => (e.id === id ? { ...e, [f]: v } : e)));

  const addH = () => {
    const e: EventoHistoria = { id: uid(), fecha: "", titulo: "", descripcion: "", lado: "derecha" };
    setHistoria((p) => [...p, e]);
    setEditandoH(e.id);
  };

  const updateT = (id: string, f: keyof (EventoTimeline & { enlaceMaps?: string }), v: string) =>
    setTimeline((p) => p.map((e) => (e.id === id ? { ...e, [f]: v } : e)));

  useEffect(() => {
    const loadResources = async () => {
      setLoadingResources(true);
      try {
        const res = await fetch(`/api/admin/${inviteCode}/resources`);
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudieron cargar los recursos");
        setResources(
          Array.isArray((data as { resources?: unknown[] }).resources)
            ? (data as { resources: ResourceItem[] }).resources
            : [],
        );
      } catch (error) {
        showMsg("error", error instanceof Error ? error.message : "Error cargando recursos");
      } finally {
        setLoadingResources(false);
      }
    };
    void loadResources();
  }, [inviteCode]);

  const uploadHistoriaImage = async (historiaId: string, file: File) => {
    setUploadingHistoriaId(historiaId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("section", "historia");
      const res = await fetch(`/api/admin/${inviteCode}/resources`, {
        method: "POST",
        body: fd,
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "No se pudo subir la imagen");
      }
      const resource = (data as { resource?: ResourceItem }).resource;
      if (!resource?.url_publica) {
        throw new Error("La subida no devolvio una URL publica");
      }
      updateH(historiaId, "imagen", resource.url_publica);
      setResources((prev) => [resource, ...prev]);
      showMsg("ok", "Imagen subida a Drive y enlazada en historia");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al subir imagen");
    } finally {
      setUploadingHistoriaId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Diseno de la web</h1>
          <p className="mt-1 text-sm text-stone-500">Edita y previsualiza cambios en tiempo real. Se publican al guardar.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            {resetting ? "Restaurando..." : "Restaurar valores por defecto"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-amber-800"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            msg.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 border-b border-stone-200">
        {(["diseno", "historia", "timeline"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-amber-700 text-amber-700" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {({ diseno: "Diseno", historia: "Historia", timeline: "El gran dia" } as Record<Tab, string>)[t]}
          </button>
        ))}
      </div>

      {tab === "diseno" && (
        <div className="grid gap-6 lg:grid-cols-[370px_1fr]">
          <aside className="space-y-4 max-h-[78vh] overflow-auto pr-1">
            <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-700">Panel de paletas</h2>
                <div className="flex gap-1">
                  <button onClick={addPalette} className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600">+ Anadir</button>
                  <button onClick={clonePalette} disabled={!paletaEditando} className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600 disabled:opacity-50">Clonar</button>
                  <button onClick={removePalette} disabled={!paletaEditando} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 disabled:opacity-50">Eliminar</button>
                </div>
              </div>

              <label className="label-field">Paleta</label>
              <select className="input-field" value={paletaEditando?.id ?? ""} onChange={(e) => setPaletaEditandoId(e.target.value)}>
                {paletas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}{p.id === paletaActivaId ? " (activa)" : ""}
                  </option>
                ))}
              </select>

              <label className="label-field">Nombre de paleta</label>
              <input
                className="input-field"
                value={paletaEditando?.nombre ?? ""}
                onChange={(e) => {
                  if (!paletaEditando) return;
                  updatePaleta(paletaEditando.id, (p) => ({ ...p, nombre: e.target.value }));
                }}
              />

              <button
                onClick={() => paletaEditando && setPaletaActivaId(paletaEditando.id)}
                disabled={!paletaEditando || paletaEditando.id === paletaActivaId}
                className="w-full rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Activar esta paleta
              </button>

              <div className="space-y-3">
                {CORE_COLOR_KEYS.map((key) => (
                  <div key={key} className="rounded-xl border border-stone-100 p-3 bg-stone-50">
                    <label className="label-field">Nombre del color</label>
                    <input
                      className="input-field"
                      value={paletaEditando?.etiquetasColores?.[key] ?? DEFAULT_COLOR_LABELS[key]}
                      onChange={(e) => {
                        if (!paletaEditando) return;
                        updatePaleta(paletaEditando.id, (p) => ({
                          ...p,
                          etiquetasColores: {
                            ...DEFAULT_COLOR_LABELS,
                            ...(p.etiquetasColores ?? {}),
                            [key]: e.target.value,
                          },
                        }));
                      }}
                    />
                    <label className="label-field mt-2">Valor</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={paletaEditando?.colores[key] ?? "#000000"}
                        onChange={(e) => {
                          if (!paletaEditando) return;
                          updatePaleta(paletaEditando.id, (p) => ({
                            ...p,
                            colores: { ...p.colores, [key]: e.target.value },
                          }));
                        }}
                        className="h-10 w-12 rounded-md border border-stone-200"
                      />
                      <input
                        className="input-field"
                        value={paletaEditando?.colores[key] ?? ""}
                        onChange={(e) => {
                          if (!paletaEditando) return;
                          updatePaleta(paletaEditando.id, (p) => ({
                            ...p,
                            colores: { ...p.colores, [key]: e.target.value },
                          }));
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-stone-600">Colores extra</p>
                  <button onClick={addExtraColor} className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600">+ Color</button>
                </div>

                {(paletaEditando?.coloresExtra ?? []).map((extra: TemaColorExtra) => (
                  <div key={extra.id} className="rounded-xl border border-stone-100 p-3 bg-stone-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-stone-600">Color extra</p>
                      <button onClick={() => removeExtraColor(extra.id)} className="text-xs text-red-500">Eliminar</button>
                    </div>
                    <label className="label-field">Nombre</label>
                    <input
                      className="input-field"
                      value={extra.nombre}
                      onChange={(e) => {
                        if (!paletaEditando) return;
                        updatePaleta(paletaEditando.id, (p) => ({
                          ...p,
                          coloresExtra: (p.coloresExtra ?? []).map((c) => (c.id === extra.id ? { ...c, nombre: e.target.value } : c)),
                        }));
                      }}
                    />
                    <label className="label-field mt-2">Valor</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={extra.valor}
                        onChange={(e) => {
                          if (!paletaEditando) return;
                          updatePaleta(paletaEditando.id, (p) => ({
                            ...p,
                            coloresExtra: (p.coloresExtra ?? []).map((c) => (c.id === extra.id ? { ...c, valor: e.target.value } : c)),
                          }));
                        }}
                        className="h-10 w-12 rounded-md border border-stone-200"
                      />
                      <input
                        className="input-field"
                        value={extra.valor}
                        onChange={(e) => {
                          if (!paletaEditando) return;
                          updatePaleta(paletaEditando.id, (p) => ({
                            ...p,
                            coloresExtra: (p.coloresExtra ?? []).map((c) => (c.id === extra.id ? { ...c, valor: e.target.value } : c)),
                          }));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-stone-700">Panel de separador/transicion</h2>
              <div>
                <label className="label-field">Modo de transicion</label>
                <select
                  className="input-field"
                  value={separador.modo}
                  onChange={(e) => setSeparador((prev) => ({ ...prev, modo: e.target.value as SeparadorDiseno["modo"] }))}
                >
                  <option value="sin_transicion">Sin transicion</option>
                  <option value="suave">Suave</option>
                  <option value="onda">Onda</option>
                  <option value="corte">Corte marcado</option>
                </select>
              </div>
              <div>
                <label className="label-field">Grafico separador</label>
                <select
                  className="input-field"
                  value={separador.grafico}
                  onChange={(e) => setSeparador((prev) => ({ ...prev, grafico: e.target.value as SeparadorDiseno["grafico"] }))}
                >
                  <option value="ornamento">Ornamento</option>
                  <option value="linea_doble">Linea doble</option>
                  <option value="onda_fina">Onda fina</option>
                  <option value="puntos">Puntos</option>
                </select>
              </div>
              <div className="rounded-xl border border-stone-200 p-3 text-xs text-stone-500">
                Vista previa: {separador.modo.replace("_", " ")} + {separador.grafico.replace("_", " ")}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-700">Panel de secciones</h2>
                <button onClick={addSection} className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600">+ Anadir</button>
              </div>

              <div className="space-y-3">
                {secciones.map((sec, idx) => (
                  <article
                    key={sec.id}
                    draggable
                    onDragStart={() => setDragSectionId(sec.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragSectionId) reorderSections(dragSectionId, sec.id);
                      setDragSectionId(null);
                    }}
                    className="rounded-xl border border-stone-200 p-3 bg-stone-50"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-stone-700">#{idx + 1} · {sec.nombre || "Seccion"}</p>
                      <div className="flex gap-1">
                        <button onClick={() => moveSection(sec.id, -1)} className="rounded border border-stone-300 px-2 py-0.5 text-xs">↑</button>
                        <button onClick={() => moveSection(sec.id, 1)} className="rounded border border-stone-300 px-2 py-0.5 text-xs">↓</button>
                        <button onClick={() => cloneSection(sec.id)} className="rounded border border-stone-300 px-2 py-0.5 text-xs">Clonar</button>
                        <button onClick={() => removeSection(sec.id)} className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600">Eliminar</button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div>
                        <label className="label-field">Nombre de seccion</label>
                        <input className="input-field" value={sec.nombre} onChange={(e) => updateSection(sec.id, { nombre: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Titulo</label>
                        <input className="input-field" value={sec.titulo} onChange={(e) => updateSection(sec.id, { titulo: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-field">Paleta</label>
                        <select className="input-field" value={sec.paletaId} onChange={(e) => updateSection(sec.id, { paletaId: e.target.value })}>
                          {paletas.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Tipo de seccion</label>
                        <select
                          className="input-field"
                          value={sec.tipo}
                          onChange={(e) => updateSection(sec.id, { tipo: e.target.value as TipoSeccionDiseno })}
                        >
                          {SECTION_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs text-stone-600">
                        <input
                          type="checkbox"
                          checked={sec.visible}
                          onChange={(e) => updateSection(sec.id, { visible: e.target.checked })}
                        />
                        Visible en general
                      </label>

                      <div>
                        <label className="label-field">Visible para perfiles</label>
                        <div className="grid grid-cols-2 gap-1">
                          {PROFILE_OPTIONS.map((role) => (
                            <label key={role} className="inline-flex items-center gap-2 text-xs text-stone-600">
                              <input
                                type="checkbox"
                                checked={(sec.perfiles ?? []).includes(role)}
                                onChange={(e) => {
                                  const current = sec.perfiles ?? [];
                                  const next = e.target.checked
                                    ? [...current, role]
                                    : current.filter((r) => r !== role);
                                  updateSection(sec.id, { perfiles: next });
                                }}
                              />
                              {role}
                            </label>
                          ))}
                        </div>
                      </div>

                      {(sec.tipo === "historia" || sec.tipo === "timeline") && (
                        <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-stone-600">Entradas</p>
                            <button onClick={() => addSectionItem(sec.id, sec.tipo)} className="rounded border border-stone-300 px-2 py-0.5 text-xs">+ Entrada</button>
                          </div>
                          {(sec.items ?? []).map((item) => (
                            <div key={item.id} className="rounded border border-stone-200 p-2 space-y-1">
                              <input className="input-field" value={item.titulo} onChange={(e) => updateSectionItem(sec.id, item.id, { titulo: e.target.value })} placeholder="Titulo" />
                              <input className="input-field" value={item.descripcion} onChange={(e) => updateSectionItem(sec.id, item.id, { descripcion: e.target.value })} placeholder="Descripcion" />
                              {sec.tipo === "timeline" && (
                                <input className="input-field" value={item.hora ?? ""} onChange={(e) => updateSectionItem(sec.id, item.id, { hora: e.target.value })} placeholder="Hora" />
                              )}
                              <button onClick={() => removeSectionItem(sec.id, item.id)} className="text-xs text-red-500">Eliminar entrada</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </aside>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-stone-700">Previsualizacion en tiempo real</h2>
                <p className="text-xs text-stone-500">Los cambios se ven aqui al instante. Se publican al pulsar Guardar.</p>
              </div>
              <div className="flex items-center gap-2">
                <select className="input-field w-[170px]" value={previewRole} onChange={(e) => setPreviewRole(e.target.value)}>
                  {PROFILE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <button onClick={handleSave} disabled={saving} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Aplicando..." : "Aplicar y guardar"}
                </button>
              </div>
            </div>

            <div
              className="min-h-[560px] rounded-xl border p-4"
              style={{
                backgroundColor: paletaActiva?.colores.cream ?? "#F7F3EC",
                borderColor: paletaActiva?.colores.bronzeLight ?? "#C4964A",
                color: paletaActiva?.colores.brownDark ?? "#2E1F0E",
              }}
            >
              <header className="mb-4 rounded-xl border p-4" style={{ backgroundColor: paletaActiva?.colores.white, borderColor: paletaActiva?.colores.bronze }}>
                <p className="text-xs uppercase tracking-widest" style={{ color: paletaActiva?.colores.oliveMuted }}>
                  Preview rol: {previewRole}
                </p>
                <h3 className="text-3xl" style={{ fontFamily: fuentes.display }}>
                  {ic.nombreConjunto ?? `${ic.novia.nombre} & ${ic.novio.nombre}`}
                </h3>
                <p className="text-sm" style={{ color: paletaActiva?.colores.olive }}>
                  {ic.fechaFormateada}
                </p>
              </header>

              <div className="space-y-3">
                {visiblePreviewSections.map((sec) => {
                  const secPaleta = paletas.find((p) => p.id === sec.paletaId) ?? paletaActiva;
                  return (
                    <article key={sec.id} className="rounded-xl border p-4" style={{ backgroundColor: secPaleta?.colores.white, borderColor: secPaleta?.colores.bronze }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-widest" style={{ color: secPaleta?.colores.oliveMuted }}>{sec.tipo}</p>
                        {!sec.visible && <span className="text-xs text-red-500">Oculta</span>}
                      </div>
                      <h4 className="text-xl" style={{ fontFamily: fuentes.display }}>{sec.titulo || sec.nombre}</h4>
                      <p className="text-sm" style={{ color: secPaleta?.colores.olive }}>
                        Perfiles: {(sec.perfiles ?? []).join(", ") || "todos"}
                      </p>
                      {(sec.tipo === "historia" || sec.tipo === "timeline") && sec.items.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {sec.items.slice(0, 3).map((item) => (
                            <li key={item.id} className="rounded-md px-2 py-1" style={{ backgroundColor: secPaleta?.colores.cream }}>
                              {sec.tipo === "timeline" && item.hora ? `${item.hora} - ` : ""}
                              {item.titulo}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}

                {visiblePreviewSections.length === 0 && (
                  <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                    No hay secciones visibles para este perfil.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "historia" && (
        <div className="space-y-3">
          {historia.map((e) => (
            <div key={e.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  onClick={() => setEditandoH(editandoH === e.id ? null : e.id)}
                  className="flex-1 text-left text-sm font-semibold text-stone-700 hover:text-amber-700"
                >
                  {e.titulo || "(sin titulo)"} <span className="font-normal text-stone-400">{e.fecha}</span>
                  <span className="ml-2 text-stone-400">{editandoH === e.id ? "▲" : "▼"}</span>
                </button>
                <button
                  onClick={() => {
                    if (!confirm("Eliminar esta entrada de la historia?")) return;
                    setHistoria((p) => p.filter((h) => h.id !== e.id));
                  }}
                  className="ml-4 text-xs text-red-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
              {editandoH === e.id && (
                <div className="border-t border-stone-100 px-5 pb-5 pt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label-field">Titulo</label>
                    <input className="input-field" value={e.titulo} onChange={(ev) => updateH(e.id, "titulo", ev.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Fecha / periodo</label>
                    <input className="input-field" value={e.fecha} onChange={(ev) => updateH(e.id, "fecha", ev.target.value)} placeholder="Verano 2022" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Descripcion</label>
                    <textarea rows={3} className="input-field" value={e.descripcion} onChange={(ev) => updateH(e.id, "descripcion", ev.target.value)} />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="label-field">Imagen</label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        className="input-field"
                        value={e.imagen ?? ""}
                        onChange={(ev) => updateH(e.id, "imagen", ev.target.value || undefined)}
                      >
                        <option value="">Sin imagen</option>
                        {resourcesForHistoria.map((resource) => (
                          <option key={resource.id} value={resource.url_publica ?? ""}>
                            {resource.nombre}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex cursor-pointer items-center rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                        {uploadingHistoriaId === e.id ? "Subiendo..." : "Subir archivo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingHistoriaId === e.id}
                          onChange={(ev) => {
                            const file = ev.target.files?.[0];
                            if (file) {
                              void uploadHistoriaImage(e.id, file);
                            }
                            ev.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <input
                      className="input-field"
                      value={e.imagen ?? ""}
                      onChange={(ev) => updateH(e.id, "imagen", ev.target.value || undefined)}
                      placeholder="Tambien puedes pegar URL manual"
                    />
                    {loadingResources && <p className="text-xs text-stone-400">Cargando recursos de Drive...</p>}
                    {e.imagen && (
                      <img
                        src={previewSrcForAdmin(inviteCode, e.imagen)}
                        alt="Preview historia"
                        className="h-24 w-24 rounded-lg border border-stone-200 object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <label className="label-field">Lado</label>
                    <select className="input-field" value={e.lado} onChange={(ev) => updateH(e.id, "lado", ev.target.value as "izquierda" | "derecha")}>
                      <option value="derecha">Derecha</option>
                      <option value="izquierda">Izquierda</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={addH}
            className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
          >
            + Anadir entrada a la historia
          </button>
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">
            Configura los eventos del dia con hora, icono y enlace de Google Maps para indicar como llegar.
          </p>
          {timeline.map((e) => (
            <div key={e.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-stone-700">
                  {e.hora} {e.titulo || "(sin titulo)"}
                </p>
                <button
                  onClick={() => {
                    if (!confirm("Eliminar este evento del timeline?")) return;
                    setTimeline((p) => p.filter((t) => t.id !== e.id));
                  }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-field">Hora</label>
                  <input className="input-field" value={e.hora} placeholder="12:00" onChange={(ev) => updateT(e.id, "hora", ev.target.value)} />
                </div>
                <div>
                  <label className="label-field">Icono</label>
                  <select className="input-field" value={e.icono} onChange={(ev) => updateT(e.id, "icono", ev.target.value)}>
                    {ICONO_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Titulo</label>
                  <input className="input-field" value={e.titulo} onChange={(ev) => updateT(e.id, "titulo", ev.target.value)} />
                </div>
                <div>
                  <label className="label-field">Descripcion / lugar</label>
                  <input className="input-field" value={e.descripcion} onChange={(ev) => updateT(e.id, "descripcion", ev.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Enlace Google Maps (como llegar)</label>
                  <input
                    type="url"
                    className="input-field"
                    value={e.enlaceMaps ?? ""}
                    onChange={(ev) => updateT(e.id, "enlaceMaps", ev.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              setTimeline((p) => [...p, { id: uid(), hora: "", titulo: "", descripcion: "", icono: "rings", enlaceMaps: "" }])
            }
            className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
          >
            + Anadir evento al dia
          </button>
        </div>
      )}
    </div>
  );
}
