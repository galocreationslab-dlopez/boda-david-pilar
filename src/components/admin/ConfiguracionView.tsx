"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import MainWithInvite from "@/components/wedding/MainWithInvite";
import type { HeroComponentKey } from "@/components/wedding/HeroPortada";
import { SeccionColapsable } from "@/components/wedding/SeccionColapsable";
import { SeccionHistoria, type HistoriaComponentKey } from "@/components/wedding/SeccionHistoria";
import { SeccionTimeline, type TimelineComponentKey } from "@/components/wedding/SeccionTimeline";
import { SeccionGaleria, type GaleriaComponentKey } from "@/components/wedding/SeccionGaleria";
import { OrnamentoDivisor, SeparadorSeccion } from "@/components/ui/OrnamentoDivisor";
import {
  ROLE_KEYS,
  buildPaletteSwatches,
  getPaletteRoleKeys,
  getRoleLabel,
  resolvePaletteRoleColors,
  resolvePaletteRoleMap,
  resolvePaletteToThemeColors,
} from "@/lib/theme-roles";
import type { PublicGalleryMedia } from "@/lib/wedding-gallery-server";
import type {
  WeddingConfig,
  EventoTimeline,
  TemaColores,
  TemaColorRole,
  TemaPaleta,
  SeparadorDiseno,
  SeccionDiseno,
  TipoSeccionDiseno,
} from "@/config/wedding.config";

type SectionComponentKey =
  | HeroComponentKey
  | HistoriaComponentKey
  | TimelineComponentKey
  | GaleriaComponentKey
  | "historia.tituloSeccion"
  | "historia.fondoSeccion"
  | "timeline.tituloSeccion"
  | "timeline.fondoSeccion"
  | "galeria.tituloSeccion"
  | "galeria.fondoSeccion";

const SECTION_COMPONENT_OPTIONS: Record<TipoSeccionDiseno, Array<{ key: SectionComponentKey; label: string; defaultRole: TemaColorRole }>> = {
  portada: [
    { key: "portada.fondo", label: "Fondo sección", defaultRole: "fondoSeccion" },
    { key: "portada.logo", label: "Logo", defaultRole: "logo" },
    { key: "portada.nombres", label: "Nombres novios", defaultRole: "titulo" },
    { key: "portada.separador", label: "Separadores", defaultRole: "nexosTransicionesBordes" },
    { key: "portada.fecha", label: "Fecha boda", defaultRole: "textoSecundario" },
    { key: "portada.bienvenida", label: "Texto invitación", defaultRole: "textoPrincipal" },
    { key: "portada.faltan", label: "Texto 'Faltan'", defaultRole: "textoSecundario" },
    { key: "portada.cuentaAtras", label: "Cuenta atrás", defaultRole: "titulo" },
    { key: "portada.cuentaAtrasLeyendas", label: "Leyendas cuenta atrás", defaultRole: "textoSecundario" },
    { key: "portada.ctaFondo", label: "Botón CTA - Fondo", defaultRole: "fondoBoton" },
    { key: "portada.ctaTexto", label: "Botón CTA - Texto", defaultRole: "textoBoton" },
  ],
  historia: [
    { key: "historia.tituloSeccion", label: "Título sección (colapsable)", defaultRole: "tituloSeccion" },
    { key: "historia.tituloInterno", label: "Título interno historia", defaultRole: "titulo" },
    { key: "historia.fondoSeccion", label: "Fondo sección", defaultRole: "fondoSeccion" },
    { key: "historia.card", label: "Fondo item", defaultRole: "fondoSubseccion" },
    { key: "historia.imagen", label: "Borde imagen", defaultRole: "bordes" },
    { key: "historia.fecha", label: "Fecha item", defaultRole: "textoBoton" },
    { key: "historia.titulo", label: "Título item", defaultRole: "textoPrincipal" },
    { key: "historia.descripcion", label: "Texto historia", defaultRole: "textoSecundario" },
    { key: "historia.navegacion", label: "Anterior / Siguiente", defaultRole: "textoBoton" },
  ],
  timeline: [
    { key: "timeline.tituloSeccion", label: "Título sección (colapsable)", defaultRole: "tituloSeccion" },
    { key: "timeline.fondoSeccion", label: "Fondo sección", defaultRole: "fondoSeccion" },
    { key: "timeline.card", label: "Fondo item", defaultRole: "fondoSubseccion" },
    { key: "timeline.icono", label: "Icono", defaultRole: "logo" },
    { key: "timeline.hora", label: "Hora", defaultRole: "textoBoton" },
    { key: "timeline.titulo", label: "Título item", defaultRole: "textoPrincipal" },
    { key: "timeline.descripcion", label: "Texto timeline", defaultRole: "textoSecundario" },
    { key: "timeline.mapa", label: "Bordes mapa", defaultRole: "bordes" },
  ],
  galeria: [
    { key: "galeria.tituloSeccion", label: "Título sección (colapsable)", defaultRole: "tituloSeccion" },
    { key: "galeria.fondoSeccion", label: "Fondo sección", defaultRole: "fondoSeccion" },
    { key: "galeria.card", label: "Tarjeta galería", defaultRole: "fondoSubseccion" },
    { key: "galeria.imagen", label: "Borde imagen", defaultRole: "bordes" },
    { key: "galeria.titulo", label: "Título galería", defaultRole: "textoPrincipal" },
    { key: "galeria.subtitulo", label: "Subtítulo galería", defaultRole: "textoSecundario" },
  ],
};

function getDefaultComponentRoles(tipo: TipoSeccionDiseno): Partial<Record<string, TemaColorRole>> {
  return (SECTION_COMPONENT_OPTIONS[tipo] ?? []).reduce((acc, option) => {
    acc[option.key] = option.defaultRole;
    return acc;
  }, {} as Partial<Record<string, TemaColorRole>>);
}

function normalizeLegacyRole(role: string): TemaColorRole {
  if (role === "fondoPrincipal") return "fondoSeccion";
  if (role === "fondoAlterno") return "fondoSubseccion";
  if (role === "titulos") return "titulo";
  if (role === "botonFondo") return "fondoBoton";
  if (role === "botonTexto") return "textoBoton";
  if (role === "bordesDivisores") return "nexosTransicionesBordes";
  if (role === "highlightAcento") return "logo";
  return role;
}

function normalizeLegacyComponentKey(key: string): string {
  if (key === "portada.sello") return "portada.logo";
  if (key === "portada.cta") return "portada.ctaFondo";
  if (key === "portada.adminCtaFondo") return "portada.ctaFondo";
  if (key === "portada.adminCtaTexto") return "portada.ctaTexto";
  return key;
}

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

