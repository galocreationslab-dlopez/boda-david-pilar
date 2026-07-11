"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EventoHistoria,
  EventoTimeline,
  SeccionDiseno,
  TemaColorRole,
  TipoSeccionDiseno,
  WeddingConfig,
} from "@/config/wedding.config";

type ResourceItem = {
  id: string;
  nombre: string;
  url_publica: string | null;
  mime_type: string | null;
  subido_por: string | null;
  created_at: string;
};

const ICONO_OPTIONS: EventoTimeline["icono"][] = ["rings", "cocktail", "fork", "cake", "music", "car", "iglesia", "finca"];
const PROFILE_OPTIONS = ["publico", "familia", "amigos", "vip", "admin"] as const;
const SECTION_TYPES: Array<{ value: TipoSeccionDiseno; label: string }> = [
  { value: "portada", label: "Portada" },
  { value: "historia", label: "Historia" },
  { value: "timeline", label: "Timeline" },
  { value: "galeria", label: "Galeria" },
];

function uid() {
  return Math.random().toString(36).slice(2);
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

function getDefaultComponentRoles(tipo: TipoSeccionDiseno): Partial<Record<string, TemaColorRole>> {
  if (tipo === "portada") {
    return {
      "portada.fondo": "fondoSeccion",
      "portada.logo": "logo",
      "portada.nombres": "titulo",
      "portada.separador": "nexosTransicionesBordes",
      "portada.fecha": "textoSecundario",
      "portada.bienvenida": "textoPrincipal",
      "portada.faltan": "textoSecundario",
      "portada.cuentaAtras": "titulo",
      "portada.cuentaAtrasLeyendas": "textoSecundario",
      "portada.ctaFondo": "fondoBoton",
      "portada.ctaTexto": "textoBoton",
    };
  }
  if (tipo === "historia") {
    return {
      "historia.tituloSeccion": "tituloSeccion",
      "historia.tituloInterno": "titulo",
      "historia.fondoSeccion": "fondoSeccion",
      "historia.card": "fondoSubseccion",
      "historia.imagen": "bordes",
      "historia.fecha": "textoBoton",
      "historia.titulo": "textoPrincipal",
      "historia.descripcion": "textoSecundario",
      "historia.navegacion": "textoBoton",
    };
  }
  if (tipo === "timeline") {
    return {
      "timeline.tituloSeccion": "tituloSeccion",
      "timeline.fondoSeccion": "fondoSeccion",
      "timeline.card": "fondoSubseccion",
      "timeline.icono": "logo",
      "timeline.hora": "textoBoton",
      "timeline.titulo": "textoPrincipal",
      "timeline.descripcion": "textoSecundario",
      "timeline.mapa": "bordes",
    };
  }
  return {
    "galeria.tituloSeccion": "tituloSeccion",
    "galeria.fondoSeccion": "fondoSeccion",
    "galeria.card": "fondoSubseccion",
    "galeria.imagen": "bordes",
    "galeria.titulo": "textoPrincipal",
    "galeria.subtitulo": "textoSecundario",
  };
}

function sectionTitleByType(tipo: TipoSeccionDiseno): string {
  if (tipo === "portada") return "Invitacion";
  if (tipo === "historia") return "Nuestra historia";
  if (tipo === "timeline") return "El gran dia";
  return "Galeria";
}

function sectionNameByType(tipo: TipoSeccionDiseno): string {
  if (tipo === "portada") return "Portada";
  if (tipo === "historia") return "Historia";
  if (tipo === "timeline") return "Timeline";
  return "Galeria";
}

function mapHistoriaToItems(historia: EventoHistoria[]) {
  return historia.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    descripcion: item.descripcion,
    hora: item.fecha,
    imagen: item.imagen,
  }));
}

function mapTimelineToItems(timeline: EventoTimeline[]) {
  return timeline.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    descripcion: item.descripcion,
    hora: item.hora,
    icono: item.icono,
    enlaceMaps: "",
  }));
}

