"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";
import PolygonRegionEditor from "@/components/admin/PolygonRegionEditor";
import { SeccionCarrusel } from "@/components/wedding/SeccionCarrusel";
import { isLikelyLineAliveHtmlUrl } from "@/lib/linealive/utils";
import { DEFAULT_TEXTO_INVITACION, ELEMENTOS_BARRA_POR_DEFECTO, normalizeIntroConfig } from "@/config/wedding.config";
import { buildDefaultLayout, buildDefaultPieConfig, buildDefaultPortadaLibre, normalizePieConfig, normalizePortadaLibre } from "@/lib/portada-libre";
import { normalizeSectionChains, preserveSectionChainNeighbors } from "@/lib/section-chains";
import {
  TIMELINE_LOGO_HORIZONTAL,
  TIMELINE_LOGO_RANGE,
  TIMELINE_LOGO_VERTICAL,
  clampTimelineLogoSize,
  resolveTimelineLogoAlign,
  resolveTimelineLogoSize,
  type TimelineLogoDevice,
} from "@/lib/timeline-logo-size";
import { parseNativeSvgAnimations, type NativeSvgAnimationOption } from "@/components/motion/AutoDrawSVG";
import type {
  ComportamientoBarraNavegacion,
  ElementoBarra,
  ElementoBarraId,
  PosicionElementoBarra,
  PortadaElemento,
  PortadaLibreConfig,
  EventoHistoria,
  EventoTimeline,
  IntroAnimationType,
  IntroDeviceConfig,
  IntroSeccionConfig,
  SeccionDiseno,
  TemaColorRole,
  TipoSeccionDiseno,
  WeddingConfig,
} from "@/config/wedding.config";

type ResourceItem = {
  id: string;
  nombre: string;
  google_drive_id: string | null;
  url_publica: string | null;
  mime_type: string | null;
  subido_por: string | null;
  carpeta: string | null;
  created_at: string;
};

const ICONO_OPTIONS: EventoTimeline["icono"][] = ["rings", "cocktail", "fork", "cake", "music", "car", "iglesia", "finca"];
const PROFILE_OPTIONS = ["publico", "familia", "amigos", "vip", "admin"] as const;
const SECTION_TYPES: Array<{ value: TipoSeccionDiseno; label: string }> = [
  { value: "intro", label: "Intro" },
  { value: "invitacion", label: "Invitacion" },
  { value: "portadaLibre", label: "Portada (formato libre)" },
  { value: "historia", label: "Historia" },
  { value: "timeline", label: "Timeline" },
  { value: "galeria", label: "Galeria" },
  { value: "carrusel", label: "Carrusel de fotos" },
  { value: "pie", label: "Pie de pagina personalizado" },
];

const INTRO_ANIMATION_TYPES: Array<{ value: IntroAnimationType; label: string; description: string }> = [
  { value: "revealBook", label: "Reveal Book", description: "Libro 3D: dos paneles giran para revelar la portada." },
  { value: "cortinas", label: "Cortinas", description: "Como Reveal Book pero los paneles se deslizan lateralmente (más ligero)." },
  { value: "fadeIn", label: "Fade in", description: "El media inicial se desvanece mientras aparece la portada." },
  { value: "focusRegion", label: "Focus on Region", description: "Zoom sobre una región del media hasta ocupar toda la pantalla y luego fade-in." },
  { value: "slideUp", label: "Slide up", description: "La portada sube desde abajo cubriendo el media inicial." },
  { value: "custom", label: "Custom (HTML)", description: "Carga un HTML propio a pantalla completa; él mismo avisa cuándo termina." },
  { value: "envelope", label: "Apertura de sobre", description: "El lacre aparece sobre un sobre postal cerrado; al romperse, la solapa se abre y la portada sale del sobre." },
];

function buildDefaultIntroDeviceConfig(): IntroDeviceConfig {
  return {
    tipo: "revealBook",
    revealBook: {
      panelIzquierdoUrl: "",
      panelDerechoUrl: "",
      duracionDibujoMs: 650,
      duracionAperturaMs: 1800,
      pausaAntesDeAbrirMs: 120,
      maxEsperaDibujoMs: 9000,
    },
  };
}

function buildDefaultIntroConfig(): IntroSeccionConfig {
  return {
    activo: true,
    repetir: "primeraVez",
    textoTitulo: "",
    textoSubtitulo: "",
    textoSaltar: "",
    lacreUrl: "",
    tamanoLacrePorcentaje: 24,
    duracionLacreMs: 900,
    pausaTrasTriggerMs: 0,
    bordeIntroPx: 0,
    pc: buildDefaultIntroDeviceConfig(),
    movil: buildDefaultIntroDeviceConfig(),
  };
}

const BANNER_ELEMENTO_LABEL: Record<ElementoBarraId, string> = {
  menu: "Menu",
  logo: "Logo",
  texto: "Texto",
};

type AssetPickerProps = {
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  uploading: boolean;
  onUpload: (file: File) => void;
  disabled: boolean;
  resources: ResourceItem[];
  placeholder: string;
  accept?: string;
};

function IntroAssetField({ label, value, onChangeValue, uploading, onUpload, disabled, resources, placeholder, accept }: AssetPickerProps) {
  const selectedResource = resources.find((resource) => {
    if (resource.url_publica === value) return true;
    if (!value || !resource.url_publica) return false;
    try {
      const current = new URL(value, window.location.origin);
      const candidate = new URL(resource.url_publica, window.location.origin);
      const currentSource = current.searchParams.get("src") ?? current.href;
      const candidateSource = candidate.searchParams.get("src") ?? candidate.href;
      return currentSource === candidateSource;
    } catch {
      return false;
    }
  });

  return (
    <div className="space-y-2">
      <label className="label-field">{label}</label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select
          className="input-field"
          value={selectedResource?.id ?? ""}
          onChange={(e) => {
            const resource = resources.find((entry) => entry.id === e.target.value) ?? null;
            onChangeValue(resource?.url_publica ?? "");
          }}
        >
          <option value="">Sin recurso (usar URL manual)</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>{resource.nombre}</option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
          {uploading ? "Subiendo..." : "Subir archivo"}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading || disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <input
        type="url"
        className="input-field font-mono text-xs"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
      />
    </div>
  );
}

type DualPanelValues = {
  panelIzquierdoUrl?: string;
  panelDerechoUrl?: string;
  duracionDibujoMs?: number;
  duracionAperturaMs?: number;
  pausaAntesDeAbrirMs?: number;
  maxEsperaDibujoMs?: number;
};

function DualPanelFields({
  values,
  resources,
  uploadingKey,
  onUpload,
  onChange,
  aperturaDefault,
  disabled,
}: {
  values: DualPanelValues;
  resources: ResourceItem[];
  uploadingKey: string | null;
  onUpload: (key: "panelIzquierdo" | "panelDerecho", file: File) => void;
  onChange: (patch: Partial<DualPanelValues>) => void;
  aperturaDefault: number;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <IntroAssetField
        label="Panel izquierdo"
        value={values.panelIzquierdoUrl ?? ""}
        onChangeValue={(v) => onChange({ panelIzquierdoUrl: v })}
        uploading={uploadingKey === "panelIzquierdo"}
        onUpload={(file) => onUpload("panelIzquierdo", file)}
        disabled={disabled}
        resources={resources}
        placeholder="/images/archivo.svg, /LineAlive/archivo.html o https://..."
      />
      <IntroAssetField
        label="Panel derecho"
        value={values.panelDerechoUrl ?? ""}
        onChangeValue={(v) => onChange({ panelDerechoUrl: v })}
        uploading={uploadingKey === "panelDerecho"}
        onUpload={(file) => onUpload("panelDerecho", file)}
        disabled={disabled}
        resources={resources}
        placeholder="/images/archivo.svg, /LineAlive/archivo.html o https://..."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label-field">Tiempo de pintado (ms)</label>
          <input
            type="number"
            min={200}
            max={5000}
            step={50}
            className="input-field"
            value={values.duracionDibujoMs ?? 650}
            onChange={(e) => onChange({ duracionDibujoMs: Math.max(200, Number(e.target.value) || 200) })}
          />
        </div>
        <div>
          <label className="label-field">Pausa antes de abrir (ms)</label>
          <input
            type="number"
            min={0}
            max={5000}
            step={50}
            className="input-field"
            value={values.pausaAntesDeAbrirMs ?? 120}
            onChange={(e) => onChange({ pausaAntesDeAbrirMs: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div>
          <label className="label-field">Duracion de apertura (ms)</label>
          <input
            type="number"
            min={300}
            max={5000}
            step={50}
            className="input-field"
            value={values.duracionAperturaMs ?? aperturaDefault}
            onChange={(e) => onChange({ duracionAperturaMs: Math.max(300, Number(e.target.value) || 300) })}
          />
        </div>
        <div>
          <label className="label-field">Espera maxima del dibujo (ms)</label>
          <input
            type="number"
            min={2000}
            max={20000}
            step={100}
            className="input-field"
            value={values.maxEsperaDibujoMs ?? 9000}
            onChange={(e) => onChange({ maxEsperaDibujoMs: Math.max(2000, Number(e.target.value) || 2000) })}
          />
        </div>
      </div>
    </div>
  );
}

function normalizeSectionType(tipo: TipoSeccionDiseno): TipoSeccionDiseno {
  return tipo === "portada" ? "invitacion" : tipo;
}

function isInvitationType(tipo: TipoSeccionDiseno): boolean {
  return tipo === "invitacion" || tipo === "portada";
}

// Como maximo puede existir un pie de pagina personalizado por configuracion.
function hasPieSection(sections: SeccionDiseno[], excludeId?: string): boolean {
  return sections.some((section) => section.tipo === "pie" && section.id !== excludeId);
}

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
  if (tipo === "carrusel") return {
    "carrusel.tituloSeccion": "tituloSeccion",
    "carrusel.fondoSeccion": "fondoSeccion",
    "carrusel.navegacion": "textoPrincipal",
  };
  if (tipo === "portadaLibre" || tipo === "pie") return {};
  if (tipo === "intro") {
    return {
      "intro.fondo": "fondoSeccion",
      "intro.lacre": "logo",
      "intro.sobre": "fondoSubseccion",
      "intro.titulo": "titulo",
    };
  }
  if (isInvitationType(tipo)) {
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
      "timeline.fecha": "titulo",
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
    "galeria.tituloInterno": "titulo",
    "galeria.tabTextoActivo": "textoBoton",
    "galeria.tabFondoActivo": "fondoBoton",
    "galeria.tabTextoInactivo": "textoBoton",
    "galeria.tabFondoInactivo": "fondoBoton",
    "galeria.tituloSeccion": "tituloSeccion",
    "galeria.fondoSeccion": "fondoSeccion",
    "galeria.card": "fondoSubseccion",
    "galeria.imagen": "bordes",
    "galeria.titulo": "textoPrincipal",
    "galeria.subtitulo": "textoSecundario",
  };
}

function sectionTitleByType(tipo: TipoSeccionDiseno): string {
  if (tipo === "carrusel") return "Fotos";
  if (tipo === "intro") return "Intro";
  if (tipo === "portadaLibre") return "Portada";
  if (tipo === "pie") return "Pie de pagina";
  if (isInvitationType(tipo)) return "Invitacion";
  if (tipo === "historia") return "Nuestra historia";
  if (tipo === "timeline") return "El gran dia";
  return "Galeria";
}

function sectionNameByType(tipo: TipoSeccionDiseno): string {
  if (tipo === "carrusel") return "Carrusel";
  if (tipo === "intro") return "Intro";
  if (tipo === "portadaLibre") return "Portada";
  if (tipo === "pie") return "Pie de pagina";
  if (isInvitationType(tipo)) return "Invitacion";
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
    lineAlive: item.lineAlive,
  }));
}