function slugifyRoleName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const normalizedRoles = Object.entries(paleta.rolesColor ?? {}).reduce((acc, [rawRole, swatchId]) => {
    if (!swatchId) return acc;
    acc[normalizeLegacyRole(rawRole)] = swatchId;
    return acc;
  }, {} as Record<string, string>);
  const normalizedRoleLabels = Object.entries(paleta.roleLabels ?? {}).reduce((acc, [rawRole, label]) => {
    if (!label) return acc;
    acc[normalizeLegacyRole(rawRole)] = label;
    return acc;
  }, {} as Record<string, string>);
  return {
    id: paleta.id,
    nombre: paleta.nombre,
    colores: normalizeTemaColores(safe),
    etiquetasColores: {
      ...DEFAULT_COLOR_LABELS,
      ...(paleta.etiquetasColores ?? {}),
    },
    coloresExtra: paleta.coloresExtra ?? [],
    roleLabels: normalizedRoleLabels,
    rolesColor: resolvePaletteRoleMap({
      ...paleta,
      colores: normalizeTemaColores(safe),
      coloresExtra: paleta.coloresExtra ?? [],
      roleLabels: normalizedRoleLabels,
      rolesColor: normalizedRoles,
    }),
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
      roleLabels: {},
      rolesColor: resolvePaletteRoleMap({
        id: "paleta-principal",
        nombre: "Principal",
        colores: fallback,
        etiquetasColores: { ...DEFAULT_COLOR_LABELS },
        coloresExtra: [],
        roleLabels: {},
      }),
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
    usarPaletaGlobal: true,
    componentRoles: getDefaultComponentRoles(tipo),
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
      usarPaletaGlobal: sec.usarPaletaGlobal ?? true,
      componentRoles: {
        ...getDefaultComponentRoles(sec.tipo),
        ...Object.entries(sec.componentRoles ?? {}).reduce((acc, [rawKey, rawRole]) => {
          if (!rawRole) return acc;
          acc[normalizeLegacyComponentKey(rawKey)] = normalizeLegacyRole(rawRole);
          return acc;
        }, {} as Partial<Record<string, TemaColorRole>>),
      },
      perfiles: sec.perfiles?.length ? sec.perfiles : ["publico"],
      items:
        sec.tipo === "portada"
          ? (sec.items?.length
              ? sec.items
              : [
                  {
                    id: `item-${uid()}`,
                    titulo: "Bienvenida",
                    descripcion: config.textos.bienvenida,
                  },
                ])
          : sec.tipo === "historia"
            ? (sec.items?.length
                ? sec.items
                : config.historia.map((evento) => ({
                    id: evento.id,
                    titulo: evento.titulo,
                    descripcion: evento.descripcion,
                    hora: evento.fecha,
                    imagen: evento.imagen,
                  })))
            : sec.tipo === "timeline"
              ? (sec.items?.length
                  ? sec.items
                  : config.timeline.map((evento) => ({
                      id: evento.id,
                      titulo: evento.titulo,
                      descripcion: evento.descripcion,
                      hora: evento.hora,
                      icono: evento.icono,
                    })))
              : (sec.items ?? []),
      subtituloInterno:
        sec.tipo === "historia"
          ? (sec.subtituloInterno || "El camino hasta aquí")
          : sec.subtituloInterno,
    }));
  }

  return [
    defaultSection(paletaId, "portada"),
    defaultSection(paletaId, "historia"),
    defaultSection(paletaId, "galeria"),
    defaultSection(paletaId, "timeline"),
  ];
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