function buildInitialSections(config: WeddingConfig): SeccionDiseno[] {
  const paletaId = config.tema.paletaActivaId ?? config.tema.paletas?.[0]?.id ?? "";
  const fallback: SeccionDiseno[] = [
    {
      id: `sec-${uid()}`,
      nombre: "Portada",
      titulo: "Invitacion",
      tipo: "portada",
      paletaId,
      usarPaletaGlobal: true,
      visible: true,
      perfiles: ["publico"],
      componentRoles: getDefaultComponentRoles("portada"),
      items: [
        {
          id: `item-${uid()}`,
          titulo: "Bienvenida",
          descripcion: config.textos.bienvenida,
        },
      ],
    },
    {
      id: `sec-${uid()}`,
      nombre: "Historia",
      titulo: "Nuestra historia",
      tipo: "historia",
      paletaId,
      usarPaletaGlobal: true,
      visible: true,
      perfiles: ["publico"],
      componentRoles: getDefaultComponentRoles("historia"),
      items: mapHistoriaToItems(config.historia),
      subtituloInterno: "El camino hasta aqui",
    },
    {
      id: `sec-${uid()}`,
      nombre: "Timeline",
      titulo: "El gran dia",
      tipo: "timeline",
      paletaId,
      usarPaletaGlobal: true,
      visible: true,
      perfiles: ["publico"],
      componentRoles: getDefaultComponentRoles("timeline"),
      items: mapTimelineToItems(config.timeline),
    },
    {
      id: `sec-${uid()}`,
      nombre: "Galeria",
      titulo: "Momentos",
      tipo: "galeria",
      paletaId,
      usarPaletaGlobal: true,
      visible: true,
      perfiles: ["publico"],
      componentRoles: getDefaultComponentRoles("galeria"),
      items: [],
      galeriaConfig: {
        mostrarSeleccionNovios: true,
        mostrarSubidasPorMi: true,
      },
    },
  ];

  if (!Array.isArray(config.diseno?.secciones) || config.diseno.secciones.length === 0) {
    return fallback;
  }

  return config.diseno.secciones.map((section) => {
    const baseItems = section.items ?? [];
    const hasItems = baseItems.length > 0;

    return {
      ...section,
      nombre: section.nombre || sectionNameByType(section.tipo),
      titulo: section.titulo || sectionTitleByType(section.tipo),
      paletaId: section.paletaId || paletaId,
      usarPaletaGlobal: section.usarPaletaGlobal ?? true,
      visible: section.visible ?? true,
      perfiles: section.perfiles?.length ? section.perfiles : ["publico"],
      componentRoles: {
        ...getDefaultComponentRoles(section.tipo),
        ...(section.componentRoles ?? {}),
      },
      items:
        hasItems
          ? baseItems
          : section.tipo === "portada"
            ? [{ id: `item-${uid()}`, titulo: "Bienvenida", descripcion: config.textos.bienvenida }]
            : section.tipo === "historia"
              ? mapHistoriaToItems(config.historia)
              : section.tipo === "timeline"
                ? mapTimelineToItems(config.timeline)
                : [],
      galeriaConfig: {
        mostrarSeleccionNovios: section.galeriaConfig?.mostrarSeleccionNovios ?? true,
        mostrarSubidasPorMi: section.galeriaConfig?.mostrarSubidasPorMi ?? true,
      },
    };
  });
}

function mapHistoriaItemsToConfig(items: SeccionDiseno["items"]): EventoHistoria[] {
  return items.map((item, index) => ({
    id: item.id,
    fecha: item.hora || `Momento ${index + 1}`,
    titulo: item.titulo || "",
    descripcion: item.descripcion || "",
    imagen: item.imagen,
    lado: index % 2 === 0 ? "derecha" : "izquierda",
  }));
}

function mapTimelineItemsToConfig(items: SeccionDiseno["items"]): EventoTimeline[] {
  return items.map((item) => ({
    id: item.id,
    hora: item.hora || "",
    titulo: item.titulo || "",
    descripcion: item.descripcion || "",
    icono: (item.icono as EventoTimeline["icono"]) || "rings",
  }));
}