function mapTimelineToItems(timeline: EventoTimeline[]) {
  return timeline.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    descripcion: item.descripcion,
    hora: item.hora,
    icono: item.icono,
    imagen: item.imagen,
    logoTamano: item.logoTamano,
    logoAlineacion: item.logoAlineacion,
    enlaceMaps: "",
  }));
}

function buildInitialSections(config: WeddingConfig): SeccionDiseno[] {
  const paletaId = config.tema.paletaActivaId ?? config.tema.paletas?.[0]?.id ?? "";
  const fallback: SeccionDiseno[] = [
    {
      id: `sec-${uid()}`,
      nombre: "Invitacion",
      titulo: "Invitacion",
      tipo: "invitacion",
      paletaId,
      usarPaletaGlobal: true,
      visible: true,
      menuDirecto: false,
      perfiles: ["publico"],
      componentRoles: getDefaultComponentRoles("invitacion"),
      items: [
        {
          id: `item-${uid()}`,
          titulo: "Invitacion",
          descripcion: config.textos.bienvenida || DEFAULT_TEXTO_INVITACION,
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
      menuDirecto: false,
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
      menuDirecto: false,
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
      menuDirecto: false,
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
    const tipoNormalizado = normalizeSectionType(section.tipo);
    const baseItems = section.items ?? [];
    const hasItems = baseItems.length > 0;

    return {
      ...section,
      tipo: tipoNormalizado,
      nombre: section.nombre || sectionNameByType(tipoNormalizado),
      titulo: section.titulo || sectionTitleByType(tipoNormalizado),
      paletaId: section.paletaId || paletaId,
      usarPaletaGlobal: section.usarPaletaGlobal ?? true,
      menuDirecto: section.menuDirecto ?? false,
      visible: section.visible ?? true,
      perfiles: section.perfiles?.length ? section.perfiles : ["publico"],
      componentRoles: {
        ...getDefaultComponentRoles(tipoNormalizado),
        ...(section.componentRoles ?? {}),
      },
      items:
        hasItems
          ? baseItems
          : isInvitationType(tipoNormalizado)
            ? [{ id: `item-${uid()}`, titulo: "Invitacion", descripcion: config.textos.bienvenida || DEFAULT_TEXTO_INVITACION }]
            : tipoNormalizado === "historia"
              ? mapHistoriaToItems(config.historia)
              : tipoNormalizado === "timeline"
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
    lineAlive: item.lineAlive,
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
    imagen: item.imagen || undefined,
    logoTamano: item.logoTamano,
    logoAlineacion: item.logoAlineacion,
  }));
}

export default function ContenidoView({ inviteCode, config }: { inviteCode: string; config: WeddingConfig }) {
  const initialSections = useMemo(() => buildInitialSections(config), [config]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [sections, setSections] = useState<SeccionDiseno[]>(initialSections);
  const [navegacionComportamiento, setNavegacionComportamiento] = useState<ComportamientoBarraNavegacion>(
    config.diseno?.navegacion?.comportamiento ?? "siempre_visible",
  );
  const [bannerTexto, setBannerTexto] = useState(config.diseno?.navegacion?.texto ?? "");
  const [bannerLogoUrl, setBannerLogoUrl] = useState(config.diseno?.navegacion?.logoUrl ?? "");
  const [bannerLogoAncho, setBannerLogoAncho] = useState(config.diseno?.navegacion?.logoAnchoPx ?? 0);
  const [bannerLogoAlto, setBannerLogoAlto] = useState(config.diseno?.navegacion?.logoAltoPx ?? 0);
  const [bannerLogoMantenerAspecto, setBannerLogoMantenerAspecto] = useState(config.diseno?.navegacion?.logoMantenerAspecto ?? false);
  const [bannerLogoAspectoFijar, setBannerLogoAspectoFijar] = useState<"ancho" | "alto">(config.diseno?.navegacion?.logoAspectoFijar ?? "ancho");
  const [bannerLogoAspectoAlineacion, setBannerLogoAspectoAlineacion] = useState(config.diseno?.navegacion?.logoAspectoAlineacion ?? "centroVertical");
  const [bannerLogoAnchoManual, setBannerLogoAnchoManual] = useState(config.diseno?.navegacion?.logoAnchoManualPx ?? config.diseno?.navegacion?.logoAnchoPx ?? 0);
  const [bannerLogoAltoManual, setBannerLogoAltoManual] = useState(config.diseno?.navegacion?.logoAltoManualPx ?? config.diseno?.navegacion?.logoAltoPx ?? 0);
  const [bannerLogoColor, setBannerLogoColor] = useState(config.diseno?.navegacion?.logoColor ?? "");
  const [bannerFondoColor, setBannerFondoColor] = useState(config.diseno?.navegacion?.fondoColor ?? "");
  const [bannerTextoTamano, setBannerTextoTamano] = useState(config.diseno?.navegacion?.textoTamanoPx ?? 0);
  const [bannerTextoColor, setBannerTextoColor] = useState(config.diseno?.navegacion?.textoColor ?? "");
  const [bannerElementos, setBannerElementos] = useState<ElementoBarra[]>(() => {
    const guardados = (config.diseno?.navegacion?.elementos ?? []).filter((el) =>
      ELEMENTOS_BARRA_POR_DEFECTO.some((d) => d.id === el.id),
    );
    return [...guardados, ...ELEMENTOS_BARRA_POR_DEFECTO.filter((d) => !guardados.some((el) => el.id === d.id))];
  });
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSections[0]?.id ?? "");
  const [newSectionType, setNewSectionType] = useState<TipoSeccionDiseno>("invitacion");
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploadingHistoriaId, setUploadingHistoriaId] = useState<string | null>(null);
  const [uploadingAssetKey, setUploadingAssetKey] = useState<string | null>(null);
  const [uploadingCarrusel, setUploadingCarrusel] = useState(false);
  const [introDeviceTab, setIntroDeviceTab] = useState<"pc" | "movil">("pc");
  const [lacreNativeAnimations, setLacreNativeAnimations] = useState<NativeSvgAnimationOption[]>([]);
  const [lineAliveGenerating, setLineAliveGenerating] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{ itemId: string; x: number; y: number } | null>(null);

  const recursosDriveConfigured = Boolean(config.drive.recursosWeb.folderId.trim());

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0],
    [sections, selectedSectionId],
  );

  const introConfig = useMemo(
    () => (selectedSection?.tipo === "intro" ? normalizeIntroConfig(selectedSection.intro) ?? buildDefaultIntroConfig() : undefined),
    [selectedSection],
  );

  useEffect(() => {
    const lacreUrl = introConfig?.lacreUrl?.trim();
    if (!lacreUrl) {
      setLacreNativeAnimations([]);
      return;
    }

    let cancelled = false;
    const loadAnimations = async () => {
      try {
        const response = await fetch(lacreUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudo leer el SVG");
        const markup = await response.text();
        if (!cancelled) setLacreNativeAnimations(parseNativeSvgAnimations(markup));
      } catch {
        if (!cancelled) setLacreNativeAnimations([]);
      }
    };

    void loadAnimations();
    return () => {
      cancelled = true;
    };
  }, [introConfig?.lacreUrl]);

  const resourcesForSelectedSection = useMemo(() => {
    const sectionName = selectedSection?.tipo.toLowerCase();
    if (!sectionName) return [];
    return resources.filter((item) => (item.carpeta ?? "").trim().toLowerCase() === sectionName);
  }, [resources, selectedSection?.tipo]);
  const imageResourcesForSelectedSection = resourcesForSelectedSection.filter(
    (item) => item.mime_type?.startsWith("image/") || item.mime_type === null,
  );
  const resourcesForIntro = resourcesForSelectedSection;

  const findResourceByImageUrl = useCallback(
    (imageUrl?: string) => resources.find((item) => item.url_publica === imageUrl) ?? null,
    [resources],
  );

  const buildAdminLineAliveSrc = useCallback(
    (fileId: string) => `/api/admin/${encodeURIComponent(inviteCode)}/resources/linealive/html?fileId=${encodeURIComponent(fileId)}`,
    [inviteCode],
  );

  const showMsg = (type: "ok" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  useEffect(() => {
    const loadResources = async () => {
      setLoadingResources(true);
      try {
        if (!selectedSection) {
          setResources([]);
          return;
        }
        const response = await fetch(`/api/admin/${inviteCode}/resources?section=${encodeURIComponent(selectedSection.tipo)}`);
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
  }, [inviteCode, selectedSection?.tipo]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  const patchSection = (sectionId: string, patch: Partial<SeccionDiseno>) => {
    setSections((prev) => prev.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)));
  };

  const patchSelectedItems = (updater: (items: SeccionDiseno["items"]) => SeccionDiseno["items"]) => {
    if (!selectedSection) return;
    patchSection(selectedSection.id, { items: updater(selectedSection.items ?? []) });
  };

  const patchBannerElemento = (id: ElementoBarraId, patch: Partial<ElementoBarra>) => {
    setBannerElementos((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  };

  const moveBannerElemento = (index: number, delta: -1 | 1) => {
    setBannerElementos((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const patchIntro = (patch: Partial<IntroSeccionConfig>) => {
    if (!selectedSection) return;
    const base = normalizeIntroConfig(selectedSection.intro) ?? buildDefaultIntroConfig();
    patchSection(selectedSection.id, { intro: { ...base, ...patch } });
  };

  const patchIntroDevice = (device: "pc" | "movil", patch: Partial<IntroDeviceConfig>) => {
    if (!selectedSection) return;
    const base = normalizeIntroConfig(selectedSection.intro) ?? buildDefaultIntroConfig();
    const currentDevice = base[device] ?? buildDefaultIntroDeviceConfig();
    patchSection(selectedSection.id, { intro: { ...base, [device]: { ...currentDevice, ...patch } } });
  };

  type IntroSubKey = "revealBook" | "cortinas" | "fadeIn" | "focusRegion" | "slideUp" | "custom" | "envelope";

  const patchIntroDeviceSub = (device: "pc" | "movil", sub: IntroSubKey, patch: Record<string, unknown>) => {
    if (!selectedSection) return;
    const base = normalizeIntroConfig(selectedSection.intro) ?? buildDefaultIntroConfig();
    const currentDevice = base[device] ?? buildDefaultIntroDeviceConfig();
    const currentSub = (currentDevice[sub] as Record<string, unknown> | undefined) ?? {};
    patchSection(selectedSection.id, {
      intro: { ...base, [device]: { ...currentDevice, [sub]: { ...currentSub, ...patch } } },
    });
  };

  const uploadGenericAsset = async (key: string, file: File, onDone: (url: string) => void) => {
    const section = selectedSection?.tipo;
    if (!section) {
      showMsg("error", "Selecciona una sección antes de subir el archivo");
      return;
    }
    setUploadingAssetKey(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("section", section);
      const response = await fetch(`/api/admin/${inviteCode}/resources`, {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "No se pudo subir el archivo");
      }
      const resource = (data as { resource?: ResourceItem }).resource;
      if (!resource?.url_publica) {
        throw new Error("La subida no devolvio una URL publica");
      }
      onDone(resource.url_publica);
      setResources((prev) => [resource, ...prev]);
      showMsg("ok", "Archivo subido y asociado");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al subir archivo");
    } finally {
      setUploadingAssetKey(null);
    }
  };


  const addSection = () => {
    if (newSectionType === "pie" && hasPieSection(sections)) {
      showMsg("error", "Ya existe un pie de pagina personalizado. Solo puede haber uno por configuracion.");
      return;
    }
    const section: SeccionDiseno = {
      id: `sec-${uid()}`,
      nombre: sectionNameByType(newSectionType),
      titulo: sectionTitleByType(newSectionType),
      tipo: newSectionType,
      paletaId: selectedSection?.paletaId ?? config.tema.paletaActivaId ?? config.tema.paletas?.[0]?.id ?? "",
      usarPaletaGlobal: true,
      visible: true,
      encadenarAnterior: false,
      perfiles: ["publico"],
      componentRoles: getDefaultComponentRoles(newSectionType),
      intro: newSectionType === "intro" ? buildDefaultIntroConfig() : undefined,
      portadaLibre: newSectionType === "portadaLibre" ? buildDefaultPortadaLibre() : undefined,
      pie: newSectionType === "pie" ? buildDefaultPieConfig() : undefined,
      items:
        isInvitationType(newSectionType)
          ? [{ id: `item-${uid()}`, titulo: "Invitacion", descripcion: config.textos.bienvenida || DEFAULT_TEXTO_INVITACION }]
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
    if (source.tipo === "pie") {
      showMsg("error", "El pie de pagina personalizado no se puede clonar: solo puede haber uno.");
      return;
    }
    const clone: SeccionDiseno = {
      ...source,
      id: `sec-${uid()}`,
      nombre: `${source.nombre} copia`,
      encadenarAnterior: false,
      items: source.items.map((item) => ({ ...item, id: `item-${uid()}` })),
    };
    setSections((prev) => [...prev, clone]);
    setSelectedSectionId(clone.id);
  };

  const removeSection = (sectionId: string) => {
    if (!confirm("Eliminar esta seccion?")) return;
    setSections((prev) => {
      const next = preserveSectionChainNeighbors(prev, prev.filter((section) => section.id !== sectionId));
      setSelectedSectionId(next[0]?.id ?? "");
      return next;
    });
  };

  // El pie de pagina personalizado se renderiza siempre al final: no se puede reordenar.
  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.id === sectionId);
      if (index < 0 || prev[index].tipo === "pie") return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length || prev[target].tipo === "pie") return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return preserveSectionChainNeighbors(prev, next);
    });
  };

  const updateHistoriaItem = (itemId: string, field: "titulo" | "descripcion" | "hora" | "imagen", value: string) => {
    patchSelectedItems((items) =>
      items.map((item) => {
        if (item.id !== itemId) return item;
        if (field === "imagen") {
          return {
            ...item,
            imagen: value,
            lineAlive: undefined,
          };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const patchHistoriaItem = (itemId: string, updater: (item: SeccionDiseno["items"][number]) => SeccionDiseno["items"][number]) => {
    patchSelectedItems((items) => items.map((item) => (item.id === itemId ? updater(item) : item)));
  };

  const updateTimelineItem = (itemId: string, field: "hora" | "titulo" | "descripcion" | "icono" | "enlaceMaps" | "imagen", value: string) => {
    patchSelectedItems((items) => items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
  };

  // value undefined restablece el tamano de ese dispositivo al valor por defecto.
  const updateTimelineLogoSize = (itemId: string, device: TimelineLogoDevice, value: number | undefined) => {
    patchSelectedItems((items) =>
      items.map((item) => {
        if (item.id !== itemId) return item;
        const next = { ...(item.logoTamano ?? {}) };
        if (value === undefined || !Number.isFinite(value)) delete next[device];
        else next[device] = clampTimelineLogoSize(value, device);
        return { ...item, logoTamano: Object.keys(next).length > 0 ? next : undefined };
      }),
    );
  };

  const updateTimelineLogoAlign = (
    itemId: string,
    device: TimelineLogoDevice,
    axis: "vertical" | "horizontal",
    value: string,
  ) => {
    patchSelectedItems((items) =>
      items.map((item) => {
        if (item.id !== itemId) return item;
        const current = resolveTimelineLogoAlign(item.logoAlineacion, device);
        const nextDevice = { ...current, [axis]: value };
        return { ...item, logoAlineacion: { ...(item.logoAlineacion ?? {}), [device]: nextDevice } };
      }),
    );
  };

  const moveSelectedItem = (itemId: string, direction: "up" | "down") => {
    patchSelectedItems((items) => {
      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) return items;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const uploadHistoriaImage = async (itemId: string, file: File) => {
    setUploadingHistoriaId(itemId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const section = selectedSection?.tipo;
      if (!section) throw new Error("Selecciona una sección antes de subir la imagen");
      formData.append("section", section);
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
      patchHistoriaItem(itemId, (item) => ({
        ...item,
        imagen: resource.url_publica ?? "",
        lineAlive: undefined,
      }));
      setResources((prev) => [resource, ...prev]);
      showMsg("ok", "Imagen subida y asociada a la historia");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al subir imagen");
    } finally {
      setUploadingHistoriaId(null);
    }
  };

  const toggleLineAliveForItem = async (item: SeccionDiseno["items"][number]) => {
    const resource = findResourceByImageUrl(item.imagen);
    if (!resource?.id || !resource.google_drive_id) {
      showMsg("error", "LineAlive solo esta disponible para imagenes subidas a recursos.");
      return;
    }

    setContextMenu(null);

    if (item.lineAlive?.enabled) {
      patchHistoriaItem(item.id, (current) => ({
        ...current,
        lineAlive: current.lineAlive ? { ...current.lineAlive, enabled: false } : current.lineAlive,
      }));
      return;
    }

    if (item.lineAlive?.htmlDriveFileId && item.lineAlive.sourceResourceId === resource.id) {
      patchHistoriaItem(item.id, (current) => ({
        ...current,
        lineAlive: current.lineAlive ? { ...current.lineAlive, enabled: true } : current.lineAlive,
      }));
      return;
    }

    await generateLineAliveForItem(item, resource.id);
  };

  const generateLineAliveForItem = async (
    item: SeccionDiseno["items"][number],
    resourceId: string,
    successMessage = "Animacion LineAlive generada. Pulsa Guardar cambios para publicarla en la web.",
  ) => {
    setContextMenu(null);

    setLineAliveGenerating((prev) => ({ ...prev, [item.id]: true }));

    try {
      const response = await fetch(`/api/admin/${inviteCode}/resources/linealive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, detail: "medium" }),
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "No se pudo generar la animacion LineAlive");
      }

      const lineAlive = (data as { lineAlive?: SeccionDiseno["items"][number]["lineAlive"] }).lineAlive;
      if (!lineAlive?.htmlDriveFileId) {
        throw new Error("LineAlive no devolvio el archivo HTML esperado");
      }

      patchHistoriaItem(item.id, (current) => ({
        ...current,
        lineAlive: { ...lineAlive, enabled: true },
      }));
      showMsg("ok", successMessage);
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error generando LineAlive");
    } finally {
      setLineAliveGenerating((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const regenerateLineAliveForItem = async (item: SeccionDiseno["items"][number]) => {
    const resource = findResourceByImageUrl(item.imagen);
    if (!resource?.id || !resource.google_drive_id) {
      showMsg("error", "LineAlive solo esta disponible para imagenes subidas a recursos.");
      return;
    }

    await generateLineAliveForItem(item, resource.id, "Animacion LineAlive regenerada. Pulsa Guardar cambios para publicarla en la web.");
  };

  const disableLineAliveForItem = (itemId: string) => {
    patchHistoriaItem(itemId, (current) => ({
      ...current,
      lineAlive: current.lineAlive ? { ...current.lineAlive, enabled: false } : current.lineAlive,
    }));
    setContextMenu(null);
  };

  const openHistoriaContextMenu = (event: React.MouseEvent<HTMLDivElement>, itemId: string, imageUrl?: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!findResourceByImageUrl(imageUrl ?? "")) {
      showMsg("error", "LineAlive solo esta disponible para imagenes subidas a recursos.");
      return;
    }
    setContextMenu({ itemId, x: event.clientX, y: event.clientY });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const firstInvitation = sections.find((section) => isInvitationType(section.tipo));
      const firstHistoria = sections.find((section) => section.tipo === "historia");
      const firstTimeline = sections.find((section) => section.tipo === "timeline");

      const bienvenida = firstInvitation?.items?.[0]?.descripcion?.trim() || DEFAULT_TEXTO_INVITACION;
      const historia = firstHistoria ? mapHistoriaItemsToConfig(firstHistoria.items) : config.historia;
      const timeline = firstTimeline ? mapTimelineItemsToConfig(firstTimeline.items) : config.timeline;

      const response = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diseno: {
            ...(config.diseno ?? {}),
            secciones: normalizeSectionChains(sections),
            navegacion: {
              comportamiento: navegacionComportamiento,
              texto: bannerTexto.trim(),
              logoUrl: bannerLogoUrl.trim(),
              logoAnchoPx: bannerLogoAncho,
              logoAltoPx: bannerLogoAlto,
              logoMantenerAspecto: bannerLogoMantenerAspecto,
              logoAspectoFijar: bannerLogoAspectoFijar,
              logoAspectoAlineacion: bannerLogoAspectoAlineacion,
              logoAnchoManualPx: bannerLogoAnchoManual,
              logoAltoManualPx: bannerLogoAltoManual,
              logoColor: bannerLogoColor,
              fondoColor: bannerFondoColor,
              textoTamanoPx: bannerTextoTamano,
              textoColor: bannerTextoColor,
              elementos: bannerElementos,
            },
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

      {!recursosDriveConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Falta configurar la carpeta de Google Drive para recursos web. Hazlo en Datos Boda antes de subir imágenes nuevas.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4 self-start lg:sticky lg:top-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold text-stone-700">Estructura</h2>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select className="input-field" value={newSectionType} onChange={(e) => setNewSectionType(e.target.value as TipoSeccionDiseno)}>
                {SECTION_TYPES.filter((option) => option.value !== "pie" || !hasPieSection(sections)).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button onClick={addSection} className="rounded-xl border border-stone-300 px-3 text-sm text-stone-700 hover:bg-stone-50">
                + Anadir
              </button>
            </div>

            <div className="space-y-2">
              {sections.map((section, index) => {
                const isPie = section.tipo === "pie";
                return (
                <article
                  key={section.id}
                  className={`rounded-xl border p-3 ${selectedSection?.id === section.id ? "border-amber-400 bg-amber-50/50" : "border-stone-200 bg-stone-50"}`}
                >
                  <button onClick={() => setSelectedSectionId(section.id)} className="w-full text-left">
                    <p className="text-xs font-semibold text-stone-800">{section.nombre || sectionNameByType(section.tipo)}</p>
                    <p className="text-[11px] text-stone-500">{section.titulo || sectionTitleByType(section.tipo)} · {section.tipo}</p>
                    {section.encadenarAnterior && <p className="text-[11px] text-amber-800">Encadenada a la anterior</p>}
                    {isPie && <p className="text-[11px] text-amber-800">Siempre al final · no colapsable</p>}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button onClick={() => moveSection(section.id, "up")} disabled={isPie || index === 0} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40">↑</button>
                    <button onClick={() => moveSection(section.id, "down")} disabled={isPie || index === sections.length - 1} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40">↓</button>
                    <button onClick={() => duplicateSection(section.id)} disabled={isPie} className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40">Clonar</button>
                    <button onClick={() => removeSection(section.id)} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-600">Eliminar</button>
                  </div>
                </article>
                );
              })}
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
                        encadenarAnterior: tipo === "pie" ? false : selectedSection.encadenarAnterior,
                        intro: tipo === "intro" ? selectedSection.intro ?? buildDefaultIntroConfig() : selectedSection.intro,
                        portadaLibre: tipo === "portadaLibre" ? selectedSection.portadaLibre ?? buildDefaultPortadaLibre() : selectedSection.portadaLibre,
                        pie: tipo === "pie" ? selectedSection.pie ?? buildDefaultPieConfig() : selectedSection.pie,
                        items:
                          isInvitationType(tipo)
                            ? [{ id: `item-${uid()}`, titulo: "Invitacion", descripcion: config.textos.bienvenida || DEFAULT_TEXTO_INVITACION }]
                            : [],
                      });
                    }}
                  >
                    {SECTION_TYPES.filter((option) => option.value !== "pie" || selectedSection.tipo === "pie" || !hasPieSection(sections)).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                {selectedSection.tipo === "pie" && (
                  <p className="text-xs text-stone-500 sm:col-span-2">
                    El pie de página siempre se muestra al final del contenido y nunca es colapsable. Ajusta sus elementos, colores y posición (PC/móvil) igual que en Portada.
                  </p>
                )}
                {selectedSection.tipo === "portadaLibre" && (() => {
                  const portada = normalizePortadaLibre(selectedSection.portadaLibre);
                  return (
                    <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                      <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={portada.mostrarTitulo ?? false}
                          onChange={(e) => patchSection(selectedSection.id, { portadaLibre: { ...portada, mostrarTitulo: e.target.checked } })}
                        />
                        Mostrar título en la cabecera
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={portada.colapsable !== false}
                          onChange={(e) => patchSection(selectedSection.id, { portadaLibre: { ...portada, colapsable: e.target.checked } })}
                        />
                        Permitir colapsar la sección
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={portada.abiertaPorDefecto !== false}
                          onChange={(e) => patchSection(selectedSection.id, { portadaLibre: { ...portada, abiertaPorDefecto: e.target.checked } })}
                        />
                        Abierta por defecto
                      </label>
                    </div>
                  );
                })()}
                <div className="flex flex-wrap items-end gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={selectedSection.visible}
                      onChange={(e) => patchSection(selectedSection.id, { visible: e.target.checked })}
                    />
                    Seccion visible
                  </label>
                  {selectedSection.tipo !== "pie" && (
                    <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={selectedSection.menuDirecto ?? false}
                        onChange={(e) => patchSection(selectedSection.id, { menuDirecto: e.target.checked })}
                      />
                      Acceso directo en menu
                    </label>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  {selectedSection.tipo === "pie"
                    ? selectedSection.visible
                      ? "Pie de página visible: sustituye al pie por defecto, siempre al final."
                      : "Pie de página oculto: se muestra el pie por defecto."
                    : selectedSection.visible && selectedSection.menuDirecto
                    ? "Accesible en pantalla principal y desde el menu."
                    : selectedSection.visible
                    ? "Solo visible en pantalla principal."
                    : selectedSection.menuDirecto
                    ? "Accesible solo desde el menu (vista independiente)."
                    : "Seccion solo en desarrollo (no visible para invitados)."}
                </p>
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

              {selectedSection.tipo === "intro" && introConfig && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-stone-700">Intro</h3>

                  <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={introConfig.activo}
                      onChange={(e) => patchIntro({ activo: e.target.checked })}
                    />
                    Intro activa
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label-field">Repetir</label>
                      <select
                        className="input-field"
                        value={introConfig.repetir}
                        onChange={(e) => patchIntro({ repetir: e.target.value as "siempre" | "primeraVez" })}
                      >
                        <option value="primeraVez">Solo la primera vez</option>
                        <option value="siempre">Cada visita</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Ancho del borde (px)</label>
                      <input
                        type="number"
                        min={0}
                        max={48}
                        className="input-field"
                        value={introConfig.bordeIntroPx ?? 0}
                        onChange={(e) => patchIntro({ bordeIntroPx: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label-field">Titulo</label>
                      <input className="input-field" value={introConfig.textoTitulo ?? ""} onChange={(e) => patchIntro({ textoTitulo: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-field">Subtitulo</label>
                      <input className="input-field" value={introConfig.textoSubtitulo ?? ""} onChange={(e) => patchIntro({ textoSubtitulo: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-field">Texto para saltar</label>
                      <input className="input-field" value={introConfig.textoSaltar ?? ""} onChange={(e) => patchIntro({ textoSaltar: e.target.value })} />
                    </div>
                  </div>

                  <IntroAssetField
                    label="Lacre (sello inicial)"
                    value={introConfig.lacreUrl ?? ""}
                    onChangeValue={(v) => patchIntro({ lacreUrl: v })}
                    uploading={uploadingAssetKey === "lacre"}
                    onUpload={(file) => void uploadGenericAsset("lacre", file, (url) => patchIntro({ lacreUrl: url }))}
                    disabled={!recursosDriveConfigured}
                    resources={resourcesForIntro}
                    placeholder="/images/archivo.svg o https://..."
                    accept="image/*"
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label-field">Tamano del lacre (% de pantalla): {introConfig.tamanoLacrePorcentaje ?? 24}%</label>
                      <input
                        type="range"
                        min={5}
                        max={40}
                        step={1}
                        className="w-full accent-stone-700"
                        value={introConfig.tamanoLacrePorcentaje ?? 24}
                        onChange={(e) => patchIntro({ tamanoLacrePorcentaje: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label-field">Duracion del lacre (ms)</label>
                      <input
                        type="number"
                        min={300}
                        max={5000}
                        step={50}
                        className="input-field"
                        value={introConfig.duracionLacreMs ?? 900}
                        onChange={(e) => patchIntro({ duracionLacreMs: Math.max(300, Number(e.target.value) || 300) })}
                      />
                    </div>
                    <div>
                      <label className="label-field">Espera tras trigger (ms)</label>
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        step={50}
                        className="input-field"
                        value={introConfig.pausaTrasTriggerMs ?? 0}
                        onChange={(e) => patchIntro({ pausaTrasTriggerMs: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </div>
                  </div>

                  {lacreNativeAnimations.length > 0 && (
                    <div>
                      <label className="label-field">Animacion trigger del lacre</label>
                      <select
                        className="input-field"
                        value={introConfig.lacreTriggerAnimationId ?? ""}
                        onChange={(e) => patchIntro({ lacreTriggerAnimationId: e.target.value || undefined })}
                      >
                        <option value="">{lacreNativeAnimations.length === 1 ? "Automatica (unica animacion)" : "Selecciona una animacion"}</option>
                        {lacreNativeAnimations.map((animation) => (
                          <option key={animation.id} value={animation.id}>{animation.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-stone-500">
                        Selecciona qué animación del SVG debe disparar la transición a la siguiente fase.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-stone-200 pt-4">
                    <p className="label-field">Animacion tras el lacre (independiente por dispositivo)</p>
                    <div className="mt-2 inline-flex rounded-xl border border-stone-300 p-1 text-sm">
                      {(["pc", "movil"] as const).map((device) => (
                        <button
                          key={device}
                          type="button"
                          className={`rounded-lg px-3 py-1.5 font-semibold ${introDeviceTab === device ? "bg-stone-800 text-white" : "text-stone-600 hover:bg-stone-100"}`}
                          onClick={() => setIntroDeviceTab(device)}
                        >
                          {device === "pc" ? "PC" : "Movil"}
                        </button>
                      ))}
                    </div>

                    {(["pc", "movil"] as const)
                      .filter((device) => device === introDeviceTab)
                      .map((device) => {
                        const deviceConfig = introConfig[device] ?? buildDefaultIntroDeviceConfig();
                        const uploadPrefix = `${device}-`;
                        return (
                          <div key={device} className="mt-3 space-y-3">
                            <div>
                              <label className="label-field">Tipo de animacion</label>
                              <select
                                className="input-field"
                                value={deviceConfig.tipo}
                                onChange={(e) => patchIntroDevice(device, { tipo: e.target.value as IntroAnimationType })}
                              >
                                {INTRO_ANIMATION_TYPES.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              <p className="mt-1 text-xs text-stone-500">
                                {INTRO_ANIMATION_TYPES.find((option) => option.value === deviceConfig.tipo)?.description}
                              </p>
                            </div>

                            {(deviceConfig.tipo === "revealBook" || deviceConfig.tipo === "cortinas") && (
                              <DualPanelFields
                                values={deviceConfig[deviceConfig.tipo] ?? {}}
                                resources={resourcesForIntro}
                                uploadingKey={uploadingAssetKey?.startsWith(uploadPrefix) ? uploadingAssetKey.slice(uploadPrefix.length) : null}
                                onUpload={(key, file) =>
                                  void uploadGenericAsset(`${uploadPrefix}${key}`, file, (url) =>
                                    patchIntroDeviceSub(device, deviceConfig.tipo as "revealBook" | "cortinas", {
                                      [key === "panelIzquierdo" ? "panelIzquierdoUrl" : "panelDerechoUrl"]: url,
                                    }),
                                  )
                                }
                                onChange={(patch) => patchIntroDeviceSub(device, deviceConfig.tipo as "revealBook" | "cortinas", patch)}
                                aperturaDefault={deviceConfig.tipo === "cortinas" ? 900 : 1800}
                                disabled={!recursosDriveConfigured}
                              />
                            )}

                            {deviceConfig.tipo === "fadeIn" && (
                              <div className="space-y-3">
                                <IntroAssetField
                                  label="Media inicial (imagen o LineAlive)"
                                  value={deviceConfig.fadeIn?.mediaUrl ?? ""}
                                  onChangeValue={(v) => patchIntroDeviceSub(device, "fadeIn", { mediaUrl: v })}
                                  uploading={uploadingAssetKey === `${uploadPrefix}fadeInMedia`}
                                  onUpload={(file) => void uploadGenericAsset(`${uploadPrefix}fadeInMedia`, file, (url) => patchIntroDeviceSub(device, "fadeIn", { mediaUrl: url }))}
                                  disabled={!recursosDriveConfigured}
                                  resources={resourcesForIntro}
                                  placeholder="/images/archivo.jpg, /LineAlive/archivo.html o https://..."
                                />
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Duracion del fade (ms)</label>
                                    <input
                                      type="number"
                                      min={200}
                                      max={5000}
                                      step={50}
                                      className="input-field"
                                      value={deviceConfig.fadeIn?.duracionFadeMs ?? 1200}
                                      onChange={(e) => patchIntroDeviceSub(device, "fadeIn", { duracionFadeMs: Math.max(200, Number(e.target.value) || 200) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Espera maxima del media (ms)</label>
                                    <input
                                      type="number"
                                      min={1000}
                                      max={30000}
                                      step={500}
                                      className="input-field"
                                      value={deviceConfig.fadeIn?.maxEsperaMs ?? 9000}
                                      onChange={(e) => patchIntroDeviceSub(device, "fadeIn", { maxEsperaMs: Math.max(1000, Number(e.target.value) || 1000) })}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {deviceConfig.tipo === "focusRegion" && (
                              <div className="space-y-3">
                                <IntroAssetField
                                  label="Media (imagen o LineAlive)"
                                  value={deviceConfig.focusRegion?.mediaUrl ?? ""}
                                  onChangeValue={(v) => patchIntroDeviceSub(device, "focusRegion", { mediaUrl: v })}
                                  uploading={uploadingAssetKey === `${uploadPrefix}focusRegionMedia`}
                                  onUpload={(file) => void uploadGenericAsset(`${uploadPrefix}focusRegionMedia`, file, (url) => patchIntroDeviceSub(device, "focusRegion", { mediaUrl: url }))}
                                  disabled={!recursosDriveConfigured}
                                  resources={resourcesForIntro}
                                  placeholder="/images/archivo.jpg, /LineAlive/archivo.html o https://..."
                                />
                                <PolygonRegionEditor
                                  previewSrc={previewSrcForAdmin(inviteCode, deviceConfig.focusRegion?.mediaUrl ?? "")}
                                  isHtml={isLikelyLineAliveHtmlUrl(deviceConfig.focusRegion?.mediaUrl)}
                                  value={deviceConfig.focusRegion?.region}
                                  onChange={(region) => patchIntroDeviceSub(device, "focusRegion", { region })}
                                />
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="label-field">Duracion del zoom (ms)</label>
                                    <input
                                      type="number"
                                      min={300}
                                      max={6000}
                                      step={50}
                                      className="input-field"
                                      value={deviceConfig.focusRegion?.duracionZoomMs ?? 1400}
                                      onChange={(e) => patchIntroDeviceSub(device, "focusRegion", { duracionZoomMs: Math.max(300, Number(e.target.value) || 300) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Duracion del fade final (ms)</label>
                                    <input
                                      type="number"
                                      min={200}
                                      max={5000}
                                      step={50}
                                      className="input-field"
                                      value={deviceConfig.focusRegion?.duracionFadeMs ?? 900}
                                      onChange={(e) => patchIntroDeviceSub(device, "focusRegion", { duracionFadeMs: Math.max(200, Number(e.target.value) || 200) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Espera maxima del media (ms)</label>
                                    <input
                                      type="number"
                                      min={1000}
                                      max={30000}
                                      step={500}
                                      className="input-field"
                                      value={deviceConfig.focusRegion?.maxEsperaMs ?? 9000}
                                      onChange={(e) => patchIntroDeviceSub(device, "focusRegion", { maxEsperaMs: Math.max(1000, Number(e.target.value) || 1000) })}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {deviceConfig.tipo === "slideUp" && (
                              <div className="space-y-3">
                                <IntroAssetField
                                  label="Media inicial (imagen o LineAlive)"
                                  value={deviceConfig.slideUp?.mediaUrl ?? ""}
                                  onChangeValue={(v) => patchIntroDeviceSub(device, "slideUp", { mediaUrl: v })}
                                  uploading={uploadingAssetKey === `${uploadPrefix}slideUpMedia`}
                                  onUpload={(file) => void uploadGenericAsset(`${uploadPrefix}slideUpMedia`, file, (url) => patchIntroDeviceSub(device, "slideUp", { mediaUrl: url }))}
                                  disabled={!recursosDriveConfigured}
                                  resources={resourcesForIntro}
                                  placeholder="/images/archivo.jpg, /LineAlive/archivo.html o https://..."
                                />
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Duracion del deslizamiento (ms)</label>
                                    <input
                                      type="number"
                                      min={200}
                                      max={5000}
                                      step={50}
                                      className="input-field"
                                      value={deviceConfig.slideUp?.duracionDeslizamientoMs ?? 900}
                                      onChange={(e) => patchIntroDeviceSub(device, "slideUp", { duracionDeslizamientoMs: Math.max(200, Number(e.target.value) || 200) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Espera maxima del media (ms)</label>
                                    <input
                                      type="number"
                                      min={1000}
                                      max={30000}
                                      step={500}
                                      className="input-field"
                                      value={deviceConfig.slideUp?.maxEsperaMs ?? 9000}
                                      onChange={(e) => patchIntroDeviceSub(device, "slideUp", { maxEsperaMs: Math.max(1000, Number(e.target.value) || 1000) })}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {deviceConfig.tipo === "custom" && (
                              <div className="space-y-2">
                                <IntroAssetField
                                  label="HTML personalizado"
                                  value={deviceConfig.custom?.htmlUrl ?? ""}
                                  onChangeValue={(v) => patchIntroDeviceSub(device, "custom", { htmlUrl: v })}
                                  uploading={uploadingAssetKey === `${uploadPrefix}customHtml`}
                                  onUpload={(file) => void uploadGenericAsset(`${uploadPrefix}customHtml`, file, (url) => patchIntroDeviceSub(device, "custom", { htmlUrl: url }))}
                                  disabled={!recursosDriveConfigured}
                                  resources={resourcesForIntro}
                                  placeholder="/LineAlive/archivo.html o https://..."
                                  accept=".html,.htm"
                                />
                                <p className="text-xs text-stone-500">
                                  El HTML se carga a pantalla completa tras el lacre. Para avisar que ha terminado, debe enviar
                                  <code className="mx-1 rounded bg-stone-100 px-1">window.parent.postMessage(&#123;source:&quot;linealive-player&quot;, type:&quot;ended&quot;&#125;, &quot;*&quot;)</code>
                                  — el mismo contrato que usan los recursos generados con LineAlive, que funcionan aqui directamente.
                                </p>
                                <div>
                                  <label className="label-field">Espera maxima si no avisa que termino (ms)</label>
                                  <input
                                    type="number"
                                    min={2000}
                                    max={60000}
                                    step={1000}
                                    className="input-field max-w-xs"
                                    value={deviceConfig.custom?.maxEsperaMs ?? 20000}
                                    onChange={(e) => patchIntroDeviceSub(device, "custom", { maxEsperaMs: Math.max(2000, Number(e.target.value) || 2000) })}
                                  />
                                </div>
                              </div>
                            )}

                            {deviceConfig.tipo === "envelope" && (
                              <div className="space-y-3">
                                <IntroAssetField
                                  label="Sello seco en la solapa (opcional)"
                                  value={deviceConfig.envelope?.selloSecoUrl ?? ""}
                                  onChangeValue={(v) => patchIntroDeviceSub(device, "envelope", { selloSecoUrl: v })}
                                  uploading={uploadingAssetKey === `${uploadPrefix}envelopeSelloSeco`}
                                  onUpload={(file) => {
                                    if (!/\.(png|jpe?g|svg)$/i.test(file.name)) {
                                      showMsg("error", "El sello seco debe ser PNG, JPG o SVG");
                                      return;
                                    }
                                    void uploadGenericAsset(`${uploadPrefix}envelopeSelloSeco`, file, (url) => patchIntroDeviceSub(device, "envelope", { selloSecoUrl: url }));
                                  }}
                                  disabled={!recursosDriveConfigured}
                                  resources={resourcesForIntro}
                                  placeholder="/images/sello.svg o https://..."
                                  accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                                />
                                <p className="text-xs text-stone-500">
                                  Las imagenes se integran con el papel mediante el modo de mezcla seleccionado. Los SVG conservan su acabado y animacion propia, con relieve opcional.
                                  No sustituye al lacre. Vacia la URL para quitarlo.
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Mezcla del sello seco PNG/JPG</label>
                                    <select className="input-field" value={deviceConfig.envelope?.selloSecoMezclaImagen ?? "overlay"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { selloSecoMezclaImagen: e.target.value })}>
                                      <option value="overlay">Overlay</option>
                                      <option value="soft-light">Soft light</option>
                                      <option value="hard-light">Hard light</option>
                                      <option value="normal">Sin mezcla</option>
                                    </select>
                                  </div>
                                  <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={deviceConfig.envelope?.selloSecoRelieveSvg ?? false}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { selloSecoRelieveSvg: e.target.checked })} />
                                    Simular relieve del SVG con luz y sombra
                                  </label>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="label-field">Ancho del sello seco (% del sobre)</label>
                                    <input type="number" min={5} max={40} step={1} className="input-field"
                                      value={deviceConfig.envelope?.selloSecoTamanoPorcentaje ?? 18}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { selloSecoTamanoPorcentaje: Math.min(40, Math.max(5, Number(e.target.value) || 5)) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Centro horizontal (% solapa)</label>
                                    <input type="number" min={0} max={100} step={1} className="input-field"
                                      value={deviceConfig.envelope?.selloSecoXPorcentaje ?? 50}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { selloSecoXPorcentaje: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Centro vertical (% solapa)</label>
                                    <input type="number" min={0} max={100} step={1} className="input-field"
                                      value={deviceConfig.envelope?.selloSecoYPorcentaje ?? 35}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { selloSecoYPorcentaje: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="label-field">Acabado de la paleta</label>
                                  <select
                                    className="input-field"
                                    value={deviceConfig.envelope?.acabadoPaleta ?? "textura"}
                                    onChange={(e) => patchIntroDeviceSub(device, "envelope", { acabadoPaleta: e.target.value })}
                                  >
                                    <option value="textura">Textura de la paleta</option>
                                    <option value="color">Solo color base de la textura</option>
                                    <option value="personalizado">Acabado personalizado</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="label-field">Acabado del sobre</label>
                                  <select
                                    className="input-field"
                                    value={deviceConfig.envelope?.modoFondo ?? "colores"}
                                    onChange={(e) => patchIntroDeviceSub(device, "envelope", { modoFondo: e.target.value })}
                                  >
                                    <option value="colores">Solo colores (CSS)</option>
                                    <option value="textura">Textura superpuesta sobre los colores</option>
                                    <option value="svgPersonalizado">Imagen/SVG propio del sobre completo</option>
                                  </select>
                                </div>

                                {deviceConfig.envelope?.modoFondo && deviceConfig.envelope.modoFondo !== "colores" && (
                                  <IntroAssetField
                                    label={deviceConfig.envelope.modoFondo === "svgPersonalizado" ? "Sobre completo (imagen o SVG)" : "Textura (imagen tileable)"}
                                    value={deviceConfig.envelope?.imagenUrl ?? ""}
                                    onChangeValue={(v) => patchIntroDeviceSub(device, "envelope", { imagenUrl: v })}
                                    uploading={uploadingAssetKey === `${uploadPrefix}envelopeImagen`}
                                    onUpload={(file) => void uploadGenericAsset(`${uploadPrefix}envelopeImagen`, file, (url) => patchIntroDeviceSub(device, "envelope", { imagenUrl: url }))}
                                    disabled={!recursosDriveConfigured}
                                    resources={resourcesForIntro}
                                    placeholder="/images/archivo.jpg, .svg o https://..."
                                  />
                                )}

                                <p className="text-xs text-stone-500">
                                  El sobre ocupa siempre la pantalla completa. Las medidas de abajo se expresan en % del lado menor de la pantalla, para que la composición se mantenga proporcional en cualquier dispositivo.
                                </p>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Color del frontal</label>
                                    <input
                                      type="color"
                                      className="input-field h-10 w-full"
                                      value={deviceConfig.envelope?.colorBase ?? "#e8ddc7"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { colorBase: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Color de la trasera y la solapa</label>
                                    <input
                                      type="color"
                                      className="input-field h-10 w-full"
                                      value={deviceConfig.envelope?.colorTrasera ?? deviceConfig.envelope?.colorBase ?? "#e8ddc7"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { colorTrasera: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Color interior de la solapa</label>
                                    <input
                                      type="color"
                                      className="input-field h-10 w-full"
                                      value={deviceConfig.envelope?.colorSolapaInterior ?? "#c9b48c"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { colorSolapaInterior: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="label-field">Color del borde</label>
                                    <input
                                      type="color"
                                      className="input-field h-10 w-full"
                                      value={deviceConfig.envelope?.colorBorde ?? "#a9895f"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { colorBorde: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Grosor del borde (% pantalla)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={5}
                                      step={0.1}
                                      className="input-field"
                                      value={deviceConfig.envelope?.grosorBordePorcentaje ?? 0.6}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { grosorBordePorcentaje: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Radio de esquinas (% pantalla)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={20}
                                      step={0.5}
                                      className="input-field"
                                      value={deviceConfig.envelope?.radioEsquinasPorcentaje ?? 2}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { radioEsquinasPorcentaje: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="label-field">Color de la costura</label>
                                    <input
                                      type="color"
                                      className="input-field h-10 w-full"
                                      value={deviceConfig.envelope?.colorCostura ?? "#8a6a44"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { colorCostura: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Color de la sombra</label>
                                    <input
                                      type="text"
                                      className="input-field"
                                      placeholder="rgba(0,0,0,0.35)"
                                      value={deviceConfig.envelope?.sombraColor ?? "rgba(0,0,0,0.35)"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { sombraColor: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Difuminado de sombra (% pantalla)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={15}
                                      step={0.5}
                                      className="input-field"
                                      value={deviceConfig.envelope?.sombraDesenfoquePorcentaje ?? 3}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { sombraDesenfoquePorcentaje: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Altura de la solapa (% del sobre)</label>
                                    <input
                                      type="number"
                                      min={20}
                                      max={70}
                                      step={1}
                                      className="input-field"
                                      value={deviceConfig.envelope?.alturaSolapaPorcentaje ?? 42}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { alturaSolapaPorcentaje: Math.min(70, Math.max(20, Number(e.target.value) || 20)) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Redondeo del pico de la solapa (%)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={50}
                                      step={1}
                                      className="input-field"
                                      value={deviceConfig.envelope?.radioPicoSolapaPorcentaje ?? 10}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { radioPicoSolapaPorcentaje: Math.min(50, Math.max(0, Number(e.target.value) || 0)) })}
                                    />
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 pt-3">
                                  <p className="label-field">Escena (fondo exterior y márgenes)</p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    Ni el sobre ni la portada ocupan toda la pantalla: queda un margen alrededor con un fondo propio (la &quot;mesa&quot;), y la portada queda un poco más metida que el sobre para que se note que está dentro.
                                  </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Color del fondo exterior (mesa)</label>
                                    <input
                                      type="color"
                                      className="input-field h-10 w-full"
                                      value={deviceConfig.envelope?.fondoExteriorColor ?? "#2E1F0E"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { fondoExteriorColor: e.target.value })}
                                    />
                                  </div>
                                  <IntroAssetField
                                    label="Textura del fondo exterior (opcional)"
                                    value={deviceConfig.envelope?.fondoExteriorImagenUrl ?? ""}
                                    onChangeValue={(v) => patchIntroDeviceSub(device, "envelope", { fondoExteriorImagenUrl: v })}
                                    uploading={uploadingAssetKey === `${uploadPrefix}envelopeFondoExterior`}
                                    onUpload={(file) => void uploadGenericAsset(`${uploadPrefix}envelopeFondoExterior`, file, (url) => patchIntroDeviceSub(device, "envelope", { fondoExteriorImagenUrl: url }))}
                                    disabled={!recursosDriveConfigured}
                                    resources={resourcesForIntro}
                                    placeholder="/images/archivo.jpg"
                                  />
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Margen del sobre respecto a la pantalla (%)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={35}
                                      step={1}
                                      className="input-field"
                                      value={deviceConfig.envelope?.margenPantallaPorcentaje ?? 6}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { margenPantallaPorcentaje: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Margen adicional de la portada respecto al sobre (%)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={35}
                                      step={1}
                                      className="input-field"
                                      value={deviceConfig.envelope?.margenContenidoPorcentaje ?? 4}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { margenContenidoPorcentaje: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="label-field">Relación de aspecto del sobre</label>
                                  <select
                                    className="input-field"
                                    value={deviceConfig.envelope?.modoAspectoSobre ?? "automatico"}
                                    onChange={(e) => patchIntroDeviceSub(device, "envelope", { modoAspectoSobre: e.target.value })}
                                  >
                                    <option value="automatico">Automática (igual que la pantalla, con el margen de arriba)</option>
                                    <option value="fijo">Fija (el margen de arriba pasa a ser un mínimo)</option>
                                  </select>
                                </div>

                                {deviceConfig.envelope?.modoAspectoSobre === "fijo" && (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="label-field">Ajustar exactamente a...</label>
                                      <select
                                        className="input-field"
                                        value={deviceConfig.envelope?.ajusteAspectoSobre ?? "ancho"}
                                        onChange={(e) => patchIntroDeviceSub(device, "envelope", { ajusteAspectoSobre: e.target.value })}
                                      >
                                        <option value="ancho">Ancho (con margen a los lados; puede sobresalir arriba/abajo)</option>
                                        <option value="alto">Alto (con margen arriba/abajo; puede sobresalir a los lados)</option>
                                      </select>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="label-field">Ancho (unidades de relación)</label>
                                        <input
                                          type="number"
                                          min={0.1}
                                          step={0.1}
                                          className="input-field"
                                          value={deviceConfig.envelope?.aspectoAnchoSobre ?? 3}
                                          onChange={(e) => patchIntroDeviceSub(device, "envelope", { aspectoAnchoSobre: Math.max(0.1, Number(e.target.value) || 0.1) })}
                                        />
                                      </div>
                                      <div>
                                        <label className="label-field">Alto (unidades de relación)</label>
                                        <input
                                          type="number"
                                          min={0.1}
                                          step={0.1}
                                          className="input-field"
                                          value={deviceConfig.envelope?.aspectoAltoSobre ?? 2}
                                          onChange={(e) => patchIntroDeviceSub(device, "envelope", { aspectoAltoSobre: Math.max(0.1, Number(e.target.value) || 0.1) })}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="border-t border-stone-200 pt-3">
                                  <p className="label-field">Sombra al abrir la solapa</p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    Se proyecta sobre la cara interior de la solapa y sobre la portada vista por el hueco, y se desvanece a la vez que la solapa termina de abrirse.
                                  </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Color de la sombra</label>
                                    <input
                                      type="text"
                                      className="input-field"
                                      placeholder="rgba(0,0,0,0.55)"
                                      value={deviceConfig.envelope?.colorSombraApertura ?? "rgba(0,0,0,0.55)"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { colorSombraApertura: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Intensidad (%)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="input-field"
                                      value={deviceConfig.envelope?.intensidadSombraAperturaPorcentaje ?? 45}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { intensidadSombraAperturaPorcentaje: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                                    />
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 pt-3">
                                  <p className="label-field">Grosor de papel en los bordes</p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    Sombra sutil en el contorno recortado del frontal y la solapa, para que parezca que tienen grosor de papel.
                                  </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="label-field">Color</label>
                                    <input
                                      type="text"
                                      className="input-field"
                                      placeholder="rgba(0,0,0,0.4)"
                                      value={deviceConfig.envelope?.colorGrosorPapel ?? "rgba(0,0,0,0.4)"}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { colorGrosorPapel: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Intensidad (%)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="input-field"
                                      value={deviceConfig.envelope?.intensidadGrosorPapelPorcentaje ?? 35}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { intensidadGrosorPapelPorcentaje: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                                    />
                                  </div>
                                </div>

                                <div className="border-t border-stone-200 pt-3">
                                  <p className="label-field">Secuencia tras el lacre</p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    Se abre la solapa, luego el sobre desciende dejando ver la portada, y por último la portada hace zoom hasta ocupar toda la pantalla (momento en el que se activa).
                                  </p>
                                </div>

                                <div>
                                  <label className="label-field">Al descender, el sobre...</label>
                                  <select
                                    className="input-field max-w-xs"
                                    value={deviceConfig.envelope?.modoDescensoSobre ?? "desplazamiento"}
                                    onChange={(e) => patchIntroDeviceSub(device, "envelope", { modoDescensoSobre: e.target.value })}
                                  >
                                    <option value="desplazamiento">Solo se desplaza hacia abajo</option>
                                    <option value="fade">Solo se desvanece (fade out)</option>
                                    <option value="ambos">Se desplaza y se desvanece a la vez</option>
                                  </select>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="label-field">Duracion de apertura de la solapa (ms)</label>
                                    <input
                                      type="number"
                                      min={300}
                                      max={5000}
                                      step={50}
                                      className="input-field"
                                      value={deviceConfig.envelope?.duracionAperturaMs ?? 900}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { duracionAperturaMs: Math.max(300, Number(e.target.value) || 300) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Duracion del descenso del sobre (ms)</label>
                                    <input
                                      type="number"
                                      min={300}
                                      max={5000}
                                      step={50}
                                      className="input-field"
                                      value={deviceConfig.envelope?.duracionDescensoMs ?? 700}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { duracionDescensoMs: Math.max(300, Number(e.target.value) || 300) })}
                                    />
                                  </div>
                                  <div>
                                    <label className="label-field">Duracion del zoom de la portada (ms)</label>
                                    <input
                                      type="number"
                                      min={300}
                                      max={5000}
                                      step={50}
                                      className="input-field"
                                      value={deviceConfig.envelope?.duracionZoomMs ?? 900}
                                      onChange={(e) => patchIntroDeviceSub(device, "envelope", { duracionZoomMs: Math.max(300, Number(e.target.value) || 300) })}
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-stone-500">
                                  El lacre configurado arriba se mostrará centrado en el pico de la solapa del sobre cerrado; al completarse su animación, la solapa se abrirá y comenzará la secuencia de salida.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  {loadingResources && <p className="text-xs text-stone-400">Cargando recursos de Drive...</p>}
                </div>
              )}


              {isInvitationType(selectedSection.tipo) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-700">Contenido de invitacion</h3>
                  <IntroAssetField
                    label="Imagen del sello (si se deja vacio, se usa el sello actual)"
                    value={selectedSection.selloUrl ?? ""}
                    onChangeValue={(url) => patchSection(selectedSection.id, { selloUrl: url })}
                    uploading={uploadingAssetKey === "invitacionSello"}
                    onUpload={(file) => void uploadGenericAsset("invitacionSello", file, (url) => patchSection(selectedSection.id, { selloUrl: url }))}
                    disabled={!recursosDriveConfigured}
                    resources={imageResourcesForSelectedSection}
                    placeholder="/images/sello.svg o https://..."
                    accept="image/*"
                  />
                  <p className="text-xs text-stone-500">
                    Puedes subir una imagen, elegir un recurso de la subcarpeta invitacion o pegar una URL. Este sello es independiente del logo de la barra superior y del lacre de la Intro.
                  </p>
                  {loadingResources && <p className="text-xs text-stone-400">Cargando recursos de Drive...</p>}
                  <div>
                    <label className="label-field">Texto de invitacion (si se deja vacio, se usa el texto generico)</label>
                    <textarea
                      rows={4}
                      className="input-field"
                      value={selectedSection.items?.[0]?.descripcion ?? ""}
                      onChange={(e) => {
                        const first = selectedSection.items?.[0] ?? { id: `item-${uid()}`, titulo: "Invitacion", descripcion: "" };
                        patchSection(selectedSection.id, { items: [{ ...first, descripcion: e.target.value }, ...selectedSection.items.slice(1)] });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label-field">Comportamiento de la barra superior (menu, logo y texto)</label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-2 text-sm text-stone-700">
                        <input
                          type="radio"
                          name="navegacion-comportamiento"
                          className="mt-1"
                          checked={navegacionComportamiento === "siempre_visible"}
                          onChange={() => setNavegacionComportamiento("siempre_visible")}
                        />
                        <span>
                          <span className="font-medium">Siempre visible</span>
                          <span className="block text-xs text-stone-500">La barra se muestra desde el principio, incluso sobre la portada.</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-sm text-stone-700">
                        <input
                          type="radio"
                          name="navegacion-comportamiento"
                          className="mt-1"
                          checked={navegacionComportamiento === "visible_en_scroll"}
                          onChange={() => setNavegacionComportamiento("visible_en_scroll")}
                        />
                        <span>
                          <span className="font-medium">Solo visible al hacer scroll</span>
                          <span className="block text-xs text-stone-500">La barra permanece oculta sobre la portada y aparece al bajar hacia las siguientes secciones.</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-stone-200 p-4">
                    <h4 className="text-sm font-semibold text-stone-700">Contenido de la barra superior</h4>
                    <div>
                      <label className="label-field">Texto (si se deja vacio, se muestran los nombres de los novios)</label>
                      <input
                        className="input-field"
                        value={bannerTexto}
                        onChange={(e) => setBannerTexto(e.target.value)}
                      />
                    </div>
                    <IntroAssetField
                      label="Logo (si se deja vacio, se usa el sello generado)"
                      value={bannerLogoUrl}
                      onChangeValue={setBannerLogoUrl}
                      uploading={uploadingAssetKey === "bannerLogo"}
                      onUpload={(file) => void uploadGenericAsset("bannerLogo", file, setBannerLogoUrl)}
                      disabled={!recursosDriveConfigured}
                      resources={resourcesForIntro}
                      placeholder="/images/logo.png o https://..."
                      accept="image/*"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label-field">Ancho del logo (px, 0 = automatico)</label>
                        <input type="number" min={0} max={600} className="input-field" value={bannerLogoAncho}
                          disabled={bannerLogoMantenerAspecto && bannerLogoAspectoFijar === "alto"}
                          onChange={(e) => { const value = Math.max(0, Number(e.target.value) || 0); setBannerLogoAncho(value); if (bannerLogoMantenerAspecto && bannerLogoAspectoFijar === "ancho") setBannerLogoAnchoManual(value); }} />
                      </div>
                      <div>
                        <label className="label-field">Alto del logo (px, 0 = automatico)</label>
                        <input type="number" min={0} max={200} className="input-field" value={bannerLogoAlto}
                          disabled={bannerLogoMantenerAspecto && bannerLogoAspectoFijar === "ancho"}
                          onChange={(e) => { const value = Math.max(0, Number(e.target.value) || 0); setBannerLogoAlto(value); if (bannerLogoMantenerAspecto && bannerLogoAspectoFijar === "alto") setBannerLogoAltoManual(value); }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="inline-flex items-center gap-2 label-field">
                          <input type="checkbox" checked={bannerLogoMantenerAspecto} onChange={(e) => {
                            const enabled = e.target.checked;
                            if (enabled) {
                              setBannerLogoAnchoManual(bannerLogoAncho);
                              setBannerLogoAltoManual(bannerLogoAlto);
                            } else {
                              setBannerLogoAncho(bannerLogoAnchoManual);
                              setBannerLogoAlto(bannerLogoAltoManual);
                            }
                            setBannerLogoMantenerAspecto(enabled);
                          }} />
                          Mantener relación de aspecto
                        </label>
                        {bannerLogoMantenerAspecto && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="label-field">Establecer ancho / Establecer alto
                              <select className="input-field" value={bannerLogoAspectoFijar} onChange={(e) => {
                                const next = e.target.value as "ancho" | "alto";
                                setBannerLogoAspectoFijar(next);
                                setBannerLogoAspectoAlineacion(next === "ancho" ? "centroVertical" : "centroHorizontal");
                              }}>
                                <option value="ancho">Establecer ancho</option>
                                <option value="alto">Establecer alto</option>
                              </select>
                            </label>
                            <label className="label-field">Alinear dimensión libre
                              <select className="input-field" value={bannerLogoAspectoAlineacion} onChange={(e) => setBannerLogoAspectoAlineacion(e.target.value as typeof bannerLogoAspectoAlineacion)}>
                                {bannerLogoAspectoFijar === "ancho" ? <>
                                  <option value="arriba">Arriba</option><option value="centroVertical">Centrar verticalmente</option><option value="abajo">Abajo</option>
                                </> : <>
                                  <option value="izquierda">Izquierda</option><option value="centroHorizontal">Centrar horizontalmente</option><option value="derecha">Derecha</option>
                                </>}
                              </select>
                            </label>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="label-field">Tamano de fuente del texto (px, 0 = automatico)</label>
                        <input type="number" min={0} max={80} className="input-field" value={bannerTextoTamano}
                          onChange={(e) => setBannerTextoTamano(Math.max(0, Number(e.target.value) || 0))} />
                      </div>
                      <div />
                      <div>
                        <label className="label-field">Color de fondo de la barra</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={bannerFondoColor || "#f7f3ec"} onChange={(e) => setBannerFondoColor(e.target.value)} />
                          <button type="button" className="text-xs text-stone-500 underline" onClick={() => setBannerFondoColor("")}>
                            {bannerFondoColor ? "Restablecer" : "Por defecto (fondo general)"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="label-field">Color del logo (tine la silueta; Restablecer conserva los colores originales)</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={bannerLogoColor || "#8c6a3f"} onChange={(e) => setBannerLogoColor(e.target.value)} />
                          <button type="button" className="text-xs text-stone-500 underline" onClick={() => setBannerLogoColor("")}>
                            {bannerLogoColor ? "Restablecer" : "Por defecto"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="label-field">Color del texto</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={bannerTextoColor || "#ffffff"} onChange={(e) => setBannerTextoColor(e.target.value)} />
                          <button type="button" className="text-xs text-stone-500 underline" onClick={() => setBannerTextoColor("")}>
                            {bannerTextoColor ? "Restablecer" : "Por defecto"}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="label-field">Elementos: orden y ubicacion en la barra</label>
                      {bannerElementos.map((el, index) => (
                        <div key={el.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 px-3 py-2">
                          <label className="flex items-center gap-2 text-sm text-stone-700 min-w-[110px]">
                            <input
                              type="checkbox"
                              checked={el.visible}
                              onChange={(e) => patchBannerElemento(el.id, { visible: e.target.checked })}
                            />
                            {BANNER_ELEMENTO_LABEL[el.id]}
                          </label>
                          <select
                            className="input-field !w-auto"
                            value={el.posicion}
                            onChange={(e) => patchBannerElemento(el.id, { posicion: e.target.value as PosicionElementoBarra })}
                          >
                            <option value="izquierda">Izquierda</option>
                            <option value="centro">Centro</option>
                            <option value="derecha">Derecha</option>
                          </select>
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveBannerElemento(index, -1)}
                              disabled={index === 0}
                              className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBannerElemento(index, 1)}
                              disabled={index === bannerElementos.length - 1}
                              className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-stone-500">El orden de la lista se aplica dentro de cada zona (izquierda, centro, derecha).</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedSection.tipo === "portadaLibre" || selectedSection.tipo === "pie") && (() => {
                const isPie = selectedSection.tipo === "pie";
                const portada = isPie ? normalizePieConfig(selectedSection.pie) : normalizePortadaLibre(selectedSection.portadaLibre);
                const imageResources = resources.filter((item) => item.mime_type === null || item.mime_type.startsWith("image/"));
                const patchPortada = (next: PortadaLibreConfig) => patchSection(selectedSection.id, isPie ? { pie: next } : { portadaLibre: next });
                const patchElemento = (id: string, patch: Partial<PortadaElemento>) =>
                  patchPortada({ ...portada, elementos: portada.elementos.map((el) => (el.id === id ? { ...el, ...patch } : el)) });
                const addElemento = (tipo: PortadaElemento["tipo"]) => {
                  const elemento: PortadaElemento = tipo === "texto"
                    ? { id: `pel-${uid()}`, tipo, texto: "Nuevo texto" }
                    : tipo === "enlace"
                    ? { id: `pel-${uid()}`, tipo, texto: "Abrir enlace", url: "" }
                    : { id: `pel-${uid()}`, tipo, url: "" };
                  const index = portada.elementos.length;
                  patchPortada({
                    ...portada,
                    elementos: [...portada.elementos, elemento],
                    pc: { ...portada.pc, layout: { ...portada.pc.layout, [elemento.id]: buildDefaultLayout(elemento, "pc", index) } },
                    movil: { ...portada.movil, layout: { ...portada.movil.layout, [elemento.id]: buildDefaultLayout(elemento, "movil", index) } },
                  });
                };
                const removeElemento = (id: string) => {
                  if (!confirm("Eliminar este elemento?")) return;
                  const { [id]: _pc, ...pcLayout } = portada.pc.layout;
                  const { [id]: _movil, ...movilLayout } = portada.movil.layout;
                  patchPortada({
                    ...portada,
                    elementos: portada.elementos.filter((el) => el.id !== id),
                    pc: { ...portada.pc, layout: pcLayout },
                    movil: { ...portada.movil, layout: movilLayout },
                  });
                };
                const moveElemento = (index: number, delta: -1 | 1) => {
                  const target = index + delta;
                  if (target < 0 || target >= portada.elementos.length) return;
                  const next = [...portada.elementos];
                  [next[index], next[target]] = [next[target], next[index]];
                  patchPortada({ ...portada, elementos: next });
                };
                return (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-stone-700">{isPie ? "Pie de página: elementos" : "Portada: elementos"}</h3>
                    <p className="text-xs text-stone-500">
                      Añade imágenes, textos, enlaces y mapas. Su posición y tamaño (y el estilo de texto) se ajustan en Diseño para PC y móvil.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50" onClick={() => addElemento("imagen")}>
                        + Añadir imagen
                      </button>
                      <button type="button" className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50" onClick={() => addElemento("texto")}>
                        + Añadir texto
                      </button>
                      <button type="button" className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50" onClick={() => addElemento("enlace")}>
                        + Añadir enlace
                      </button>
                      <button type="button" className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50" onClick={() => addElemento("mapa")}>
                        + Añadir mapa
                      </button>
                    </div>
                    {portada.elementos.length === 0 && (
                      <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500">Todavía no hay elementos.</p>
                    )}
                    {portada.elementos.map((elemento, index) => (
                      <div key={elemento.id} className="space-y-3 rounded-xl border border-stone-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-stone-700">{index + 1}. {elemento.tipo === "texto" ? "Texto" : elemento.tipo === "imagen" ? "Imagen" : elemento.tipo === "enlace" ? "Enlace" : "Mapa"}</p>
                          <div className="flex gap-1 text-xs">
                            <button type="button" className="rounded border border-stone-300 px-2 py-0.5" onClick={() => moveElemento(index, -1)} disabled={index === 0}>↑</button>
                            <button type="button" className="rounded border border-stone-300 px-2 py-0.5" onClick={() => moveElemento(index, 1)} disabled={index === portada.elementos.length - 1}>↓</button>
                            <button type="button" className="rounded border border-red-200 px-2 py-0.5 text-red-600" onClick={() => removeElemento(elemento.id)}>Eliminar</button>
                          </div>
                        </div>
                        <div>
                          <label className="label-field">Nombre (solo para identificarlo en el editor)</label>
                          <input className="input-field" value={elemento.nombre ?? ""} onChange={(e) => patchElemento(elemento.id, { nombre: e.target.value })} />
                        </div>
                        {elemento.tipo === "texto" ? (
                          <div>
                            <label className="label-field">Texto</label>
                            <textarea className="input-field min-h-[70px]" value={elemento.texto ?? ""} onChange={(e) => patchElemento(elemento.id, { texto: e.target.value })} />
                          </div>
                        ) : elemento.tipo === "enlace" ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="label-field">Texto del enlace</label>
                              <input className="input-field" value={elemento.texto ?? ""} onChange={(e) => patchElemento(elemento.id, { texto: e.target.value })} />
                            </div>
                            <div>
                              <label className="label-field">URL de destino</label>
                              <input type="url" className="input-field" placeholder="https://..." value={elemento.url ?? ""} onChange={(e) => patchElemento(elemento.id, { url: e.target.value })} />
                            </div>
                          </div>
                        ) : elemento.tipo === "imagen" ? (
                          <>
                            <IntroAssetField
                              label="Imagen"
                              value={elemento.url ?? ""}
                              onChangeValue={(v) => patchElemento(elemento.id, { url: v })}
                              uploading={uploadingAssetKey === `portada-${elemento.id}`}
                              onUpload={(file) => void uploadGenericAsset(`portada-${elemento.id}`, file, (url) => patchElemento(elemento.id, { url }))}
                              disabled={!recursosDriveConfigured}
                              resources={imageResources}
                              placeholder="https://... (PNG/SVG con transparencia si se quiere colorear)"
                              accept="image/*"
                            />
                            <div>
                              <label className="label-field">Texto alternativo</label>
                              <input className="input-field" value={elemento.alt ?? ""} onChange={(e) => patchElemento(elemento.id, { alt: e.target.value })} />
                            </div>
                            <div>
                              <label className="label-field">Enlace al hacer clic (opcional)</label>
                              <input type="url" className="input-field" placeholder="https://..." value={elemento.enlaceUrl ?? ""} onChange={(e) => patchElemento(elemento.id, { enlaceUrl: e.target.value })} />
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="label-field">URL de Google Maps</label>
                            <input type="url" className="input-field" placeholder="https://www.google.com/maps/embed?pb=..." value={elemento.url ?? ""} onChange={(e) => patchElemento(elemento.id, { url: e.target.value })} />
                            <p className="mt-1 text-xs text-stone-500">Admite enlaces de inserción y URLs de Google Maps de tipo lugar o búsqueda. Su posición y tamaño se ajustan en Diseño.</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {selectedSection.tipo === "historia" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-700">Historia</h3>
                  {selectedSection.items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-stone-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-stone-700">{item.titulo || "(sin titulo)"}</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveSelectedItem(item.id, "up")}
                            disabled={index === 0}
                            className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveSelectedItem(item.id, "down")}
                            disabled={index === selectedSection.items.length - 1}
                            className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => patchSelectedItems((items) => items.filter((current) => current.id !== item.id))}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
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
                              value={findResourceByImageUrl(item.imagen)?.id ?? ""}
                              onChange={(e) => {
                                const resource = imageResourcesForSelectedSection.find((entry) => entry.id === e.target.value) ?? null;
                                patchHistoriaItem(item.id, (current) => ({
                                  ...current,
                                  imagen: resource?.url_publica ?? "",
                                  lineAlive: undefined,
                                }));
                              }}
                            >
                              <option value="">Sin imagen</option>
                              {imageResourcesForSelectedSection.map((resource) => (
                                <option key={resource.id} value={resource.id}>
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
                                disabled={uploadingHistoriaId === item.id || !recursosDriveConfigured}
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
                          {loadingResources && <p className="text-xs text-stone-400">Cargando recursos de Drive...</p>}
                          {item.imagen && (
                            <div
                              className="relative h-48 w-full max-w-[320px] overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
                              onContextMenu={(event) => openHistoriaContextMenu(event, item.id, item.imagen)}
                            >
                              {item.lineAlive?.enabled && item.lineAlive.htmlDriveFileId ? (
                                <>
                                  <LineAliveEmbed
                                    src={buildAdminLineAliveSrc(item.lineAlive.htmlDriveFileId)}
                                    title={`LineAlive ${item.titulo || item.id}`}
                                    aspectRatio={item.lineAlive.aspectRatio}
                                    fit="cover"
                                    lockAspectRatio={false}
                                    className="h-full w-full rounded-none border-0"
                                    iframeClassName="rounded-none"
                                    loadingLabel="Cargando LineAlive..."
                                  />
                                  <div
                                    className="absolute inset-0 z-10 cursor-context-menu"
                                    aria-hidden="true"
                                  />
                                </>
                              ) : (
                                <img
                                  src={previewSrcForAdmin(inviteCode, item.imagen)}
                                  alt="Preview historia"
                                  className="h-full w-full object-cover"
                                />
                              )}
                              <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
                                {item.lineAlive?.enabled ? "LineAlive activo" : item.lineAlive?.htmlDriveFileId ? "LineAlive listo" : "PNG original"}
                              </div>
                              {lineAliveGenerating[item.id] && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/45 text-white backdrop-blur-sm">
                                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                                  <p className="text-xs font-semibold tracking-wide">Generando LineAlive...</p>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-stone-500">Clic derecho sobre la preview para activar o desactivar LineAlive.</p>
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

                  {contextMenu && selectedSection.items.some((entry) => entry.id === contextMenu.itemId) && (
                    <div
                      className="fixed z-50 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-2xl"
                      style={{ left: contextMenu.x, top: contextMenu.y }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {selectedSection.items
                        .filter((entry) => entry.id === contextMenu.itemId)
                        .map((entry) => (
                          <div key={entry.id} className="space-y-2">
                            <button
                              type="button"
                              onClick={() => void toggleLineAliveForItem(entry)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                            >
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-stone-400 text-[10px]">
                                {entry.lineAlive?.enabled ? "✓" : ""}
                              </span>
                              <span>Usar LineAlive</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => disableLineAliveForItem(entry.id)}
                              disabled={!entry.lineAlive?.htmlDriveFileId}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span>Volver a imagen original</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void regenerateLineAliveForItem(entry)}
                              disabled={lineAliveGenerating[entry.id]}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span>Regenerar LineAlive</span>
                            </button>
                            <p className="px-3 pb-1 text-[11px] text-stone-500">
                              La primera activacion genera el HTML sidecar en Drive. Despues puedes alternar o regenerar LineAlive.
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {selectedSection.tipo === "timeline" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-700">Timeline</h3>
                  {selectedSection.items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-stone-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-stone-700">{item.hora || "--:--"} {item.titulo || "(sin titulo)"}</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveSelectedItem(item.id, "up")}
                            disabled={index === 0}
                            className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveSelectedItem(item.id, "down")}
                            disabled={index === selectedSection.items.length - 1}
                            className="rounded border border-stone-300 px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => patchSelectedItems((items) => items.filter((current) => current.id !== item.id))}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
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
                          <IntroAssetField
                            label="Icono personalizado (opcional, sustituye al icono)"
                            value={item.imagen ?? ""}
                            onChangeValue={(v) => updateTimelineItem(item.id, "imagen", v)}
                            uploading={uploadingAssetKey === `timelineIcono-${item.id}`}
                            onUpload={(file) => void uploadGenericAsset(`timelineIcono-${item.id}`, file, (url) => updateTimelineItem(item.id, "imagen", url))}
                            disabled={false}
                            resources={resources}
                            placeholder="URL de Drive o imagen"
                            accept="image/*"
                          />
                        </div>
                        <div className="sm:col-span-2 rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2">
                          <p className="text-xs font-semibold text-stone-600">Tamano del logo (px, mantiene proporciones)</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {(["movil", "pc"] as const).map((device) => {
                              const range = TIMELINE_LOGO_RANGE[device];
                              const { size, configured } = resolveTimelineLogoSize(
                                item.logoTamano,
                                device,
                                Boolean(item.imagen),
                                selectedSection.componentSizes?.["timeline.icono"],
                              );
                              return (
                                <div key={device}>
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="label-field">{device === "movil" ? "Movil" : "PC"}</label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        className="input-field !w-20 !py-1"
                                        min={range.min}
                                        max={range.max}
                                        step={range.step}
                                        value={size}
                                        onChange={(e) => {
                                          const n = Number(e.target.value);
                                          if (e.target.value !== "" && Number.isFinite(n)) updateTimelineLogoSize(item.id, device, n);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        disabled={!configured}
                                        onClick={() => updateTimelineLogoSize(item.id, device, undefined)}
                                        className="text-[11px] text-stone-500 underline disabled:opacity-40 disabled:no-underline"
                                      >
                                        Restablecer
                                      </button>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    className="w-full"
                                    min={range.min}
                                    max={range.max}
                                    step={range.step}
                                    value={size}
                                    onChange={(e) => updateTimelineLogoSize(item.id, device, Number(e.target.value))}
                                  />
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="label-field">Alineacion vertical</label>
                                      <select
                                        className="input-field"
                                        value={resolveTimelineLogoAlign(item.logoAlineacion, device).vertical}
                                        onChange={(e) => updateTimelineLogoAlign(item.id, device, "vertical", e.target.value)}
                                      >
                                        {TIMELINE_LOGO_VERTICAL.map((v) => (
                                          <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="label-field">Alineacion horizontal</label>
                                      <select
                                        className="input-field"
                                        value={resolveTimelineLogoAlign(item.logoAlineacion, device).horizontal}
                                        onChange={(e) => updateTimelineLogoAlign(item.id, device, "horizontal", e.target.value)}
                                      >
                                        {TIMELINE_LOGO_HORIZONTAL.map((h) => (
                                          <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[11px] text-stone-500">En movil, horizontal izquierda/derecha situa el logo a un lado del texto y centro lo coloca sobre el texto (vertical abajo lo pasa debajo).</p>
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

              {selectedSection.tipo === "carrusel" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-stone-700">Fotos del carrusel</h3>
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-stone-300 px-4 py-2 text-sm has-[:disabled]:cursor-wait has-[:disabled]:opacity-50">
                    {uploadingCarrusel ? "Subiendo..." : "Subir fotos"}
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingCarrusel} onChange={async (event) => {
                      const files = Array.from(event.target.files ?? []);
                      const sectionId = selectedSection.id;
                      event.target.value = "";
                      setUploadingCarrusel(true);
                      try {
                      for (const file of files) {
                        if (!file.type.startsWith("image/")) { showMsg("error", "Selecciona solo imagenes"); continue; }
                        await uploadGenericAsset(`carrusel-${sectionId}`, file, (url) => {
                          setSections((previous) => previous.map((section) => section.id === sectionId ? {
                            ...section,
                            items: [...section.items, { id: `item-${uid()}`, titulo: file.name, descripcion: "", imagen: url }],
                          } : section));
                        });
                      }
                      } finally {
                        setUploadingCarrusel(false);
                      }
                    }} />
                  </label>
                  <select aria-label="Anadir foto de recursos" className="input-field" value="" disabled={loadingResources} onChange={(event) => {
                    const resource = resources.find((entry) => entry.id === event.target.value);
                    if (resource?.url_publica) patchSelectedItems((items) => [...items, { id: `item-${uid()}`, titulo: resource.nombre, descripcion: "", imagen: resource.url_publica! }]);
                  }}>
                    <option value="">{loadingResources ? "Cargando recursos..." : "Anadir foto de recursos"}</option>
                    {resources.filter((resource) => resource.url_publica && resource.mime_type?.startsWith("image/")).map((resource) => <option key={resource.id} value={resource.id}>{resource.nombre}</option>)}
                  </select>
                  {selectedSection.items.map((item, index) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 p-3">
                      {item.imagen && <img src={previewSrcForAdmin(inviteCode, item.imagen)} alt={item.titulo || `Foto ${index + 1}`} className="h-16 w-16 shrink-0 rounded object-contain" />}
                      <div className="min-w-0 flex-1 space-y-2">
                        <input aria-label={`Texto alternativo foto ${index + 1}`} className="input-field" value={item.titulo} placeholder="Texto alternativo" onChange={(event) => patchHistoriaItem(item.id, (current) => ({ ...current, titulo: event.target.value }))} />
                        <input aria-label={`URL foto ${index + 1}`} className="input-field" value={item.imagen ?? ""} placeholder="URL de la foto" onChange={(event) => patchHistoriaItem(item.id, (current) => ({ ...current, imagen: event.target.value }))} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" title="Mover antes" aria-label={`Mover foto ${index + 1} antes`} disabled={index === 0} onClick={() => moveSelectedItem(item.id, "up")} className="h-9 w-9 rounded border border-stone-300 disabled:opacity-30">&#8593;</button>
                        <button type="button" title="Mover despues" aria-label={`Mover foto ${index + 1} despues`} disabled={index === selectedSection.items.length - 1} onClick={() => moveSelectedItem(item.id, "down")} className="h-9 w-9 rounded border border-stone-300 disabled:opacity-30">&#8595;</button>
                        <button type="button" title="Eliminar foto" aria-label={`Eliminar foto ${index + 1}`} onClick={() => patchSelectedItems((items) => items.filter((current) => current.id !== item.id))} className="h-9 w-9 rounded border border-red-200 text-red-600">&#215;</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="rounded-lg border border-stone-300 px-4 py-2 text-sm" onClick={() => patchSelectedItems((items) => [...items, { id: `item-${uid()}`, titulo: "", descripcion: "", imagen: "" }])}>Anadir foto por URL</button>
                  <SeccionCarrusel key={selectedSection.id} items={selectedSection.items} resolveSrc={(src) => previewSrcForAdmin(inviteCode, src)} imageTreatments={config.diseno?.tratamientosImagenes} />
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
