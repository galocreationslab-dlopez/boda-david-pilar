"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MainWithInvite from "@/components/wedding/MainWithInvite";
import { SeccionColapsable } from "@/components/wedding/SeccionColapsable";
import { SeccionHistoria } from "@/components/wedding/SeccionHistoria";
import { SeccionTimeline } from "@/components/wedding/SeccionTimeline";
import { SeccionGaleria } from "@/components/wedding/SeccionGaleria";
import { OrnamentoDivisor, SeparadorSeccion } from "@/components/ui/OrnamentoDivisor";
import type { PublicGalleryMedia } from "@/lib/wedding-gallery-server";
import type {
  WeddingConfig,
  EventoHistoria,
  EventoTimeline,
  TemaColores,
  TemaPaleta,
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

function buildPreviewSeparator(separador: SeparadorDiseno) {
  if (separador.modo === "sin_transicion") return null;

  if (separador.grafico === "ornamento") {
    return <OrnamentoDivisor className="my-2" />;
  }

  if (separador.grafico === "linea_doble") {
    return (
      <div className="px-4 py-2">
        <div className="h-px" style={{ backgroundColor: "var(--bronze-pale)" }} />
        <div className="mt-1 h-px" style={{ backgroundColor: "var(--bronze-light)" }} />
      </div>
    );
  }

  if (separador.grafico === "onda_fina") {
    return <SeparadorSeccion colorHacia="var(--cream)" />;
  }

  return (
    <div className="flex items-center justify-center gap-2 py-3" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--bronze-light)" }} />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--bronze)" }} />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--bronze-light)" }} />
    </div>
  );
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
  const [previewRole, setPreviewRole] = useState<string>("publico");
  const [previewOnlySelected, setPreviewOnlySelected] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    buildInitialSecciones(ic, initialPaletas[0]?.id ?? "")[0]?.id ?? "",
  );

  const [paletasCollapsed, setPaletasCollapsed] = useState(false);
  const [separadorCollapsed, setSeparadorCollapsed] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorViewport, setEditorViewport] = useState<"desktop" | "movil">("desktop");
  const [sectionDraft, setSectionDraft] = useState<SeccionDiseno | null>(null);
  const [draftSavedSnapshot, setDraftSavedSnapshot] = useState<string>("");
  const [editorToast, setEditorToast] = useState<{ type: "ok" | "info"; text: string } | null>(null);
  const sectionCardRefs = useRef<Record<string, HTMLElement | null>>({});

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

  const visibleSectionsForPreview = useMemo(() => {
    if (!previewOnlySelected) return visiblePreviewSections;
    return visiblePreviewSections.filter((section) => section.id === selectedSectionId);
  }, [previewOnlySelected, selectedSectionId, visiblePreviewSections]);

  const editorIsDirty = useMemo(() => {
    if (!sectionDraft) return false;
    return JSON.stringify(sectionDraft) !== draftSavedSnapshot;
  }, [draftSavedSnapshot, sectionDraft]);

  useEffect(() => {
    const node = sectionCardRefs.current[selectedSectionId];
    if (node) {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (!editorToast) return;
    const timer = setTimeout(() => setEditorToast(null), 2200);
    return () => clearTimeout(timer);
  }, [editorToast]);

  useEffect(() => {
    if (!editorOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
      if (isSaveShortcut) {
        event.preventDefault();
        if (sectionDraft) {
          saveCurrentSectionDraft();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeSectionEditor();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editorOpen, sectionDraft, secciones, draftSavedSnapshot]);

  const previewGalleryMedia = useMemo<PublicGalleryMedia[]>(() => {
    const fromResources = resources
      .filter((r) => r.mime_type?.startsWith("image/") && r.url_publica)
      .slice(0, 6)
      .map((r) => ({
        id: r.id,
        nombre: r.nombre,
        tipo: "foto" as const,
        google_drive_id: "",
        url_publica: r.url_publica,
        subido_por: r.subido_por,
        created_at: r.created_at,
      }));

    if (fromResources.length > 0) return fromResources;

    return historia
      .filter((h) => !!h.imagen)
      .slice(0, 6)
      .map((h) => ({
        id: h.id,
        nombre: h.titulo || "Historia",
        tipo: "foto" as const,
        google_drive_id: "",
        url_publica: h.imagen ?? null,
        subido_por: "Historia",
        created_at: new Date().toISOString(),
      }));
  }, [historia, resources]);

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
    const next = defaultSection(paletaId, "portada");
    setSecciones((prev) => [...prev, next]);
    setSelectedSectionId(next.id);
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
    setSelectedSectionId(clone.id);
  };

  const removeSection = (sectionId: string) => {
    if (!confirm("Eliminar esta seccion?")) return;
    setSecciones((prev) => {
      const next = prev.filter((s) => s.id !== sectionId);
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(next[0]?.id ?? "");
      }
      return next;
    });
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

  const openSectionEditor = (sectionId: string) => {
    const section = secciones.find((s) => s.id === sectionId);
    if (!section) return;
    setSelectedSectionId(section.id);
    setSectionDraft(structuredClone(section));
    setDraftSavedSnapshot(JSON.stringify(section));
    setEditorOpen(true);
  };

  const saveCurrentSectionDraft = () => {
    if (!sectionDraft) return;
    setSecciones((prev) => prev.map((s) => (s.id === sectionDraft.id ? sectionDraft : s)));
    setDraftSavedSnapshot(JSON.stringify(sectionDraft));
    setEditorToast({ type: "ok", text: "Sección guardada" });
    showMsg("ok", `Seccion \"${sectionDraft.nombre || sectionDraft.titulo}\" guardada.`);
  };

  const resolveUnsavedBeforeLeave = (): boolean => {
    if (!editorIsDirty) return true;
    const guardar = confirm("Hay cambios sin guardar. Aceptar = Guardar cambios. Cancelar = Descartar.");
    if (guardar) {
      saveCurrentSectionDraft();
      return true;
    }
    return confirm("Confirmar descarte de cambios de esta seccion?");
  };

  const closeSectionEditor = () => {
    if (!resolveUnsavedBeforeLeave()) return;
    setEditorOpen(false);
    setSectionDraft(null);
  };

  const navigateEditorSection = (direction: -1 | 1) => {
    if (!sectionDraft) return;
    const idx = secciones.findIndex((s) => s.id === sectionDraft.id);
    if (idx < 0) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= secciones.length) return;

    if (!resolveUnsavedBeforeLeave()) return;

    const nextSection = secciones[nextIdx];
    setSelectedSectionId(nextSection.id);
    setSectionDraft(structuredClone(nextSection));
    setDraftSavedSnapshot(JSON.stringify(nextSection));
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

  const uploadSectionItemImage = async (itemId: string, file: File) => {
    if (!sectionDraft) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("section", sectionDraft.tipo === "timeline" ? "timeline" : "historia");
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

      setSectionDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, imagen: resource.url_publica ?? undefined } : item,
          ),
        };
      });

      setResources((prev) => [resource, ...prev]);
      showMsg("ok", "Imagen subida correctamente");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al subir imagen");
    }
  };

  const getItemFilterCss = (filters: Array<"sepia" | "grayscale" | "blur"> | undefined): string => {
    if (!filters || filters.length === 0) return "none";
    return filters
      .map((filter) => {
        if (filter === "sepia") return "sepia(0.75)";
        if (filter === "grayscale") return "grayscale(1)";
        return "blur(2px)";
      })
      .join(" ");
  };

  const historyEventsForSection = (section: SeccionDiseno): EventoHistoria[] => {
    if (!section.items || section.items.length === 0) return historia;
    return section.items.map((item, index) => ({
      id: item.id,
      fecha: item.hora || `Momento ${index + 1}`,
      titulo: item.titulo,
      descripcion: item.descripcion,
      imagen: item.imagen,
      lado: index % 2 === 0 ? "derecha" : "izquierda",
    }));
  };

  const timelineEventsForSection = (section: SeccionDiseno): Array<EventoTimeline & { enlaceMaps?: string }> => {
    if (!section.items || section.items.length === 0) return timeline;
    return section.items.map((item) => ({
      id: item.id,
      hora: item.hora || "12:00",
      titulo: item.titulo,
      descripcion: item.descripcion,
      icono: (item.icono as EventoTimeline["icono"]) || "rings",
      enlaceMaps: item.enlaceMaps || "",
    }));
  };

  const galleryMediaForSection = (section: SeccionDiseno): PublicGalleryMedia[] => {
    const fromSectionItems = (section.items ?? [])
      .filter((item) => !!item.imagen)
      .map((item, index) => ({
        id: item.id,
        nombre: item.titulo || `Imagen ${index + 1}`,
        tipo: "foto" as const,
        google_drive_id: "",
        url_publica: item.imagen ?? null,
        subido_por: "Galería",
        created_at: new Date().toISOString(),
      }));

    if (fromSectionItems.length > 0) return fromSectionItems;
    return previewGalleryMedia;
  };

  const renderSectionCanvas = (section: SeccionDiseno, compact = false) => {
    const scale = compact ? 0.26 : editorViewport === "movil" ? 0.45 : 0.62;
    const width = compact ? "384%" : editorViewport === "movil" ? "222%" : "161%";

    return (
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width }} className="pointer-events-none">
          {section.tipo === "portada" && (
            <SeccionColapsable id={`canvas-${section.id}`} abiertaPorDefecto={true} ocultarCabecera={true}>
              <MainWithInvite config={ic} />
            </SeccionColapsable>
          )}
          {section.tipo === "historia" && (
            <SeccionColapsable id={`canvas-${section.id}`} titulo={section.titulo || "Nuestra historia"} abiertaPorDefecto={false} bgColor="var(--cream)">
              <SeccionHistoria eventos={historyEventsForSection(section)} />
            </SeccionColapsable>
          )}
          {section.tipo === "timeline" && (
            <SeccionColapsable id={`canvas-${section.id}`} titulo={section.titulo || "El gran día"} abiertaPorDefecto={false} bgColor="var(--cream-dark)">
              <SeccionTimeline localizaciones={ic.localizaciones} timeline={timelineEventsForSection(section)} />
            </SeccionColapsable>
          )}
          {section.tipo === "galeria" && (
            <SeccionColapsable id={`canvas-${section.id}`} titulo={section.titulo || "Galería"} abiertaPorDefecto={false} bgColor="var(--cream)">
              <SeccionGaleria media={galleryMediaForSection(section)} />
            </SeccionColapsable>
          )}
        </div>
      </div>
    );
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
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4 max-h-[78vh] overflow-auto pr-1">
            <section className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPaletasCollapsed((p) => !p)}
                  className="text-xs font-semibold uppercase tracking-wide text-stone-700"
                >
                  Paletas {paletasCollapsed ? "▸" : "▾"}
                </button>
                <div className="flex gap-1">
                  <button onClick={addPalette} className="rounded border border-stone-300 px-2 py-1 text-[11px] text-stone-700">+</button>
                  <button onClick={clonePalette} disabled={!paletaEditando} className="rounded border border-stone-300 px-2 py-1 text-[11px] text-stone-700 disabled:opacity-50">Clonar</button>
                  <button onClick={removePalette} disabled={!paletaEditando} className="rounded border border-red-200 px-2 py-1 text-[11px] text-red-600 disabled:opacity-50">-</button>
                </div>
              </div>

              {paletasCollapsed ? (
                <div className="rounded border border-stone-200 bg-stone-50 p-2">
                  <p className="text-xs font-medium text-stone-700">{paletaEditando?.nombre ?? "Sin paleta"}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {CORE_COLOR_KEYS.map((key) => (
                      <span
                        key={key}
                        className="h-4 w-4 rounded border border-stone-300"
                        style={{ backgroundColor: paletaEditando?.colores[key] ?? "#ffffff" }}
                        title={paletaEditando?.etiquetasColores?.[key] ?? DEFAULT_COLOR_LABELS[key]}
                      />
                    ))}
                    {(paletaEditando?.coloresExtra ?? []).map((extra) => (
                      <span key={extra.id} className="h-4 w-4 rounded border border-stone-300" style={{ backgroundColor: extra.valor }} title={extra.nombre} />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <select className="input-field" value={paletaEditando?.id ?? ""} onChange={(e) => setPaletaEditandoId(e.target.value)}>
                      {paletas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}{p.id === paletaActivaId ? " (activa)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => paletaEditando && setPaletaActivaId(paletaEditando.id)}
                      disabled={!paletaEditando || paletaEditando.id === paletaActivaId}
                      className="rounded border border-amber-600 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 disabled:opacity-50"
                    >
                      Activar
                    </button>
                  </div>

                  <input
                    className="input-field"
                    value={paletaEditando?.nombre ?? ""}
                    onChange={(e) => {
                      if (!paletaEditando) return;
                      updatePaleta(paletaEditando.id, (p) => ({ ...p, nombre: e.target.value }));
                    }}
                    placeholder="Nombre de paleta"
                  />

                  <div className="space-y-1">
                    {[...CORE_COLOR_KEYS.map((key) => ({
                      id: key,
                      fixed: true,
                      nombre: paletaEditando?.etiquetasColores?.[key] ?? DEFAULT_COLOR_LABELS[key],
                      valor: paletaEditando?.colores[key] ?? "#000000",
                    })), ...(paletaEditando?.coloresExtra ?? []).map((extra) => ({
                      id: extra.id,
                      fixed: false,
                      nombre: extra.nombre,
                      valor: extra.valor,
                    }))].map((row) => (
                      <div key={row.id} className="grid grid-cols-[28px_1fr_26px] items-center gap-2 rounded border border-stone-200 bg-stone-50 px-2 py-1">
                        <input
                          type="color"
                          value={row.valor}
                          onChange={(e) => {
                            if (!paletaEditando) return;
                            if (row.fixed) {
                              const key = row.id as keyof TemaColores;
                              updatePaleta(paletaEditando.id, (p) => ({ ...p, colores: { ...p.colores, [key]: e.target.value } }));
                              return;
                            }
                            updatePaleta(paletaEditando.id, (p) => ({
                              ...p,
                              coloresExtra: (p.coloresExtra ?? []).map((c) => (c.id === row.id ? { ...c, valor: e.target.value } : c)),
                            }));
                          }}
                          className="h-6 w-7 rounded border border-stone-300 bg-transparent"
                        />
                        <input
                          className="w-full border-none bg-transparent text-xs text-stone-700 outline-none"
                          value={row.nombre}
                          onChange={(e) => {
                            if (!paletaEditando) return;
                            if (row.fixed) {
                              const key = row.id as keyof TemaColores;
                              updatePaleta(paletaEditando.id, (p) => ({
                                ...p,
                                etiquetasColores: {
                                  ...DEFAULT_COLOR_LABELS,
                                  ...(p.etiquetasColores ?? {}),
                                  [key]: e.target.value,
                                },
                              }));
                              return;
                            }
                            updatePaleta(paletaEditando.id, (p) => ({
                              ...p,
                              coloresExtra: (p.coloresExtra ?? []).map((c) => (c.id === row.id ? { ...c, nombre: e.target.value } : c)),
                            }));
                          }}
                        />
                        <button
                          onClick={() => {
                            if (row.fixed) return;
                            if (!confirm("Eliminar color?")) return;
                            removeExtraColor(row.id);
                          }}
                          className="h-6 rounded border border-red-200 text-xs text-red-600 disabled:opacity-40"
                          disabled={row.fixed}
                          title={row.fixed ? "Color base" : "Eliminar"}
                        >
                          -
                        </button>
                      </div>
                    ))}
                    <button onClick={addExtraColor} className="w-full rounded border border-dashed border-stone-300 py-1 text-xs text-stone-600">+ Anadir color</button>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
              <button
                onClick={() => setSeparadorCollapsed((p) => !p)}
                className="text-left text-xs font-semibold uppercase tracking-wide text-stone-700"
              >
                Separador / Transicion {separadorCollapsed ? "▸" : "▾"}
              </button>

              {separadorCollapsed ? (
                <p className="text-xs text-stone-600">{separador.modo.replace("_", " ")} · {separador.grafico.replace("_", " ")}</p>
              ) : (
                <>
                  <div>
                    <p className="mb-1 text-[11px] text-stone-500">Modo</p>
                    <div className="grid grid-cols-2 gap-1">
                      {(["sin_transicion", "suave", "onda", "corte"] as const).map((modo) => (
                        <button
                          key={modo}
                          onClick={() => setSeparador((prev) => ({ ...prev, modo }))}
                          className={`rounded px-2 py-1 text-[11px] border ${separador.modo === modo ? "border-amber-600 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-600"}`}
                        >
                          {modo.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-stone-500">Grafico</p>
                    <div className="grid grid-cols-2 gap-1">
                      {(["ornamento", "linea_doble", "onda_fina", "puntos"] as const).map((grafico) => (
                        <button
                          key={grafico}
                          onClick={() => setSeparador((prev) => ({ ...prev, grafico }))}
                          className={`rounded px-2 py-1 text-[11px] border ${separador.grafico === grafico ? "border-amber-600 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-600"}`}
                        >
                          {grafico.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-700">Panel de secciones</h2>
                <button onClick={addSection} className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600">+ Anadir</button>
              </div>

              <div className="space-y-2">
                {secciones.map((sec, idx) => (
                  <article
                    key={sec.id}
                    ref={(node) => {
                      sectionCardRefs.current[sec.id] = node;
                    }}
                    className={`rounded-xl border p-2 ${selectedSectionId === sec.id ? "border-amber-400 bg-amber-50/40" : "border-stone-200 bg-stone-50"}`}
                    onClick={() => setSelectedSectionId(sec.id)}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-stone-700">{sec.nombre || "Seccion"}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSection(sec.id, -1)} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px]">↑</button>
                        <button onClick={() => moveSection(sec.id, 1)} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px]">↓</button>
                      </div>
                    </div>

                    <div className="relative">
                      {renderSectionCanvas(sec, true)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSectionEditor(sec.id);
                        }}
                        className="absolute right-1 top-1 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[11px]"
                        title="Editar sección"
                      >
                        ✎
                      </button>
                    </div>

                    <div className="mt-2 flex justify-end gap-1">
                      <button onClick={() => cloneSection(sec.id)} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px]">Clonar</button>
                      <button onClick={() => removeSection(sec.id)} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-600">Eliminar</button>
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
                <label className="inline-flex items-center gap-1 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={previewOnlySelected}
                    onChange={(e) => setPreviewOnlySelected(e.target.checked)}
                  />
                  Solo seccion
                </label>
                <button onClick={handleSave} disabled={saving} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Aplicando..." : "Aplicar y guardar"}
                </button>
              </div>
            </div>

            <div
              className="min-h-[560px] overflow-auto rounded-xl border"
              style={{
                backgroundColor: paletaActiva?.colores.cream ?? "#F7F3EC",
                borderColor: paletaActiva?.colores.bronzeLight ?? "#C4964A",
                color: paletaActiva?.colores.brownDark ?? "#2E1F0E",
              }}
            >
              <div
                style={{
                  // Variables CSS del preview para que renderice igual que la web real.
                  ["--bronze" as string]: paletaActiva?.colores.bronze ?? "#8C6A3F",
                  ["--bronze-light" as string]: paletaActiva?.colores.bronzeLight ?? "#C4964A",
                  ["--olive" as string]: paletaActiva?.colores.olive ?? "#5C6B3A",
                  ["--olive-muted" as string]: paletaActiva?.colores.oliveMuted ?? "#8A9468",
                  ["--cream" as string]: paletaActiva?.colores.cream ?? "#F7F3EC",
                  ["--cream-dark" as string]: "#EDE7DB",
                  ["--brown-dark" as string]: paletaActiva?.colores.brownDark ?? "#2E1F0E",
                  ["--white" as string]: paletaActiva?.colores.white ?? "#FDFAF5",
                  ["--font-display" as string]: fuentes.display,
                  ["--font-body" as string]: fuentes.body,
                }}
              >
                <main>
                  {visibleSectionsForPreview.map((sec, idx) => {
                    const isLast = idx === visibleSectionsForPreview.length - 1;
                    return (
                      <div key={sec.id}>
                        {sec.tipo === "portada" && (
                          <SeccionColapsable id={`preview-${sec.id}`} abiertaPorDefecto={true} ocultarCabecera={true}>
                            <MainWithInvite config={ic} />
                          </SeccionColapsable>
                        )}

                        {sec.tipo === "historia" && (
                          <SeccionColapsable id={`preview-${sec.id}`} titulo={sec.titulo || "Nuestra historia"} abiertaPorDefecto={false} bgColor="var(--cream)">
                            <SeccionHistoria eventos={historyEventsForSection(sec)} />
                          </SeccionColapsable>
                        )}

                        {sec.tipo === "galeria" && (
                          <SeccionColapsable id={`preview-${sec.id}`} titulo={sec.titulo || "Galería"} abiertaPorDefecto={false} bgColor="var(--cream)">
                            <SeccionGaleria media={galleryMediaForSection(sec)} />
                          </SeccionColapsable>
                        )}

                        {sec.tipo === "timeline" && (
                          <SeccionColapsable id={`preview-${sec.id}`} titulo={sec.titulo || "El gran día"} abiertaPorDefecto={false} bgColor="var(--cream-dark)">
                            <SeccionTimeline localizaciones={ic.localizaciones} timeline={timelineEventsForSection(sec)} />
                          </SeccionColapsable>
                        )}

                        {!isLast && buildPreviewSeparator(separador)}
                      </div>
                    );
                  })}

                  {visibleSectionsForPreview.length === 0 && (
                    <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                      No hay secciones visibles para este perfil.
                    </div>
                  )}
                </main>
              </div>
            </div>
          </section>
        </div>
      )}

      {editorOpen && sectionDraft && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-[1300px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <div className="flex items-center gap-2">
                <button onClick={() => navigateEditorSection(-1)} className="rounded border border-stone-300 px-2 py-1 text-xs">←</button>
                <input
                  className="rounded border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-800"
                  value={sectionDraft.titulo}
                  onChange={(e) => setSectionDraft((prev) => (prev ? { ...prev, titulo: e.target.value } : prev))}
                />
                <button onClick={() => navigateEditorSection(1)} className="rounded border border-stone-300 px-2 py-1 text-xs">→</button>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-500">Ctrl/Cmd+S</span>
                <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-500">Esc</span>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${editorIsDirty ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {editorIsDirty ? "Sin guardar" : "Guardado"}
                </span>
                <button onClick={saveCurrentSectionDraft} className="rounded bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white">Guardar sección</button>
                <button onClick={closeSectionEditor} className="rounded border border-stone-300 px-3 py-1.5 text-xs">Cerrar</button>
              </div>
            </div>

            <div className="grid max-h-[calc(92vh-70px)] gap-0 lg:grid-cols-[380px_1fr]">
              <div className="overflow-auto border-r border-stone-200 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label-field">Tipo de sección</label>
                  {sectionDraft.tipo === "galeria" && (
                    <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-stone-700">Imágenes de galería</p>
                        <button
                          onClick={() =>
                            setSectionDraft((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                items: [
                                  ...(prev.items ?? []),
                                  {
                                    id: `item-${uid()}`,
                                    titulo: "Nueva imagen",
                                    descripcion: "",
                                    imagen: "",
                                    filtrosImagen: [],
                                  },
                                ],
                              };
                            })
                          }
                          className="rounded border border-stone-300 px-2 py-1 text-xs"
                        >
                          + Imagen
                        </button>
                      </div>

                      {(sectionDraft.items ?? []).map((item) => (
                        <div key={item.id} className="space-y-1 rounded-lg border border-stone-200 bg-white p-2">
                          <input
                            className="input-field"
                            value={item.titulo}
                            onChange={(e) =>
                              setSectionDraft((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  items: prev.items.map((it) => (it.id === item.id ? { ...it, titulo: e.target.value } : it)),
                                };
                              })
                            }
                            placeholder="Título"
                          />

                          <select
                            className="input-field"
                            value={item.imagen ?? ""}
                            onChange={(e) =>
                              setSectionDraft((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  items: prev.items.map((it) =>
                                    it.id === item.id ? { ...it, imagen: e.target.value || undefined } : it,
                                  ),
                                };
                              })
                            }
                          >
                            <option value="">Selecciona de biblioteca</option>
                            {resourcesForHistoria.map((resource) => (
                              <option key={resource.id} value={resource.url_publica ?? ""}>
                                {resource.nombre}
                              </option>
                            ))}
                          </select>

                          <div className="grid grid-cols-[1fr_auto] gap-1">
                            <input
                              className="input-field"
                              value={item.imagen ?? ""}
                              onChange={(e) =>
                                setSectionDraft((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    items: prev.items.map((it) =>
                                      it.id === item.id ? { ...it, imagen: e.target.value || undefined } : it,
                                    ),
                                  };
                                })
                              }
                              placeholder="URL imagen"
                            />
                            <label className="inline-flex cursor-pointer items-center rounded border border-stone-300 px-2 text-xs">
                              Subir
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void uploadSectionItemImage(item.id, file);
                                  e.currentTarget.value = "";
                                }}
                              />
                            </label>
                          </div>

                          {item.imagen && (
                            <img
                              src={previewSrcForAdmin(inviteCode, item.imagen)}
                              alt={item.titulo || "item"}
                              className="h-24 w-full rounded object-cover"
                            />
                          )}

                          <button
                            onClick={() =>
                              setSectionDraft((prev) => {
                                if (!prev) return prev;
                                return { ...prev, items: prev.items.filter((it) => it.id !== item.id) };
                              })
                            }
                            className="text-xs text-red-500"
                          >
                            Eliminar imagen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                    <select
                      className="input-field"
                      value={sectionDraft.tipo}
                      onChange={(e) => setSectionDraft((prev) => (prev ? { ...prev, tipo: e.target.value as TipoSeccionDiseno } : prev))}
                    >
                      {SECTION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Paleta</label>
                    <select
                      className="input-field"
                      value={sectionDraft.paletaId}
                      onChange={(e) => setSectionDraft((prev) => (prev ? { ...prev, paletaId: e.target.value } : prev))}
                    >
                      {paletas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Vista</label>
                    <select className="input-field" value={editorViewport} onChange={(e) => setEditorViewport(e.target.value as "desktop" | "movil")}>
                      <option value="desktop">PC</option>
                      <option value="movil">Móvil</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Visible</label>
                    <label className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-stone-300 px-3 text-sm text-stone-600">
                      <input
                        type="checkbox"
                        checked={sectionDraft.visible}
                        onChange={(e) => setSectionDraft((prev) => (prev ? { ...prev, visible: e.target.checked } : prev))}
                      />
                      Mostrar
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label-field">Perfiles visibles</label>
                  <div className="grid grid-cols-2 gap-1">
                    {PROFILE_OPTIONS.map((role) => (
                      <label key={role} className="inline-flex items-center gap-2 text-xs text-stone-600">
                        <input
                          type="checkbox"
                          checked={(sectionDraft.perfiles ?? []).includes(role)}
                          onChange={(e) => {
                            const current = sectionDraft.perfiles ?? [];
                            const next = e.target.checked ? [...current, role] : current.filter((r) => r !== role);
                            setSectionDraft((prev) => (prev ? { ...prev, perfiles: next } : prev));
                          }}
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>

                {(sectionDraft.tipo === "historia" || sectionDraft.tipo === "timeline") && (
                  <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-stone-700">Entradas</p>
                      <button onClick={() => setSectionDraft((prev) => {
                        if (!prev) return prev;
                        const nextItem = {
                          id: `item-${uid()}`,
                          titulo: prev.tipo === "timeline" ? "Nuevo hito" : "Nueva historia",
                          descripcion: "",
                          hora: prev.tipo === "timeline" ? "12:00" : undefined,
                          filtrosImagen: [],
                        };
                        return { ...prev, items: [...(prev.items ?? []), nextItem] };
                      })} className="rounded border border-stone-300 px-2 py-1 text-xs">+ Entrada</button>
                    </div>

                    {(sectionDraft.items ?? []).map((item) => (
                      <div key={item.id} className="space-y-1 rounded-lg border border-stone-200 bg-white p-2">
                        <input
                          className="input-field"
                          value={item.titulo}
                          onChange={(e) => setSectionDraft((prev) => {
                            if (!prev) return prev;
                            return { ...prev, items: prev.items.map((it) => (it.id === item.id ? { ...it, titulo: e.target.value } : it)) };
                          })}
                          placeholder="Título"
                        />
                        <textarea
                          className="input-field"
                          rows={2}
                          value={item.descripcion}
                          onChange={(e) => setSectionDraft((prev) => {
                            if (!prev) return prev;
                            return { ...prev, items: prev.items.map((it) => (it.id === item.id ? { ...it, descripcion: e.target.value } : it)) };
                          })}
                          placeholder="Descripción"
                        />
                        {sectionDraft.tipo === "timeline" && (
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              className="input-field"
                              value={item.hora ?? ""}
                              onChange={(e) => setSectionDraft((prev) => {
                                if (!prev) return prev;
                                return { ...prev, items: prev.items.map((it) => (it.id === item.id ? { ...it, hora: e.target.value } : it)) };
                              })}
                              placeholder="Hora"
                            />
                            <select
                              className="input-field"
                              value={item.icono ?? "rings"}
                              onChange={(e) => setSectionDraft((prev) => {
                                if (!prev) return prev;
                                return { ...prev, items: prev.items.map((it) => (it.id === item.id ? { ...it, icono: e.target.value } : it)) };
                              })}
                            >
                              {ICONO_OPTIONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                            </select>
                          </div>
                        )}
                        <input
                          className="input-field"
                          value={item.enlaceMaps ?? ""}
                          onChange={(e) => setSectionDraft((prev) => {
                            if (!prev) return prev;
                            return { ...prev, items: prev.items.map((it) => (it.id === item.id ? { ...it, enlaceMaps: e.target.value } : it)) };
                          })}
                          placeholder="Enlace maps"
                        />

                        <div className="grid grid-cols-[1fr_auto] gap-1">
                          <input
                            className="input-field"
                            value={item.imagen ?? ""}
                            onChange={(e) => setSectionDraft((prev) => {
                              if (!prev) return prev;
                              return { ...prev, items: prev.items.map((it) => (it.id === item.id ? { ...it, imagen: e.target.value } : it)) };
                            })}
                            placeholder="URL imagen"
                          />
                          <label className="inline-flex cursor-pointer items-center rounded border border-stone-300 px-2 text-xs">
                            Subir
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadSectionItemImage(item.id, file);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {(["sepia", "grayscale", "blur"] as const).map((filterKey) => (
                            <label key={filterKey} className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={(item.filtrosImagen ?? []).includes(filterKey)}
                                onChange={(e) => setSectionDraft((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    items: prev.items.map((it) => {
                                      if (it.id !== item.id) return it;
                                      const current = it.filtrosImagen ?? [];
                                      const next = e.target.checked
                                        ? [...current, filterKey]
                                        : current.filter((f) => f !== filterKey);
                                      return { ...it, filtrosImagen: next };
                                    }),
                                  };
                                })}
                              />
                              {filterKey}
                            </label>
                          ))}
                        </div>

                        {item.imagen && (
                          <img
                            src={previewSrcForAdmin(inviteCode, item.imagen)}
                            alt={item.titulo || "item"}
                            className="h-24 w-full rounded object-cover"
                            style={{ filter: getItemFilterCss(item.filtrosImagen) }}
                          />
                        )}

                        <button
                          onClick={() => setSectionDraft((prev) => {
                            if (!prev) return prev;
                            return { ...prev, items: prev.items.filter((it) => it.id !== item.id) };
                          })}
                          className="text-xs text-red-500"
                        >
                          Eliminar entrada
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {sectionDraft.tipo === "portada" && (
                  <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <p className="text-xs font-semibold text-stone-700">Edición básica de portada</p>
                    <input
                      className="input-field"
                      value={sectionDraft.nombre}
                      onChange={(e) => setSectionDraft((prev) => (prev ? { ...prev, nombre: e.target.value } : prev))}
                      placeholder="Nombre interno"
                    />
                    <textarea
                      className="input-field"
                      rows={3}
                      value={sectionDraft.items?.[0]?.descripcion ?? ic.textos.bienvenida}
                      onChange={(e) => setSectionDraft((prev) => {
                        if (!prev) return prev;
                        const first = prev.items[0] ?? { id: `item-${uid()}`, titulo: "Portada", descripcion: "" };
                        const next = { ...first, descripcion: e.target.value };
                        return { ...prev, items: [next, ...prev.items.slice(1)] };
                      })}
                      placeholder="Texto de bienvenida"
                    />
                  </div>
                )}
              </div>

              <div className="overflow-auto p-4">
                {editorToast && (
                  <div
                    className={`mb-3 inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${editorToast.type === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-700"}`}
                  >
                    {editorToast.text}
                  </div>
                )}
                <p className="mb-2 text-xs text-stone-500">Canvas de edición ({editorViewport})</p>
                {renderSectionCanvas(sectionDraft, false)}
              </div>
            </div>
          </div>
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