export default function ContenidoView({ inviteCode, config }: { inviteCode: string; config: WeddingConfig }) {
  const initialSections = useMemo(() => buildInitialSections(config), [config]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [sections, setSections] = useState<SeccionDiseno[]>(initialSections);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSections[0]?.id ?? "");
  const [newSectionType, setNewSectionType] = useState<TipoSeccionDiseno>("historia");
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploadingHistoriaId, setUploadingHistoriaId] = useState<string | null>(null);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0],
    [sections, selectedSectionId],
  );

  const resourcesForHistoria = useMemo(
    () => resources.filter((item) => item.mime_type?.startsWith("image/") || item.mime_type === null),
    [resources],
  );

  const showMsg = (type: "ok" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  useEffect(() => {
    const loadResources = async () => {
      setLoadingResources(true);
      try {
        const response = await fetch(`/api/admin/${inviteCode}/resources`);
        const data: unknown = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((data as { error?: string }).error ?? "No se pudieron cargar los recursos");
        }
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

  const patchSection = (sectionId: string, patch: Partial<SeccionDiseno>) => {
    setSections((prev) => prev.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)));
  };

  const patchSelectedItems = (updater: (items: SeccionDiseno["items"]) => SeccionDiseno["items"]) => {
    if (!selectedSection) return;
    patchSection(selectedSection.id, { items: updater(selectedSection.items ?? []) });
  };

  const addSection = () => {
    const section: SeccionDiseno = {
      id: `sec-${uid()}`,
      nombre: sectionNameByType(newSectionType),
      titulo: sectionTitleByType(newSectionType),
      tipo: newSectionType,
      paletaId: selectedSection?.paletaId ?? config.tema.paletaActivaId ?? config.tema.paletas?.[0]?.id ?? "",
      usarPaletaGlobal: true,
      visible: true,
      perfiles: ["publico"],
      componentRoles: getDefaultComponentRoles(newSectionType),
      items:
        newSectionType === "portada"
          ? [{ id: `item-${uid()}`, titulo: "Bienvenida", descripcion: config.textos.bienvenida }]
          : [],
      galeriaConfig: {
        mostrarSeleccionNovios: true,
        mostrarSubidasPorMi: true,
      },
    };
    setSections((prev) => [...prev, section]);
    setSelectedSectionId(section.id);
  };

  const duplicateSection = (sectionId: string) => {
    const source = sections.find((section) => section.id === sectionId);
    if (!source) return;
    const clone: SeccionDiseno = {
      ...source,
      id: `sec-${uid()}`,
      nombre: `${source.nombre} copia`,
      items: source.items.map((item) => ({ ...item, id: `item-${uid()}` })),
    };
    setSections((prev) => [...prev, clone]);
    setSelectedSectionId(clone.id);
  };

  const removeSection = (sectionId: string) => {
    if (!confirm("Eliminar esta seccion?")) return;
    setSections((prev) => {
      const next = prev.filter((section) => section.id !== sectionId);
      setSelectedSectionId(next[0]?.id ?? "");
      return next;
    });
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.id === sectionId);
      if (index < 0) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const updateHistoriaItem = (itemId: string, field: "titulo" | "descripcion" | "hora" | "imagen", value: string) => {
    patchSelectedItems((items) => items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
  };

  const updateTimelineItem = (itemId: string, field: "hora" | "titulo" | "descripcion" | "icono" | "enlaceMaps", value: string) => {
    patchSelectedItems((items) => items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
  };

  const uploadHistoriaImage = async (itemId: string, file: File) => {
    setUploadingHistoriaId(itemId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("section", "historia");
      const response = await fetch(`/api/admin/${inviteCode}/resources`, {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "No se pudo subir la imagen");
      }
      const resource = (data as { resource?: ResourceItem }).resource;
      if (!resource?.url_publica) {
        throw new Error("La subida no devolvio una URL publica");
      }
      updateHistoriaItem(itemId, "imagen", resource.url_publica);
      setResources((prev) => [resource, ...prev]);
      showMsg("ok", "Imagen subida y asociada a la historia");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al subir imagen");
    } finally {
      setUploadingHistoriaId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const firstPortada = sections.find((section) => section.tipo === "portada");
      const firstHistoria = sections.find((section) => section.tipo === "historia");
      const firstTimeline = sections.find((section) => section.tipo === "timeline");

      const bienvenida = firstPortada?.items?.[0]?.descripcion ?? config.textos.bienvenida;
      const historia = firstHistoria ? mapHistoriaItemsToConfig(firstHistoria.items) : config.historia;
      const timeline = firstTimeline ? mapTimelineItemsToConfig(firstTimeline.items) : config.timeline;

      const response = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diseno: {
            ...(config.diseno ?? {}),
            secciones: sections,
          },
          historia,
          timeline,
          textos: {
            ...config.textos,
            bienvenida,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Error al guardar");
      }

      showMsg("ok", "Estructura y contenido guardados");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Contenido / Estructura</h1>
          <p className="mt-1 text-sm text-stone-500">
            Define orden, tipo, permisos y contenido de cada seccion. El panel de Diseno queda solo para estilo visual.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-amber-800"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
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

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4 self-start lg:sticky lg:top-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold text-stone-700">Estructura</h2>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select className="input-field" value={newSectionType} onChange={(e) => setNewSectionType(e.target.value as TipoSeccionDiseno)}>
                {SECTION_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button onClick={addSection} className="rounded-xl border border-stone-300 px-3 text-sm text-stone-700 hover:bg-stone-50">
                + Anadir
              </button>
            </div>

            <div className="space-y-2">
              {sections.map((section, index) => (
                <article
                  key={section.id}
                  className={`rounded-xl border p-3 ${selectedSection?.id === section.id ? "border-amber-400 bg-amber-50/50" : "border-stone-200 bg-stone-50"}`}
                >
                  <button onClick={() => setSelectedSectionId(section.id)} className="w-full text-left">
                    <p className="text-xs font-semibold text-stone-800">{section.nombre || sectionNameByType(section.tipo)}</p>
                    <p className="text-[11px] text-stone-500">{section.titulo || sectionTitleByType(section.tipo)} · {section.tipo}</p>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button onClick={() => moveSection(section.id, "up")} disabled={index === 0} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40">↑</button>
                    <button onClick={() => moveSection(section.id, "down")} disabled={index === sections.length - 1} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40">↓</button>
                    <button onClick={() => duplicateSection(section.id)} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px]">Clonar</button>
                    <button onClick={() => removeSection(section.id)} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-600">Eliminar</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
          {!selectedSection ? (
            <p className="text-sm text-stone-500">No hay secciones configuradas.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-field">Nombre interno</label>
                  <input className="input-field" value={selectedSection.nombre} onChange={(e) => patchSection(selectedSection.id, { nombre: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Titulo visible</label>
                  <input className="input-field" value={selectedSection.titulo} onChange={(e) => patchSection(selectedSection.id, { titulo: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Tipo</label>
                  <select
                    className="input-field"
                    value={selectedSection.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value as TipoSeccionDiseno;
                      patchSection(selectedSection.id, {
                        tipo,
                        componentRoles: getDefaultComponentRoles(tipo),
                        nombre: sectionNameByType(tipo),
                        titulo: sectionTitleByType(tipo),
                        items:
                          tipo === "portada"
                            ? [{ id: `item-${uid()}`, titulo: "Bienvenida", descripcion: config.textos.bienvenida }]
                            : [],
                      });
                    }}
                  >
                    {SECTION_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={selectedSection.visible}
                      onChange={(e) => patchSection(selectedSection.id, { visible: e.target.checked })}
                    />
                    Seccion visible
                  </label>
                </div>
              </div>

              <div>
                <p className="label-field">Permisos de visibilidad</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PROFILE_OPTIONS.map((profile) => {
                    const perfiles = selectedSection.perfiles ?? [];
                    const checked = perfiles.includes(profile);
                    return (
                      <label key={profile} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...perfiles, profile]
                              : perfiles.filter((item) => item !== profile);
                            patchSection(selectedSection.id, { perfiles: next });
                          }}
                        />
                        <span className="capitalize">{profile}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  Los permisos se gestionan en Contenido/Estructura para mantener en Diseno un enfoque puramente estetico.
                </p>
              </div>

              {selectedSection.tipo === "portada" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-700">Contenido de portada</h3>
                  <div>
                    <label className="label-field">Texto de bienvenida</label>
                    <textarea
                      rows={4}
                      className="input-field"
                      value={selectedSection.items?.[0]?.descripcion ?? ""}
                      onChange={(e) => {
                        const first = selectedSection.items?.[0] ?? { id: `item-${uid()}`, titulo: "Bienvenida", descripcion: "" };
                        patchSection(selectedSection.id, { items: [{ ...first, descripcion: e.target.value }, ...selectedSection.items.slice(1)] });
                      }}
                    />
                  </div>
                </div>
              )}

              {selectedSection.tipo === "historia" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-700">Historia</h3>
                  {selectedSection.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-stone-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-stone-700">{item.titulo || "(sin titulo)"}</p>
                        <button
                          onClick={() => patchSelectedItems((items) => items.filter((current) => current.id !== item.id))}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label-field">Titulo</label>
                          <input className="input-field" value={item.titulo} onChange={(e) => updateHistoriaItem(item.id, "titulo", e.target.value)} />
                        </div>
                        <div>
                          <label className="label-field">Fecha / periodo</label>
                          <input className="input-field" value={item.hora ?? ""} onChange={(e) => updateHistoriaItem(item.id, "hora", e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label-field">Descripcion</label>
                          <textarea rows={3} className="input-field" value={item.descripcion} onChange={(e) => updateHistoriaItem(item.id, "descripcion", e.target.value)} />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <label className="label-field">Imagen</label>
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <select
                              className="input-field"
                              value={item.imagen ?? ""}
                              onChange={(e) => updateHistoriaItem(item.id, "imagen", e.target.value)}
                            >
                              <option value="">Sin imagen</option>
                              {resourcesForHistoria.map((resource) => (
                                <option key={resource.id} value={resource.url_publica ?? ""}>
                                  {resource.nombre}
                                </option>
                              ))}
                            </select>
                            <label className="inline-flex cursor-pointer items-center rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                              {uploadingHistoriaId === item.id ? "Subiendo..." : "Subir archivo"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingHistoriaId === item.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    void uploadHistoriaImage(item.id, file);
                                  }
                                  e.currentTarget.value = "";
                                }}
                              />
                            </label>
                          </div>
                          <input
                            className="input-field"
                            value={item.imagen ?? ""}
                            onChange={(e) => updateHistoriaItem(item.id, "imagen", e.target.value)}
                            placeholder="Tambien puedes pegar URL manual"
                          />
                          {loadingResources && <p className="text-xs text-stone-400">Cargando recursos de Drive...</p>}
                          {item.imagen && (
                            <img
                              src={previewSrcForAdmin(inviteCode, item.imagen)}
                              alt="Preview historia"
                              className="h-24 w-24 rounded-lg border border-stone-200 object-cover"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => patchSelectedItems((items) => [...items, { id: `item-${uid()}`, titulo: "", descripcion: "", hora: "", imagen: "" }])}
                    className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-3 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600"
                  >
                    + Anadir entrada
                  </button>
                </div>
              )}

              {selectedSection.tipo === "timeline" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-700">Timeline</h3>
                  {selectedSection.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-stone-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-stone-700">{item.hora || "--:--"} {item.titulo || "(sin titulo)"}</p>
                        <button
                          onClick={() => patchSelectedItems((items) => items.filter((current) => current.id !== item.id))}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label-field">Hora</label>
                          <input className="input-field" value={item.hora ?? ""} onChange={(e) => updateTimelineItem(item.id, "hora", e.target.value)} />
                        </div>
                        <div>
                          <label className="label-field">Icono</label>
                          <select className="input-field" value={item.icono ?? "rings"} onChange={(e) => updateTimelineItem(item.id, "icono", e.target.value)}>
                            {ICONO_OPTIONS.map((icono) => (
                              <option key={icono} value={icono}>{icono}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label-field">Titulo</label>
                          <input className="input-field" value={item.titulo} onChange={(e) => updateTimelineItem(item.id, "titulo", e.target.value)} />
                        </div>
                        <div>
                          <label className="label-field">Descripcion / lugar</label>
                          <input className="input-field" value={item.descripcion} onChange={(e) => updateTimelineItem(item.id, "descripcion", e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label-field">Enlace Google Maps</label>
                          <input className="input-field" value={item.enlaceMaps ?? ""} onChange={(e) => updateTimelineItem(item.id, "enlaceMaps", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => patchSelectedItems((items) => [...items, { id: `item-${uid()}`, titulo: "", descripcion: "", hora: "", icono: "rings", enlaceMaps: "" }])}
                    className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-3 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600"
                  >
                    + Anadir evento
                  </button>
                </div>
              )}

              {selectedSection.tipo === "galeria" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-700">Galeria</h3>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                    <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={selectedSection.galeriaConfig?.mostrarSeleccionNovios ?? true}
                        onChange={(e) =>
                          patchSection(selectedSection.id, {
                            galeriaConfig: {
                              mostrarSeleccionNovios: e.target.checked,
                              mostrarSubidasPorMi: selectedSection.galeriaConfig?.mostrarSubidasPorMi ?? true,
                            },
                          })
                        }
                      />
                      Mostrar seleccion de los novios
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={selectedSection.galeriaConfig?.mostrarSubidasPorMi ?? true}
                        onChange={(e) =>
                          patchSection(selectedSection.id, {
                            galeriaConfig: {
                              mostrarSeleccionNovios: selectedSection.galeriaConfig?.mostrarSeleccionNovios ?? true,
                              mostrarSubidasPorMi: e.target.checked,
                            },
                          })
                        }
                      />
                      Mostrar subidas por mi
                    </label>

                    <p className="text-xs text-stone-500">
                      Las subidas de invitados se mantienen privadas por invitacion. La publicacion global se sigue controlando desde featured/visible_public.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