export default function ConfiguracionView({ inviteCode, config: ic }: { inviteCode: string; config: WeddingConfig }) {
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
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    buildInitialSecciones(ic, initialPaletas[0]?.id ?? "")[0]?.id ?? "",
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, SeccionDiseno>>({});
  const [selectedDesignComponentKey, setSelectedDesignComponentKey] = useState<SectionComponentKey | null>(null);
  const [sectionEditMode, setSectionEditMode] = useState<"diseno">("diseno");
  const [newCustomRoleName, setNewCustomRoleName] = useState("");
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  const [paletasCollapsed, setPaletasCollapsed] = useState(true);
  const [separadorCollapsed, setSeparadorCollapsed] = useState(true);

  const [editorViewport, setEditorViewport] = useState<"desktop" | "movil">("desktop");
  const sectionCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const previewSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const fuentes = ic.tema.fuentes;
  const logoUrl = ic.logo ?? "";

  const paletaActiva = useMemo(
    () => paletas.find((p) => p.id === paletaActivaId) ?? paletas[0],
    [paletaActivaId, paletas],
  );

  const paletaEditando = useMemo(
    () => paletas.find((p) => p.id === paletaEditandoId) ?? paletaActiva,
    [paletaActiva, paletaEditandoId, paletas],
  );

  const paletaActivaResolvedColors = useMemo(
    () => (paletaActiva ? resolvePaletteToThemeColors(paletaActiva) : ic.tema.colores),
    [ic.tema.colores, paletaActiva],
  );

  const paletaActivaRoleColors = useMemo(
    () => (paletaActiva ? resolvePaletteRoleColors(paletaActiva) : null),
    [paletaActiva],
  );

  const seccionesEfectivas = useMemo(
    () => secciones.map((sec) => sectionDrafts[sec.id] ?? sec),
    [secciones, sectionDrafts],
  );

  const sectionBaseMap = useMemo(
    () => Object.fromEntries(secciones.map((sec) => [sec.id, sec])) as Record<string, SeccionDiseno>,
    [secciones],
  );

  const pendingDraftIds = useMemo(
    () =>
      Object.keys(sectionDrafts).filter((id) => {
        const base = sectionBaseMap[id];
        const draft = sectionDrafts[id];
        if (!base || !draft) return false;
        return JSON.stringify(base) !== JSON.stringify(draft);
      }),
    [sectionBaseMap, sectionDrafts],
  );

  const hasPendingDrafts = pendingDraftIds.length > 0;
  const hasAnySectionInEditMode = editingSectionId !== null || Object.keys(sectionDrafts).length > 0;

  const editingSectionDraft = useMemo(() => {
    if (!editingSectionId) return null;
    return sectionDrafts[editingSectionId] ?? sectionBaseMap[editingSectionId] ?? null;
  }, [editingSectionId, sectionBaseMap, sectionDrafts]);

  const activeSelectedDesignComponentKey = useMemo(() => {
    if (!editingSectionDraft || sectionEditMode !== "diseno") return null;
    const options = SECTION_COMPONENT_OPTIONS[editingSectionDraft.tipo] ?? [];
    if (selectedDesignComponentKey && options.some((option) => option.key === selectedDesignComponentKey)) {
      return selectedDesignComponentKey;
    }
    return options[0]?.key ?? null;
  }, [editingSectionDraft, sectionEditMode, selectedDesignComponentKey]);

  const visiblePreviewSections = useMemo(
    () =>
      seccionesEfectivas.filter((s) => {
        if (!s.visible) return false;
        if (!s.perfiles || s.perfiles.length === 0) return true;
        return s.perfiles.includes(previewRole) || s.perfiles.includes("publico");
      }),
    [previewRole, seccionesEfectivas],
  );

  const previewSectionsToRender = useMemo(() => {
    if (!hasAnySectionInEditMode) return visiblePreviewSections;
    return visiblePreviewSections.filter((section) => section.id === selectedSectionId);
  }, [hasAnySectionInEditMode, selectedSectionId, visiblePreviewSections]);

  useEffect(() => {
    const node = sectionCardRefs.current[selectedSectionId];
    if (node) {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (hasAnySectionInEditMode) return;
    const node = previewSectionRefs.current[selectedSectionId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hasAnySectionInEditMode, selectedSectionId]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingDrafts) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasPendingDrafts]);

  const previewGalleryMedia = useMemo<PublicGalleryMedia[]>(() => {
    return ic.historia
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
  }, [ic.historia]);

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
      roleLabels: { ...(base?.roleLabels ?? {}) },
      rolesColor: base ? resolvePaletteRoleMap(base) : undefined,
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
      roleLabels: { ...(paletaEditando.roleLabels ?? {}) },
      rolesColor: resolvePaletteRoleMap(paletaEditando),
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

  const patchSectionMeta = (sectionId: string, patch: Partial<SeccionDiseno>) => {
    if (sectionDrafts[sectionId]) {
      setSectionDrafts((prev) => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          ...patch,
        },
      }));
      return;
    }
    updateSection(sectionId, patch);
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
    setSectionDrafts((prev) => {
      const clone = { ...prev };
      delete clone[sectionId];
      return clone;
    });
    if (editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
  };

  const moveSectionBefore = (draggedSectionId: string, targetSectionId: string) => {
    if (draggedSectionId === targetSectionId) return;

    setSecciones((prev) => {
      const draggedIndex = prev.findIndex((s) => s.id === draggedSectionId);
      const targetIndex = prev.findIndex((s) => s.id === targetSectionId);
      if (draggedIndex < 0 || targetIndex < 0) return prev;
      const next = [...prev];
      const [dragged] = next.splice(draggedIndex, 1);
      const insertAt = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      next.splice(insertAt, 0, dragged);
      return next;
    });
  };

  const formatPerfilesLabel = (perfiles: string[] | undefined) => {
    if (!perfiles || perfiles.length === 0) return "Todos";
    if (perfiles.length <= 2) return perfiles.join(", ");
    return `${perfiles.slice(0, 2).join(", ")} +${perfiles.length - 2}`;
  };

  const getPaletteBySection = useCallback((section: SeccionDiseno): TemaPaleta => {
    const shouldUseGlobal = section.usarPaletaGlobal ?? true;
    if (shouldUseGlobal) {
      return paletaActiva ?? paletas[0];
    }
    return paletas.find((palette) => palette.id === section.paletaId) ?? paletaActiva ?? paletas[0];
  }, [paletaActiva, paletas]);

  const getSectionComponentOptions = (section: SeccionDiseno) => SECTION_COMPONENT_OPTIONS[section.tipo] ?? [];

  const getComponentRoleForSection = useCallback((section: SeccionDiseno, componentKey: SectionComponentKey): TemaColorRole => {
    const options = getSectionComponentOptions(section);
    const option = options.find((item) => item.key === componentKey);
    const direct = section.componentRoles?.[componentKey];
    if (direct) return normalizeLegacyRole(direct);
    if (componentKey === "portada.logo") {
      const legacy = section.componentRoles?.["portada.sello"];
      if (legacy) return normalizeLegacyRole(legacy);
    }
    return option?.defaultRole ?? "textoPrincipal";
  }, []);

  const patchEditingSectionComponentRole = (componentKey: SectionComponentKey, role: TemaColorRole) => {
    if (!editingSectionDraft) return;
    patchEditingSectionDraft({
      componentRoles: {
        ...(editingSectionDraft.componentRoles ?? {}),
        [componentKey]: role,
      },
    });
  };

  const getComponentStyleByKey = (key: SectionComponentKey, color: string): CSSProperties => {
    switch (key) {
      case "portada.fondo":
      case "historia.fondoSeccion":
      case "timeline.fondoSeccion":
      case "galeria.fondoSeccion":
        return { backgroundColor: color };
      case "portada.separador":
        return { color, borderColor: color };
      case "portada.logo":
      case "portada.nombres":
      case "portada.fecha":
      case "portada.bienvenida":
      case "portada.faltan":
      case "portada.cuentaAtras":
      case "portada.cuentaAtrasLeyendas":
      case "portada.ctaTexto":
      case "historia.tituloSeccion":
      case "historia.tituloInterno":
      case "historia.fecha":
      case "historia.titulo":
      case "historia.descripcion":
      case "historia.navegacion":
      case "timeline.tituloSeccion":
      case "timeline.hora":
      case "timeline.titulo":
      case "timeline.descripcion":
      case "timeline.icono":
      case "galeria.tituloSeccion":
      case "galeria.titulo":
      case "galeria.subtitulo":
        return { color };
      case "historia.card":
      case "timeline.card":
      case "galeria.card":
        return { backgroundColor: color };
      case "historia.imagen":
      case "timeline.mapa":
      case "galeria.imagen":
        return { borderColor: color };
      case "portada.ctaFondo":
        return { backgroundColor: color, borderColor: color };
      default:
        return {};
    }
  };

  const getSectionComponentStyles = (section: SeccionDiseno): Partial<Record<SectionComponentKey, CSSProperties>> => {
    const palette = getPaletteBySection(section);
    const roleColors = resolvePaletteRoleColors(palette);
    const options = getSectionComponentOptions(section);
    return options.reduce((acc, option) => {
      const role = getComponentRoleForSection(section, option.key);
      const color = roleColors[role];
      acc[option.key] = getComponentStyleByKey(option.key, color);
      return acc;
    }, {} as Partial<Record<SectionComponentKey, CSSProperties>>);
  };

  const applySwatchToRoleInEditingSection = (role: string, swatchId: string) => {
    if (!editingSectionDraft) return;
    const paletteId = (editingSectionDraft.usarPaletaGlobal ?? true)
      ? paletaActivaId
      : editingSectionDraft.paletaId;
    updatePaleta(paletteId, (palette) => ({
      ...palette,
      rolesColor: {
        ...resolvePaletteRoleMap(palette),
        [role]: swatchId,
      },
    }));
  };

  const editingComponentOptions = useMemo(
    () => (editingSectionDraft ? getSectionComponentOptions(editingSectionDraft) : []),
    [editingSectionDraft],
  );

  const selectedComponentOption = useMemo(
    () => editingComponentOptions.find((option) => option.key === activeSelectedDesignComponentKey) ?? editingComponentOptions[0] ?? null,
    [activeSelectedDesignComponentKey, editingComponentOptions],
  );

  const editingPalette = useMemo(
    () => (editingSectionDraft ? getPaletteBySection(editingSectionDraft) : null),
    [editingSectionDraft, getPaletteBySection],
  );

  const editingPaletteSwatches = useMemo(
    () => (editingPalette ? buildPaletteSwatches(editingPalette) : []),
    [editingPalette],
  );

  const editingPaletteRoleMap = useMemo(
    () => (editingPalette ? resolvePaletteRoleMap(editingPalette) : null),
    [editingPalette],
  );

  const selectedComponentRole = useMemo(() => {
    if (!editingSectionDraft || !selectedComponentOption) return null;
    return getComponentRoleForSection(editingSectionDraft, selectedComponentOption.key);
  }, [editingSectionDraft, getComponentRoleForSection, selectedComponentOption]);

  const availableRoleKeys = useMemo(
    () => (editingPalette ? getPaletteRoleKeys(editingPalette) : [...ROLE_KEYS]),
    [editingPalette],
  );

  const addCustomRoleToEditingPalette = () => {
    if (!editingPalette) return;
    const trimmed = newCustomRoleName.trim();
    if (!trimmed) return;

    const roleId = `custom.${slugifyRoleName(trimmed)}`;
    if (!roleId || roleId === "custom.") return;

    if (availableRoleKeys.includes(roleId)) {
      showMsg("error", "Ya existe un rol con ese nombre.");
      return;
    }

    updatePaleta(editingPalette.id, (palette) => ({
      ...palette,
      roleLabels: {
        ...(palette.roleLabels ?? {}),
        [roleId]: trimmed,
      },
      rolesColor: {
        ...resolvePaletteRoleMap(palette),
        [roleId]: "bronze",
      },
    }));
    setNewCustomRoleName("");
    showMsg("ok", `Rol personalizado creado: ${trimmed}`);
  };

  const getSectionThemeVars = (section: SeccionDiseno): CSSProperties => {
    const palette = getPaletteBySection(section);
    const resolved = palette ? resolvePaletteToThemeColors(palette) : ic.tema.colores;
    const roles = palette ? resolvePaletteRoleColors(palette) : null;
    return {
      ["--bronze" as string]: resolved.bronze,
      ["--bronze-light" as string]: resolved.bronzeLight,
      ["--bronze-pale" as string]: roles?.nexosTransicionesBordes ?? resolved.bronzeLight,
      ["--olive" as string]: resolved.olive,
      ["--olive-muted" as string]: resolved.oliveMuted,
      ["--cream" as string]: resolved.cream,
      ["--cream-dark" as string]: roles?.fondoSubseccion ?? resolved.white,
      ["--brown-dark" as string]: resolved.brownDark,
      ["--brown-mid" as string]: roles?.textoSecundario ?? resolved.oliveMuted,
      ["--white" as string]: resolved.white,
      ["--font-display" as string]: fuentes.display,
      ["--font-body" as string]: fuentes.body,
    };
  };

  const isSectionDirty = (sectionId: string): boolean => {
    const base = sectionBaseMap[sectionId];
    const draft = sectionDrafts[sectionId];
    if (!base || !draft) return false;
    return JSON.stringify(base) !== JSON.stringify(draft);
  };

  const startSectionEditing = (sectionId: string) => {
    const base = sectionBaseMap[sectionId];
    if (!base) return;
    setSelectedSectionId(sectionId);
    setEditingSectionId(sectionId);
    setSectionEditMode("diseno");
    setSectionDrafts((prev) => (prev[sectionId] ? prev : { ...prev, [sectionId]: structuredClone(base) }));
  };

  const selectSectionFromPanel = (sectionId: string) => {
    setSelectedSectionId(sectionId);

    if (!hasAnySectionInEditMode) return;

    const base = sectionBaseMap[sectionId];
    if (!base) return;

    setEditingSectionId(sectionId);
    setSectionDrafts((prev) => (prev[sectionId] ? prev : { ...prev, [sectionId]: structuredClone(base) }));
  };

  const saveSectionDraftById = (sectionId: string) => {
    const draft = sectionDrafts[sectionId];
    if (!draft) return;
    setSecciones((prev) => prev.map((s) => (s.id === sectionId ? draft : s)));
    setSectionDrafts((prev) => {
      const clone = { ...prev };
      delete clone[sectionId];
      return clone;
    });
    if (editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
    showMsg("ok", `Seccion \"${draft.nombre || draft.titulo}\" guardada.`);
  };

  const discardSectionDraftById = (sectionId: string) => {
    setSectionDrafts((prev) => {
      const clone = { ...prev };
      delete clone[sectionId];
      return clone;
    });
    if (editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
    showMsg("ok", "Cambios de sección descartados.");
  };

  const patchEditingSectionDraft = (patch: Partial<SeccionDiseno>) => {
    if (!editingSectionId) return;
    const base = sectionBaseMap[editingSectionId];
    if (!base) return;

    setSectionDrafts((prev) => {
      const current = prev[editingSectionId] ?? structuredClone(base);
      return {
        ...prev,
        [editingSectionId]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const setPortadaWelcomeText = (text: string) => {
    if (!editingSectionDraft || editingSectionDraft.tipo !== "portada") return;
    const currentFirst = editingSectionDraft.items[0] ?? {
      id: `item-${uid()}`,
      titulo: "Bienvenida",
      descripcion: "",
    };
    const nextFirst = { ...currentFirst, descripcion: text };
    patchEditingSectionDraft({ items: [nextFirst, ...editingSectionDraft.items.slice(1)] });
  };

  const getPortadaConfig = (section: SeccionDiseno): WeddingConfig => {
    const welcome = section.items?.[0]?.descripcion?.trim();
    if (!welcome) return ic;
    return {
      ...ic,
      textos: {
        ...ic.textos,
        bienvenida: welcome || ic.textos.bienvenida,
      },
    };
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const seccionesConPendientes = secciones.map((sec) => sectionDrafts[sec.id] ?? sec);
      const seccionPortada = seccionesConPendientes.find((sec) => sec.tipo === "portada");
      const bienvenidaPortada = seccionPortada?.items?.[0]?.descripcion;
      const colors = paletaActivaResolvedColors;
      const payload: Record<string, unknown> = {
        tema: {
          colores: colors,
          fuentes,
          paletas,
          paletaActivaId,
        },
        diseno: {
          separador,
          secciones: seccionesConPendientes,
        },
        logo: logoUrl,
      };

      if (typeof bienvenidaPortada === "string") {
        payload.textos = {
          ...ic.textos,
          bienvenida: bienvenidaPortada,
        };
      }

      const res = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Error al guardar");
      }
      setSecciones(seccionesConPendientes);
      setSectionDrafts({});
      setEditingSectionId(null);
      showMsg("ok", "Diseno guardado. Refresca la web publica para verlo aplicado.");
    } catch (e) {
      showMsg("error", e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }, [fuentes, ic.textos, inviteCode, logoUrl, paletaActivaResolvedColors, paletaActivaId, paletas, sectionDrafts, secciones, separador]);

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

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!hasPendingDrafts) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor?.href) return;

      const url = new URL(anchor.href, window.location.href);
      const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePage) return;

      event.preventDefault();

      const guardar = confirm("Hay cambios pendientes. Aceptar = Guardar todo y salir. Cancelar = elegir descarte.");
      if (guardar) {
        void (async () => {
          await handleSave();
          window.location.assign(url.toString());
        })();
        return;
      }

      const descartar = confirm("Descartar todos los cambios pendientes y salir?");
      if (!descartar) return;

      setSectionDrafts({});
      setEditingSectionId(null);
      window.location.assign(url.toString());
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [handleSave, hasPendingDrafts]);

  const historyEventsForSection = (section: SeccionDiseno): WeddingConfig["historia"] => {
    if (!section.items || section.items.length === 0) return ic.historia;
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
    if (!section.items || section.items.length === 0) {
      return ic.timeline.map((item) => ({ ...item, enlaceMaps: "" }));
    }
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

  const renderSectionCanvas = (section: SeccionDiseno, compact = false, editable = false) => {
    const scale = compact ? 0.24 : editorViewport === "movil" ? 0.45 : 0.62;
    const width = compact ? "418%" : editorViewport === "movil" ? "222%" : "161%";
    const openInCanvas = compact;
    const themeVars = getSectionThemeVars(section);
    const designMode = editable && sectionEditMode === "diseno";
    const componentStyles = getSectionComponentStyles(section);

    return (
      <div className={`overflow-hidden rounded-xl border border-stone-200 bg-stone-100 ${compact ? "relative aspect-[16/10]" : ""}`}>
        <div
          style={{ ...themeVars, transform: `scale(${scale})`, transformOrigin: "top left", width }}
          className={`${editable ? "pointer-events-auto" : "pointer-events-none"} ${compact ? "absolute inset-0" : ""}`}
        >
          {section.tipo === "portada" && (
            <SeccionColapsable id={`canvas-${section.id}`} abiertaPorDefecto={true} ocultarCabecera={true}>
              <MainWithInvite
                config={getPortadaConfig(section)}
                viewport={editorViewport}
                editable={false}
                designMode={designMode}
                selectedComponentKey={designMode ? activeSelectedDesignComponentKey as HeroComponentKey | null : null}
                onSelectComponent={(key) => setSelectedDesignComponentKey(key)}
                componentStyles={componentStyles}
                onEditBienvenida={setPortadaWelcomeText}
              />
            </SeccionColapsable>
          )}
          {section.tipo === "historia" && (
            <SeccionColapsable
              id={`canvas-${section.id}`}
              titulo={section.titulo || "Nuestra historia"}
              abiertaPorDefecto={openInCanvas}
              bgColor="var(--cream)"
              designMode={designMode}
              sectionStyle={componentStyles["historia.fondoSeccion"]}
              sectionSelected={designMode && activeSelectedDesignComponentKey === "historia.fondoSeccion"}
              titleStyle={componentStyles["historia.tituloSeccion"]}
              titleSelected={designMode && activeSelectedDesignComponentKey === "historia.tituloSeccion"}
              onSelectSectionBackground={() => setSelectedDesignComponentKey("historia.fondoSeccion")}
              onSelectTitleDesign={() => setSelectedDesignComponentKey("historia.tituloSeccion")}
            >
              <SeccionHistoria
                eventos={historyEventsForSection(section)}
                viewport={editorViewport}
                editable={false}
                designMode={designMode}
                selectedComponentKey={designMode ? activeSelectedDesignComponentKey as HistoriaComponentKey | null : null}
                onSelectComponent={(key) => setSelectedDesignComponentKey(key)}
                componentStyles={componentStyles}
                sectionInternalTitle={section.subtituloInterno || "El camino hasta aquí"}
              />
            </SeccionColapsable>
          )}
          {section.tipo === "timeline" && (
            <SeccionColapsable
              id={`canvas-${section.id}`}
              titulo={section.titulo || "El gran día"}
              abiertaPorDefecto={openInCanvas}
              bgColor="var(--cream-dark)"
              designMode={designMode}
              sectionStyle={componentStyles["timeline.fondoSeccion"]}
              sectionSelected={designMode && activeSelectedDesignComponentKey === "timeline.fondoSeccion"}
              titleStyle={componentStyles["timeline.tituloSeccion"]}
              titleSelected={designMode && activeSelectedDesignComponentKey === "timeline.tituloSeccion"}
              onSelectSectionBackground={() => setSelectedDesignComponentKey("timeline.fondoSeccion")}
              onSelectTitleDesign={() => setSelectedDesignComponentKey("timeline.tituloSeccion")}
            >
              <SeccionTimeline
                localizaciones={ic.localizaciones}
                timeline={timelineEventsForSection(section)}
                viewport={editorViewport}
                editable={false}
                designMode={designMode}
                selectedComponentKey={designMode ? activeSelectedDesignComponentKey as TimelineComponentKey | null : null}
                onSelectComponent={(key) => setSelectedDesignComponentKey(key)}
                componentStyles={componentStyles}
              />
            </SeccionColapsable>
          )}
          {section.tipo === "galeria" && (
            <SeccionColapsable
              id={`canvas-${section.id}`}
              titulo={section.titulo || "Galería"}
              abiertaPorDefecto={openInCanvas}
              bgColor="var(--cream)"
              designMode={designMode}
              sectionStyle={componentStyles["galeria.fondoSeccion"]}
              sectionSelected={designMode && activeSelectedDesignComponentKey === "galeria.fondoSeccion"}
              titleStyle={componentStyles["galeria.tituloSeccion"]}
              titleSelected={designMode && activeSelectedDesignComponentKey === "galeria.tituloSeccion"}
              onSelectSectionBackground={() => setSelectedDesignComponentKey("galeria.fondoSeccion")}
              onSelectTitleDesign={() => setSelectedDesignComponentKey("galeria.tituloSeccion")}
            >
              <SeccionGaleria
                media={galleryMediaForSection(section)}
                viewport={editorViewport}
                editable={false}
                designMode={designMode}
                selectedComponentKey={designMode ? activeSelectedDesignComponentKey as GaleriaComponentKey | null : null}
                onSelectComponent={(key) => setSelectedDesignComponentKey(key)}
                componentStyles={componentStyles}
              />
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

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4 self-start lg:sticky lg:top-4">
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
                {secciones.map((sec) => {
                  const secDraft = sectionDrafts[sec.id] ?? sec;
                  const secDirty = isSectionDirty(sec.id);
                  const secEditing = editingSectionId === sec.id;
                  const secPerfiles = secDraft.perfiles ?? [];

                  return (
                    <article
                      key={sec.id}
                      ref={(node) => {
                        sectionCardRefs.current[sec.id] = node;
                      }}
                      className={`rounded-xl border p-2 ${selectedSectionId === sec.id ? "border-amber-400 bg-amber-50/40" : "border-stone-200 bg-stone-50"} ${dragOverSectionId === sec.id ? "ring-2 ring-amber-300" : ""}`}
                      onClick={() => selectSectionFromPanel(sec.id)}
                      onDragOver={(event) => {
                        if (!draggingSectionId || draggingSectionId === sec.id) return;
                        event.preventDefault();
                        setDragOverSectionId(sec.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverSectionId === sec.id) setDragOverSectionId(null);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!draggingSectionId) return;
                        moveSectionBefore(draggingSectionId, sec.id);
                        setDragOverSectionId(null);
                        setDraggingSectionId(null);
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                          {renamingSectionId === sec.id ? (
                            <input
                              autoFocus
                              className="input-field h-7 w-[170px] text-xs"
                              value={renamingValue}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => setRenamingValue(event.target.value)}
                              onBlur={() => {
                                patchSectionMeta(sec.id, { nombre: renamingValue.trim() || "Sección" });
                                setRenamingSectionId(null);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  patchSectionMeta(sec.id, { nombre: renamingValue.trim() || "Sección" });
                                  setRenamingSectionId(null);
                                }
                                if (event.key === "Escape") {
                                  setRenamingSectionId(null);
                                }
                              }}
                            />
                          ) : (
                            <p className="truncate text-xs font-semibold text-stone-700">{secDraft.nombre || "Seccion"}</p>
                          )}
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setRenamingSectionId(sec.id);
                              setRenamingValue(secDraft.nombre || "");
                            }}
                            className="rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[11px] text-stone-600"
                            title="Renombrar sección"
                            aria-label="Renombrar sección"
                          >
                            ✎
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            draggable={true}
                            onDragStart={(event) => {
                              event.stopPropagation();
                              event.dataTransfer.setData("text/plain", sec.id);
                              event.dataTransfer.effectAllowed = "move";
                              setDraggingSectionId(sec.id);
                            }}
                            onDragEnd={() => {
                              setDraggingSectionId(null);
                              setDragOverSectionId(null);
                            }}
                            className="cursor-grab rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[11px] text-stone-500 active:cursor-grabbing"
                            title="Arrastrar para reordenar"
                            aria-label="Arrastrar para reordenar"
                          >
                            ⋮⋮
                          </span>
                        </div>
                      </div>

                      <div className="mb-2">
                        <details className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-600" onClick={(event) => event.stopPropagation()}>
                          <summary className="cursor-pointer list-none select-none">
                            Visible para: {formatPerfilesLabel(secPerfiles)} ▾
                          </summary>
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {PROFILE_OPTIONS.map((role) => (
                              <label key={role} className="inline-flex items-center gap-1 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={secPerfiles.includes(role)}
                                  onChange={(event) => {
                                    const next = event.target.checked
                                      ? [...secPerfiles, role]
                                      : secPerfiles.filter((item) => item !== role);
                                    patchSectionMeta(sec.id, { perfiles: next });
                                  }}
                                />
                                <span className="capitalize">{role}</span>
                              </label>
                            ))}
                          </div>
                        </details>
                        <p className="mt-1 text-[11px] text-stone-500">
                          Paleta: {(secDraft.usarPaletaGlobal ?? true)
                            ? `Global (${paletaActiva?.nombre ?? "sin nombre"})`
                            : `Personalizada (${paletas.find((p) => p.id === secDraft.paletaId)?.nombre ?? "sin nombre"})`}
                        </p>
                      </div>

                      <div className="relative">
                        {renderSectionCanvas(secDraft, true, secEditing)}
                        {secDirty && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="rounded bg-black/45 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                              Pendiente
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap justify-end gap-1">
                        {secEditing || secDirty ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); saveSectionDraftById(sec.id); }}
                              disabled={!secDirty}
                              className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700 disabled:opacity-50"
                            >
                              Guardar cambios
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); discardSectionDraftById(sec.id); }}
                              className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-600"
                            >
                              Descartar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); startSectionEditing(sec.id); }}
                            className="rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[11px]"
                            title="Editar sección"
                          >
                            Editar
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); cloneSection(sec.id); }} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px]">Clonar</button>
                        <button onClick={(e) => { e.stopPropagation(); removeSection(sec.id); }} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-600">Eliminar</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </aside>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
            <div className="space-y-2 border-b border-stone-100 pb-3">
              {editingSectionDraft ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-stone-300 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700">
                      Editando: {editingSectionDraft.nombre || "Sección"}
                    </span>
                    <label className="inline-flex items-center gap-1 rounded border border-stone-300 px-2 py-1 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={editingSectionDraft.visible}
                        onChange={(e) => patchEditingSectionDraft({ visible: e.target.checked })}
                      />
                      Visible
                    </label>
                  </div>

                  <div className="space-y-2">
                    <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                      Modo diseño activo: selecciona un componente en el lienzo para asignar rol y color.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex overflow-hidden rounded border border-stone-300 bg-white text-xs">
                        <button
                          onClick={() => patchEditingSectionDraft({ usarPaletaGlobal: true, paletaId: paletaActivaId })}
                          className={`px-2 py-1 ${(editingSectionDraft.usarPaletaGlobal ?? true) ? "bg-amber-100 text-amber-800" : "text-stone-600"}`}
                        >
                          Usar paleta global
                        </button>
                        <button
                          onClick={() => patchEditingSectionDraft({ usarPaletaGlobal: false })}
                          className={`border-l border-stone-300 px-2 py-1 ${(editingSectionDraft.usarPaletaGlobal ?? true) ? "text-stone-600" : "bg-amber-100 text-amber-800"}`}
                        >
                          Personalizar sección
                        </button>
                      </div>
                      <select
                        className="input-field h-8 w-[170px] text-xs"
                        value={editingSectionDraft.paletaId}
                        disabled={editingSectionDraft.usarPaletaGlobal ?? true}
                        onChange={(e) => patchEditingSectionDraft({ paletaId: e.target.value })}
                      >
                        {paletas.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-600">
                        Activa: {(editingSectionDraft.usarPaletaGlobal ?? true)
                          ? `Global (${paletaActiva?.nombre ?? "sin nombre"})`
                          : `Sección (${paletas.find((p) => p.id === editingSectionDraft.paletaId)?.nombre ?? "sin nombre"})`}
                      </span>
                    </div>

                    <div className="rounded border border-stone-200 bg-stone-50 p-2">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Componentes gráficos</p>
                      <div className="flex flex-wrap gap-1">
                        {editingComponentOptions.map((option) => (
                          <button
                            key={option.key}
                            onClick={() => setSelectedDesignComponentKey(option.key)}
                            className={`rounded border px-2 py-1 text-[11px] ${activeSelectedDesignComponentKey === option.key ? "border-amber-500 bg-amber-100 text-amber-800" : "border-stone-300 bg-white text-stone-600"}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-900">
                      <p className="font-semibold uppercase tracking-wide">Depuración selección</p>
                      <p>Componente activo: {selectedComponentOption?.label ?? "(ninguno)"}</p>
                      <p>Clave: {selectedComponentOption?.key ?? "-"}</p>
                      <p>Rol activo: {selectedComponentRole ? getRoleLabel(selectedComponentRole, editingPalette) : "-"}</p>
                    </div>

                    {selectedComponentRole && editingPalette && (
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                        <div className="rounded border border-stone-200 bg-white p-2">
                          <label className="mb-1 block text-[11px] font-semibold text-stone-600">Rol del componente</label>
                          <select
                            className="input-field h-8 w-full text-xs"
                            value={selectedComponentRole}
                            onChange={(event) => {
                              if (!selectedComponentOption) return;
                              patchEditingSectionComponentRole(selectedComponentOption.key, event.target.value as TemaColorRole);
                            }}
                          >
                            {availableRoleKeys.map((role) => (
                              <option key={role} value={role}>{getRoleLabel(role, editingPalette)}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-[11px] text-stone-500">
                            Componente: {selectedComponentOption?.label ?? "Selecciona un componente"}
                          </p>
                        </div>
                        <div className="rounded border border-stone-200 bg-white p-2">
                          <label className="mb-1 block text-[11px] font-semibold text-stone-600">Color del rol</label>
                          <select
                            className="input-field h-8 w-full text-xs"
                            value={editingPaletteRoleMap?.[selectedComponentRole] ?? ""}
                            onChange={(event) => applySwatchToRoleInEditingSection(selectedComponentRole, event.target.value)}
                          >
                            {editingPaletteSwatches.map((swatch) => (
                              <option key={swatch.id} value={swatch.id}>{swatch.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {editingPaletteRoleMap && editingPalette && (
                      <div className="rounded border border-stone-200 bg-white p-2">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <p className="text-[11px] font-semibold text-stone-600">Roles de la sección</p>
                          <input
                            className="h-7 min-w-[180px] rounded border border-stone-300 px-2 text-[11px]"
                            placeholder="Nuevo rol personalizado"
                            value={newCustomRoleName}
                            onChange={(event) => setNewCustomRoleName(event.target.value)}
                          />
                          <button
                            onClick={addCustomRoleToEditingPalette}
                            className="h-7 rounded border border-stone-300 bg-white px-2 text-[11px] text-stone-700"
                          >
                            + Añadir rol
                          </button>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-2">
                          {availableRoleKeys.map((role) => (
                            <label key={role} className="grid grid-cols-[1fr_130px] items-center gap-2 rounded border border-stone-200 bg-stone-50 px-2 py-1">
                              <span className="text-[11px] text-stone-700">{getRoleLabel(role, editingPalette)}</span>
                              <select
                                className="h-7 rounded border border-stone-300 bg-white px-1 text-[11px] text-stone-700"
                                value={editingPaletteRoleMap[role] ?? "cream"}
                                onChange={(event) => applySwatchToRoleInEditingSection(role, event.target.value)}
                              >
                                {editingPaletteSwatches.map((swatch) => (
                                  <option key={swatch.id} value={swatch.id}>{swatch.label}</option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              <div className="border-t border-stone-200" />

              <div className="flex flex-wrap items-center gap-2">
                <select className="input-field h-8 w-[170px] text-xs" value={previewRole} onChange={(e) => setPreviewRole(e.target.value)}>
                  {PROFILE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <select className="input-field h-8 w-[150px] text-xs" value={editorViewport} onChange={(e) => setEditorViewport(e.target.value as "desktop" | "movil")}>
                  <option value="desktop">Vista PC</option>
                  <option value="movil">Vista móvil</option>
                </select>
              </div>

              <div className="border-t border-stone-200" />
            </div>

            <div
              className="min-h-[560px] overflow-auto rounded-xl border"
              style={{
                backgroundColor: paletaActivaResolvedColors.cream ?? "#F7F3EC",
                borderColor: paletaActivaResolvedColors.bronzeLight ?? "#C4964A",
                color: paletaActivaResolvedColors.brownDark ?? "#2E1F0E",
              }}
            >
              <div
                style={{
                  ["--bronze" as string]: paletaActivaResolvedColors.bronze ?? "#8C6A3F",
                  ["--bronze-light" as string]: paletaActivaResolvedColors.bronzeLight ?? "#C4964A",
                  ["--bronze-pale" as string]: paletaActivaRoleColors?.nexosTransicionesBordes ?? paletaActivaResolvedColors.bronzeLight ?? "#C4964A",
                  ["--olive" as string]: paletaActivaResolvedColors.olive ?? "#5C6B3A",
                  ["--olive-muted" as string]: paletaActivaResolvedColors.oliveMuted ?? "#8A9468",
                  ["--cream" as string]: paletaActivaResolvedColors.cream ?? "#F7F3EC",
                  ["--cream-dark" as string]: paletaActivaRoleColors?.fondoSubseccion ?? paletaActivaResolvedColors.white ?? "#FDFAF5",
                  ["--brown-dark" as string]: paletaActivaResolvedColors.brownDark ?? "#2E1F0E",
                  ["--brown-mid" as string]: paletaActivaRoleColors?.textoSecundario ?? paletaActivaResolvedColors.oliveMuted ?? "#8A9468",
                  ["--white" as string]: paletaActivaResolvedColors.white ?? "#FDFAF5",
                  ["--font-display" as string]: fuentes.display,
                  ["--font-body" as string]: fuentes.body,
                }}
              >
                <main className={editorViewport === "movil" ? "mx-auto max-w-[430px]" : ""}>
                  {previewSectionsToRender.map((sec, idx) => {
                    const isLast = idx === previewSectionsToRender.length - 1;
                    const sectionIsBeingEdited = hasAnySectionInEditMode && editingSectionId === sec.id;
                    const designMode = sectionIsBeingEdited && sectionEditMode === "diseno";
                    const sectionThemeVars = getSectionThemeVars(sec);
                    const componentStyles = getSectionComponentStyles(sec);
                    return (
                      <div
                        key={sec.id}
                        ref={(node) => {
                          previewSectionRefs.current[sec.id] = node;
                        }}
                        style={sectionThemeVars}
                        className={`relative ${!hasAnySectionInEditMode && selectedSectionId === sec.id ? "ring-1 ring-amber-300" : ""}`}
                      >
                        {sec.tipo === "portada" && (
                          <SeccionColapsable id={`preview-${sec.id}`} abiertaPorDefecto={true} ocultarCabecera={true}>
                            <MainWithInvite
                              config={getPortadaConfig(sec)}
                              viewport={editorViewport}
                              editable={false}
                              designMode={designMode}
                              selectedComponentKey={designMode ? activeSelectedDesignComponentKey as HeroComponentKey | null : null}
                              onSelectComponent={(key) => setSelectedDesignComponentKey(key)}
                              componentStyles={componentStyles}
                              onEditBienvenida={setPortadaWelcomeText}
                            />
                          </SeccionColapsable>
                        )}

                        {sec.tipo === "historia" && (
                          <SeccionColapsable
                            id={`preview-${sec.id}`}
                            titulo={sec.titulo || "Nuestra historia"}
                            abiertaPorDefecto={sectionIsBeingEdited}
                            bgColor="var(--cream)"
                            designMode={designMode}
                            sectionStyle={componentStyles["historia.fondoSeccion"]}
                            sectionSelected={designMode && activeSelectedDesignComponentKey === "historia.fondoSeccion"}
                            titleStyle={componentStyles["historia.tituloSeccion"]}
                            titleSelected={designMode && activeSelectedDesignComponentKey === "historia.tituloSeccion"}
                            onSelectSectionBackground={() => setSelectedDesignComponentKey("historia.fondoSeccion")}
                            onSelectTitleDesign={() => setSelectedDesignComponentKey("historia.tituloSeccion")}
                          >
                            <SeccionHistoria
                              eventos={historyEventsForSection(sec)}
                              viewport={editorViewport}
                              editable={false}
                              designMode={designMode}
                              selectedComponentKey={designMode ? activeSelectedDesignComponentKey as HistoriaComponentKey | null : null}
                              onSelectComponent={(key) => setSelectedDesignComponentKey(key)}
                              componentStyles={componentStyles}
                              sectionInternalTitle={sec.subtituloInterno || "El camino hasta aquí"}
                            />
                          </SeccionColapsable>
                        )}

                        {sec.tipo === "galeria" && (
                          <SeccionColapsable
                            id={`preview-${sec.id}`}
                            titulo={sec.titulo || "Galería"}
                            abiertaPorDefecto={sectionIsBeingEdited}
                            bgColor="var(--cream)"
                            designMode={designMode}
                            sectionStyle={componentStyles["galeria.fondoSeccion"]}
                            sectionSelected={designMode && activeSelectedDesignComponentKey === "galeria.fondoSeccion"}
                            titleStyle={componentStyles["galeria.tituloSeccion"]}
                            titleSelected={designMode && activeSelectedDesignComponentKey === "galeria.tituloSeccion"}
                            onSelectSectionBackground={() => setSelectedDesignComponentKey("galeria.fondoSeccion")}
                            onSelectTitleDesign={() => setSelectedDesignComponentKey("galeria.tituloSeccion")}
                          >
                            <SeccionGaleria
                              media={galleryMediaForSection(sec)}
                              viewport={editorViewport}
                              editable={false}
                              designMode={designMode}
                              selectedComponentKey={designMode ? activeSelectedDesignComponentKey as GaleriaComponentKey | null : null}
                              onSelectComponent={(key) => setSelectedDesignComponentKey(key)}
                              componentStyles={componentStyles}
                            />
                          </SeccionColapsable>
                        )}

                        {sec.tipo === "timeline" && (
                          <SeccionColapsable
                            id={`preview-${sec.id}`}
                            titulo={sec.titulo || "El gran día"}
                            abiertaPorDefecto={sectionIsBeingEdited}
                            bgColor="var(--cream-dark)"
                            designMode={designMode}
                            sectionStyle={componentStyles["timeline.fondoSeccion"]}
                            sectionSelected={designMode && activeSelectedDesignComponentKey === "timeline.fondoSeccion"}
                            titleStyle={componentStyles["timeline.tituloSeccion"]}
                            titleSelected={designMode && activeSelectedDesignComponentKey === "timeline.tituloSeccion"}
                            onSelectSectionBackground={() => setSelectedDesignComponentKey("timeline.fondoSeccion")}
                            onSelectTitleDesign={() => setSelectedDesignComponentKey("timeline.tituloSeccion")}
                          >
                            <SeccionTimeline
                              localizaciones={ic.localizaciones}
                              timeline={timelineEventsForSection(sec)}
                              viewport={editorViewport}
                              editable={false}
                              designMode={designMode}
                              selectedComponentKey={designMode ? activeSelectedDesignComponentKey as TimelineComponentKey | null : null}
                              onSelectComponent={(key) => setSelectedDesignComponentKey(key)}
                              componentStyles={componentStyles}
                            />
                          </SeccionColapsable>
                        )}

                        {!isLast && buildPreviewSeparator(separador)}
                      </div>
                    );
                  })}

                  {previewSectionsToRender.length === 0 && (
                    <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                      No hay secciones visibles para este perfil.
                    </div>
                  )}
                </main>
              </div>
            </div>
          </section>
        </div>
    </div>
  );
}
