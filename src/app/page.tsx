/**
 * app/page.tsx
 * Página principal con secciones colapsables.
 */

import { getWeddingConfig } from "@/lib/wedding-config-server";
import { NavegacionPublica } from "@/components/layout/NavegacionPublica";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { OrnamentoDivisor, SeparadorSeccion } from "@/components/ui/OrnamentoDivisor";
import { SeccionColapsable, SectionChain, SectionChainDecoration } from "@/components/wedding/SeccionColapsable";
import { getPublicSectionGroups, getSectionAnchor, getLegacySectionAnchor, getPublicPieSection } from "@/lib/section-chains";
import MainWithInvite from "@/components/wedding/MainWithInvite";
import PortadaLibre from "@/components/wedding/PortadaLibre";
import { SeccionGaleria } from "@/components/wedding/SeccionGaleria";
import { SeccionCarrusel } from "@/components/wedding/SeccionCarrusel";
import { SeccionHistoria, type HistoriaComponentKey } from "@/components/wedding/SeccionHistoria";
import { SeccionTimeline, type TimelineComponentKey } from "@/components/wedding/SeccionTimeline";
import type { HeroComponentKey } from "@/components/wedding/HeroPortada";
import type { GaleriaComponentKey } from "@/components/wedding/SeccionGaleria";
import { getFeaturedGalleryMedia } from "@/lib/wedding-gallery-server";
import { buildTextureCssVars, resolvePaletteRoleColors, resolvePaletteRoleTextures, resolvePaletteToThemeColors, textureToCssImage, withBorderStyle, withTextureStyle } from "@/lib/theme-roles";
import { getComponentSizeStyle } from "@/lib/component-size";
import { buildFontCssVars, getComponentFontStyle } from "@/lib/theme-fonts";
import { DEFAULT_TEXTO_INVITACION, normalizeIntroConfig, type SeparadorDiseno, type TipoSeccionDiseno, type SeccionDiseno, type TemaColorRole, type TemaPaleta } from "@/config/wedding.config";
import IntroReveal from "@/components/motion/IntroReveal";
import PostIntroSectionsGate from "@/components/motion/PostIntroSectionsGate";
import { resolveDriveMediaSrc } from "@/lib/drive-image";
import type { CSSProperties } from "react";
import WeddingViewport from "@/components/layout/WeddingViewport";
import { getEnvelopeResources } from "@/lib/intro-envelope-resources";

const DEFAULT_SEPARATOR_IMAGE_MAX_WIDTH_PX = 252;
const DEFAULT_SEPARATOR_IMAGE_MAX_HEIGHT_PX = 16;

function isDriveUrl(value?: string): boolean {
  if (!value) return false;
  return value.includes("drive.google.com") || value.includes("drive.usercontent.google.com");
}

function resolvePublicImageSrc(src?: string): string {
  const value = src?.trim() ?? "";
  if (!value) return "";
  if (!isDriveUrl(value)) return value;
  return `/api/resources/preview?src=${encodeURIComponent(value)}`;
}

function clampSeparatorSize(value: number | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.isFinite(value) ? Number(value) : fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function getSeparatorImageSize(separador: SeparadorDiseno): { maxWidthPx: number; maxHeightPx: number } {
  return {
    maxWidthPx: clampSeparatorSize(separador.imagenMaxWidthPx, DEFAULT_SEPARATOR_IMAGE_MAX_WIDTH_PX, 40, 640),
    maxHeightPx: clampSeparatorSize(separador.imagenMaxHeightPx, DEFAULT_SEPARATOR_IMAGE_MAX_HEIGHT_PX, 8, 160),
  };
}

type SectionComponentKey =
  | HeroComponentKey
  | "intro.fondo"
  | "intro.lacre"
  | "intro.sobre"
  | "intro.titulo"
  | HistoriaComponentKey
  | TimelineComponentKey
  | GaleriaComponentKey
  | "historia.tituloSeccion"
  | "historia.fondoSeccion"
  | "timeline.tituloSeccion"
  | "timeline.fondoSeccion"
  | "galeria.tituloSeccion"
  | "galeria.fondoSeccion"
  | "carrusel.tituloSeccion"
  | "carrusel.fondoSeccion"
  | "carrusel.navegacion";

const SECTION_COMPONENT_OPTIONS: Record<TipoSeccionDiseno, Array<{ key: SectionComponentKey; defaultRole: TemaColorRole }>> = {
  carrusel: [
    { key: "carrusel.tituloSeccion", defaultRole: "tituloSeccion" },
    { key: "carrusel.fondoSeccion", defaultRole: "fondoSeccion" },
    { key: "carrusel.navegacion", defaultRole: "textoPrincipal" },
  ],
  intro: [
    { key: "intro.fondo", defaultRole: "fondoSeccion" },
    { key: "intro.lacre", defaultRole: "logo" },
    { key: "intro.sobre", defaultRole: "fondoSubseccion" },
    { key: "intro.titulo", defaultRole: "titulo" },
  ],
  invitacion: [
    { key: "portada.fondo", defaultRole: "fondoSeccion" },
    { key: "portada.logo", defaultRole: "logo" },
    { key: "portada.nombres", defaultRole: "titulo" },
    { key: "portada.separador", defaultRole: "nexosTransicionesBordes" },
    { key: "portada.fecha", defaultRole: "textoSecundario" },
    { key: "portada.bienvenida", defaultRole: "textoPrincipal" },
    { key: "portada.faltan", defaultRole: "textoSecundario" },
    { key: "portada.cuentaAtras", defaultRole: "titulo" },
    { key: "portada.cuentaAtrasLeyendas", defaultRole: "textoSecundario" },
    { key: "portada.ctaFondo", defaultRole: "fondoBoton" },
    { key: "portada.ctaTexto", defaultRole: "textoBoton" },
  ],
  portada: [
    { key: "portada.fondo", defaultRole: "fondoSeccion" },
    { key: "portada.logo", defaultRole: "logo" },
    { key: "portada.nombres", defaultRole: "titulo" },
    { key: "portada.separador", defaultRole: "nexosTransicionesBordes" },
    { key: "portada.fecha", defaultRole: "textoSecundario" },
    { key: "portada.bienvenida", defaultRole: "textoPrincipal" },
    { key: "portada.faltan", defaultRole: "textoSecundario" },
    { key: "portada.cuentaAtras", defaultRole: "titulo" },
    { key: "portada.cuentaAtrasLeyendas", defaultRole: "textoSecundario" },
    { key: "portada.ctaFondo", defaultRole: "fondoBoton" },
    { key: "portada.ctaTexto", defaultRole: "textoBoton" },
  ],
  portadaLibre: [],
  historia: [
    { key: "historia.tituloSeccion", defaultRole: "tituloSeccion" },
    { key: "historia.tituloInterno", defaultRole: "titulo" },
    { key: "historia.fondoSeccion", defaultRole: "fondoSeccion" },
    { key: "historia.card", defaultRole: "fondoSubseccion" },
    { key: "historia.imagen", defaultRole: "bordes" },
    { key: "historia.fecha", defaultRole: "textoBoton" },
    { key: "historia.titulo", defaultRole: "textoPrincipal" },
    { key: "historia.descripcion", defaultRole: "textoSecundario" },
    { key: "historia.navegacion", defaultRole: "textoBoton" },
  ],
  timeline: [
    { key: "timeline.fecha", defaultRole: "titulo" },
    { key: "timeline.tituloSeccion", defaultRole: "tituloSeccion" },
    { key: "timeline.fondoSeccion", defaultRole: "fondoSeccion" },
    { key: "timeline.card", defaultRole: "fondoSubseccion" },
    { key: "timeline.icono", defaultRole: "logo" },
    { key: "timeline.hora", defaultRole: "textoBoton" },
    { key: "timeline.titulo", defaultRole: "textoPrincipal" },
    { key: "timeline.descripcion", defaultRole: "textoSecundario" },
    { key: "timeline.mapa", defaultRole: "bordes" },
  ],
  galeria: [
    { key: "galeria.tituloSeccion", defaultRole: "tituloSeccion" },
    { key: "galeria.tituloInterno", defaultRole: "titulo" },
    { key: "galeria.tabTextoActivo", defaultRole: "textoBoton" },
    { key: "galeria.tabFondoActivo", defaultRole: "fondoBoton" },
    { key: "galeria.tabTextoInactivo", defaultRole: "textoBoton" },
    { key: "galeria.tabFondoInactivo", defaultRole: "fondoBoton" },
    { key: "galeria.fondoSeccion", defaultRole: "fondoSeccion" },
    { key: "galeria.card", defaultRole: "fondoSubseccion" },
    { key: "galeria.imagen", defaultRole: "bordes" },
    { key: "galeria.titulo", defaultRole: "textoPrincipal" },
    { key: "galeria.subtitulo", defaultRole: "textoSecundario" },
  ],
  pie: [],
};

function getComponentStyleByKey(key: SectionComponentKey, color: string): CSSProperties {
  switch (key) {
    case "portada.fondo":
    case "historia.fondoSeccion":
    case "timeline.fondoSeccion":
    case "galeria.fondoSeccion":
    case "carrusel.fondoSeccion":
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
    case "carrusel.tituloSeccion":
    case "historia.tituloInterno":
    case "historia.fecha":
    case "historia.titulo":
    case "historia.descripcion":
    case "historia.navegacion":
    case "timeline.fecha":
    case "timeline.tituloSeccion":
    case "timeline.hora":
    case "timeline.titulo":
    case "timeline.descripcion":
    case "timeline.icono":
    case "galeria.tituloSeccion":
    case "galeria.tituloInterno":
    case "galeria.tabTextoActivo":
    case "galeria.tabTextoInactivo":
    case "galeria.titulo":
    case "galeria.subtitulo":
      return { color };
    case "historia.card":
    case "timeline.card":
    case "galeria.card":
      return { backgroundColor: color };
    case "galeria.tabFondoActivo":
    case "galeria.tabFondoInactivo":
      return { backgroundColor: color, borderColor: color };
    case "historia.imagen":
    case "timeline.mapa":
    case "galeria.imagen":
      return { borderColor: color };
    case "portada.ctaFondo":
      return { backgroundColor: color, borderColor: color };
    default:
      return {};
  }
}

function renderSeparador(separadorInput: SeparadorDiseno | undefined, roleColors?: Partial<Record<string, string>> | null, sepKey?: string) {
  if (!separadorInput) return null;
  const separador: SeparadorDiseno = {
    modo: separadorInput.modo ?? "suave",
    grafico: separadorInput.grafico ?? "ornamento",
    imagenUrl: separadorInput.imagenUrl ?? "",
    imagenMaxWidthPx: separadorInput.imagenMaxWidthPx ?? 180,
    imagenMaxHeightPx: separadorInput.imagenMaxHeightPx ?? 40,
    tintMode: separadorInput.tintMode ?? "original",
    imagenColorRole: separadorInput.imagenColorRole ?? "nexosTransicionesBordes",
  };
  if (separador.modo === "sin_transicion" || separador.grafico === "ninguno") return null;

  const { maxWidthPx, maxHeightPx } = getSeparatorImageSize(separador);
  const tintRole = separador.imagenColorRole ?? "nexosTransicionesBordes";
  const separatorColor = (roleColors && tintRole in roleColors && roleColors[tintRole])
    ? roleColors[tintRole]!
    : (tintRole.startsWith("#") || tintRole.startsWith("rgb") || tintRole.startsWith("hsl") || tintRole.startsWith("var("))
    ? tintRole
    : roleColors?.nexosTransicionesBordes ?? "#C4964A";

  if (separador.grafico === "imagen" && separador.imagenUrl?.trim()) {
    const src = resolvePublicImageSrc(separador.imagenUrl);
    if (!src) return null;
    const tintMode = separador.tintMode ?? "original";

    if (tintMode === "paleta") {
      return (
        <div className="py-3" aria-hidden="true" key={sepKey}>
          <div
            className="mx-auto"
            style={{
              width: `min(100%, ${maxWidthPx}px)`,
              height: `${maxHeightPx}px`,
              backgroundColor: separatorColor,
              WebkitMaskImage: `url(${src})`,
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              WebkitMaskSize: "contain",
              maskImage: `url(${src})`,
              maskRepeat: "no-repeat",
              maskPosition: "center",
              maskSize: "contain",
            }}
          />
        </div>
      );
    }

    return (
      <div className="py-3" aria-hidden="true" key={sepKey}>
        <img
          src={src}
          alt=""
          className="mx-auto block h-auto w-auto object-contain"
          style={{
            maxWidth: `${maxWidthPx}px`,
            maxHeight: `${maxHeightPx}px`,
          }}
        />
      </div>
    );
  }

  if (separador.grafico === "ornamento") {
    return (
      <div className="mx-auto overflow-hidden" style={{ width: `min(100%, ${maxWidthPx}px)`, maxHeight: `${maxHeightPx}px` }} key={sepKey}>
        <OrnamentoDivisor className="my-0" color={separatorColor} />
      </div>
    );
  }
  if (separador.grafico === "linea_doble") {
    return (
      <div className="mx-auto px-4 py-2" style={{ width: `min(100%, ${maxWidthPx}px)`, maxHeight: `${maxHeightPx}px` }} aria-hidden="true" key={sepKey}>
        <div className="h-px" style={{ backgroundColor: separatorColor }} />
        <div className="mt-1 h-px" style={{ backgroundColor: separatorColor, opacity: 0.7 }} />
      </div>
    );
  }
  if (separador.grafico === "onda_fina") {
    return (
      <div className="mx-auto overflow-hidden" style={{ width: `min(100%, ${maxWidthPx}px)`, maxHeight: `${maxHeightPx}px` }} key={sepKey}>
        <SeparadorSeccion colorHacia={separatorColor} />
      </div>
    );
  }
  return (
    <div className="mx-auto flex items-center justify-center gap-2 overflow-hidden py-3" style={{ width: `min(100%, ${maxWidthPx}px)`, maxHeight: `${maxHeightPx}px` }} aria-hidden="true" key={sepKey}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: separatorColor }} />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: separatorColor, opacity: 0.7 }} />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: separatorColor }} />
    </div>
  );
}

export default async function PaginaPrincipal({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const seccionFoco = typeof rawSearchParams.seccion === "string" ? rawSearchParams.seccion : undefined;

  // El resto de parametros (ej. inviteCode) deben persistir en todos los enlaces internos.
  const preservedParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (key === "seccion" || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => preservedParams.append(key, v));
    } else {
      preservedParams.set(key, value);
    }
  }
  const queryString = preservedParams.toString();

  const config = await getWeddingConfig();
  const galleryMedia = await getFeaturedGalleryMedia();
  const separador = config.diseno?.separador;
  const paletas = config.tema.paletas ?? [];
  const paletaGlobal = paletas.find((p) => p.id === config.tema.paletaActivaId) ?? paletas[0];
  const tratamientosImagenes = config.diseno?.tratamientosImagenes ?? {};

  const getPaletteBySection = (section?: SeccionDiseno): TemaPaleta | undefined => {
    if (!section) return paletaGlobal;
    if (section.usarPaletaGlobal ?? true) return paletaGlobal;
    return paletas.find((palette) => palette.id === section.paletaId) ?? paletaGlobal;
  };

  const getSectionThemeVars = (section?: SeccionDiseno): CSSProperties => {
    const palette = getPaletteBySection(section);
    const resolved = palette ? resolvePaletteToThemeColors(palette) : config.tema.colores;
    const roles = palette ? resolvePaletteRoleColors(palette) : null;
    const imageTexture = palette ? textureToCssImage(resolvePaletteRoleTextures(palette).fondoSeccion, resolveDriveMediaSrc) : { image: "none", size: "auto" };
    return {
      ["--role-fondo-principal" as string]: roles?.fondoSeccion,
      ["--role-fondo-alterno" as string]: roles?.fondoSubseccion,
      ["--role-texto-principal" as string]: roles?.textoPrincipal,
      ["--role-texto-secundario" as string]: roles?.textoSecundario,
      ["--role-titulos" as string]: roles?.titulo,
      ["--role-boton-fondo" as string]: roles?.fondoBoton,
      ["--role-boton-texto" as string]: roles?.textoBoton,
      ["--role-bordes-divisores" as string]: roles?.nexosTransicionesBordes,
      ["--role-highlight-acento" as string]: roles?.logo,
      ["--bronze" as string]: resolved.bronze,
      ["--bronze-light" as string]: resolved.bronzeLight,
      ["--bronze-pale" as string]: roles?.nexosTransicionesBordes ?? resolved.bronzeLight,
      ["--olive" as string]: resolved.olive,
      ["--olive-muted" as string]: resolved.oliveMuted,
      ["--cream" as string]: resolved.cream,
      ["--cream-dark" as string]: roles?.fondoSubseccion,
      ["--brown-dark" as string]: resolved.brownDark,
      ["--brown-mid" as string]: roles?.textoSecundario ?? resolved.oliveMuted,
      ["--white" as string]: resolved.white,
      ...buildTextureCssVars(palette, resolveDriveMediaSrc),
      ...buildFontCssVars(config.tema.fuentes),
      ["--content-texture-image" as string]: imageTexture.image,
      ["--content-texture-size" as string]: imageTexture.size,
    };
  };

  const getSectionComponentStyles = (section?: SeccionDiseno): Partial<Record<SectionComponentKey, CSSProperties>> => {
    if (!section) return {};
    const palette = getPaletteBySection(section);
    if (!palette) return {};
    const roleColors = resolvePaletteRoleColors(palette);
    const roleTextures = resolvePaletteRoleTextures(palette);
    const options = SECTION_COMPONENT_OPTIONS[section.tipo] ?? [];
    return options.reduce((acc, option) => {
        const role = option.key.endsWith(".tituloSeccion")
          ? "tituloSeccion"
          : section.componentRoles?.[option.key] ?? option.defaultRole;
      const color = roleColors[role];
      acc[option.key] = {
        ...withBorderStyle(option.key, withTextureStyle(option.key, getComponentStyleByKey(option.key, color), roleTextures[role], resolveDriveMediaSrc), section.componentBorders?.[option.key]),
        ...getComponentSizeStyle(option.key, section.componentSizes?.[option.key]),
        ...getComponentFontStyle(option.key, section.componentFonts?.[option.key]),
      };
      return acc;
    }, {} as Partial<Record<SectionComponentKey, CSSProperties>>);
  };

  const publicGroups = getPublicSectionGroups(config.diseno?.secciones ?? []);
  // El pie de pagina personalizado nunca forma parte del scroll principal: se renderiza aparte, siempre al final.
  const pieSection = getPublicPieSection(config.diseno?.secciones ?? []);

  // Secciones con acceso directo desde el menu hamburguesa (aunque no esten en pantalla principal).
  const menuSecciones = publicGroups.map((group) => group.head)
    .filter((s) => s.menuDirecto && s.tipo !== "intro" && s.tipo !== "pie")
    .map((s) => ({
      anchorId: getSectionAnchor(s),
      titulo: s.titulo || s.nombre,
      enPantallaPrincipal: s.visible,
    }));

  // Seccion pedida via el menu de "solo acceso directo" (no visible en el scroll principal).
  const seccionEnfocada = seccionFoco
    ? publicGroups.find((group) => group.head.tipo !== "pie" && group.head.menuDirecto && !group.head.visible && group.sections.some((section) => getSectionAnchor(section) === seccionFoco || getLegacySectionAnchor(section) === seccionFoco))
    : undefined;

  const visibleGroups = seccionEnfocada
    ? [seccionEnfocada]
    : publicGroups.filter((group) => group.head.visible);

  const introSection = seccionEnfocada ? undefined : visibleGroups.find((group) => group.head.tipo === "intro" && group.head.intro)?.head;
  const contentGroups = visibleGroups.filter((group) => group.head.tipo !== "intro" && group.head.tipo !== "pie");

  const fallbackSections: Array<{ id: string; tipo: TipoSeccionDiseno; titulo: string; source?: SeccionDiseno }> = [
    { id: "sec-invitacion-fallback", tipo: "invitacion", titulo: "Invitacion" },
    { id: "sec-historia-fallback", tipo: "historia", titulo: "Nuestra historia" },
    { id: "sec-galeria-fallback", tipo: "galeria", titulo: "Galeria" },
    { id: "sec-timeline-fallback", tipo: "timeline", titulo: "El gran dia" },
  ];

  const normalizeSectionType = (tipo: TipoSeccionDiseno): TipoSeccionDiseno => (tipo === "portada" ? "invitacion" : tipo);

  const orderedGroups = contentGroups.length > 0
    ? contentGroups.map((group) => group.sections.map((section) => ({ id: section.id, tipo: normalizeSectionType(section.tipo), titulo: section.titulo || section.nombre, source: section })))
    : seccionEnfocada || config.diseno?.secciones?.length
      ? []
      : fallbackSections.map((section) => [section]);

  const legacyAnchorOwners = new Map<string, string>();
  for (const group of orderedGroups) {
    for (const section of group) {
      const legacyAnchor = getLegacySectionAnchor(section);
      if (!legacyAnchorOwners.has(legacyAnchor)) legacyAnchorOwners.set(legacyAnchor, section.id);
    }
  }

  const renderSectionSpacing = (section?: SeccionDiseno) => {
    const mobile = Math.max(0, section?.distanciaSiguiente?.movil ?? 0);
    const pc = Math.max(0, section?.distanciaSiguiente?.pc ?? 0);
    if (mobile === 0 && pc === 0) return null;

    return (
      <>
        <div className="sm:hidden" style={{ height: `${mobile}px` }} aria-hidden="true" />
        <div className="hidden sm:block" style={{ height: `${pc}px` }} aria-hidden="true" />
      </>
    );
  };

  const getInvitacionConfigForSection = (section?: SeccionDiseno) => {
    const welcome = section?.items?.[0]?.descripcion?.trim() || DEFAULT_TEXTO_INVITACION;
    return {
      ...config,
      textos: {
        ...config.textos,
        bienvenida: welcome,
      },
    };
  };

  const getHistoriaForSection = (section?: SeccionDiseno) => {
    const items = section?.items ?? [];
    if (items.length === 0) return config.historia;
    return items.map((item, index) => ({
      id: item.id,
      fecha: item.hora || `Momento ${index + 1}`,
      titulo: item.titulo || "",
      descripcion: item.descripcion || "",
      imagen: item.imagen,
      lineAlive: item.lineAlive,
      lado: index % 2 === 0 ? "derecha" as const : "izquierda" as const,
    }));
  };

  const getTimelineForSection = (section?: SeccionDiseno) => {
    const items = section?.items ?? [];
    if (items.length === 0) return config.timeline;
    return items.map((item) => ({
      id: item.id,
      hora: item.hora || "",
      titulo: item.titulo || "",
      descripcion: item.descripcion || "",
      icono: (item.icono as (typeof config.timeline)[number]["icono"]) || "rings",
      enlaceMaps: item.enlaceMaps || "",
      imagen: item.imagen || undefined,
      logoTamano: item.logoTamano,
      logoAlineacion: item.logoAlineacion,
    }));
  };

  const getGalleryMediaForSection = (section?: SeccionDiseno) => {
    if (section?.galeriaConfig?.mostrarSeleccionNovios === false) {
      return [];
    }
    return galleryMedia.map((media) => ({
      ...media,
      tratamientoImagen: tratamientosImagenes[`galeria:${media.id}`],
    }));
  };

  const pageContent = (
    <div>
      <NavegacionPublica
        config={config}
        comportamiento={config.diseno?.navegacion?.comportamiento}
        banner={config.diseno?.navegacion}
        secciones={menuSecciones}
        queryString={queryString}
      />
      {seccionEnfocada && (
        <div className="container-wedding pt-20 sm:pt-24">
          <a href={queryString ? `/?${queryString}` : "/"} className="inline-block text-xs uppercase tracking-widest text-bronze underline">
            Volver al inicio
          </a>
        </div>
      )}
      <main>
        {orderedGroups.map((group, groupIndex) => (
          <SectionChain
            key={group[0].id}
            ids={group.map(getSectionAnchor)}
            abiertaPorDefecto={Boolean(seccionEnfocada) || (group[0].tipo === "portadaLibre" && group[0].source?.portadaLibre?.abiertaPorDefecto !== false)}
          >
        {group.map((section, index) => {
          const componentStyles = getSectionComponentStyles(section.source);
          const sectionPalette = section.source ? getPaletteBySection(section.source) : paletaGlobal;
          const sectionRoleColors = sectionPalette ? resolvePaletteRoleColors(sectionPalette) : null;
          const isLastInGroup = index === group.length - 1;
          const isLast = isLastInGroup && groupIndex === orderedGroups.length - 1;
          const anchorId = getSectionAnchor(section);
          const legacyAnchor = getLegacySectionAnchor(section);
          const anchorAliases = legacyAnchor !== anchorId && legacyAnchorOwners.get(legacyAnchor) === section.id ? [legacyAnchor] : [];
          const sectionInternalSeparator = section.source?.separadorInterno ?? {
            modo: "suave",
            grafico: "ornamento",
            imagenColorRole: "nexosTransicionesBordes",
          };
          const sectionSpacing = !isLast ? renderSectionSpacing(section.source) : null;
          return (
            <div key={section.id} id={anchorAliases[0]} style={getSectionThemeVars(section.source)}>
              {section.tipo === "invitacion" && (
                <SeccionColapsable id={anchorId} anchorAliases={anchorAliases} abiertaPorDefecto={true} ocultarCabecera={true} afterContent={sectionSpacing}>
                  <MainWithInvite
                    config={getInvitacionConfigForSection(section.source)}
                    selloUrl={section.source?.selloUrl}
                    componentStyles={componentStyles}
                    headerDivider={renderSeparador(sectionInternalSeparator, sectionRoleColors, `${section.id}-divider`)}
                  />
                </SeccionColapsable>
              )}

              {section.tipo === "portadaLibre" && (
                <SeccionColapsable
                  id={anchorId}
                  anchorAliases={anchorAliases}
                  titulo={section.source?.portadaLibre?.mostrarTitulo ? section.titulo : ""}
                  abiertaPorDefecto={Boolean(seccionEnfocada) || section.source?.portadaLibre?.abiertaPorDefecto !== false}
                  ocultarCabecera={section.source?.portadaLibre?.colapsable === false}
                  bgColor="var(--cream)"
                  titleStyle={{ color: sectionRoleColors?.tituloSeccion }}
                  afterContent={sectionSpacing}
                >
                  <PortadaLibre
                    config={section.source?.portadaLibre}
                    roleColors={sectionRoleColors ?? {}}
                    resolveSrc={resolvePublicImageSrc}
                    imageTreatments={tratamientosImagenes}
                  />
                </SeccionColapsable>
              )}

              {section.tipo === "historia" && (
                <SeccionColapsable
                  id={anchorId}
                  anchorAliases={anchorAliases}
                  titulo={section.titulo || "Nuestra historia"}
                  abiertaPorDefecto={Boolean(seccionEnfocada)}
                  bgColor="var(--cream)"
                  sectionStyle={componentStyles["historia.fondoSeccion"]}
                  titleStyle={componentStyles["historia.tituloSeccion"]}
                  afterContent={sectionSpacing}
                >
                  <SeccionHistoria
                    eventos={getHistoriaForSection(section.source)}
                    imageTreatments={tratamientosImagenes}
                    componentStyles={componentStyles}
                    sectionInternalTitle={section.source?.subtituloInterno || "El camino hasta aquí"}
                    headerDivider={renderSeparador(sectionInternalSeparator, sectionRoleColors, `${section.id}-divider`)}
                  />
                </SeccionColapsable>
              )}

              {section.tipo === "carrusel" && (
                <SeccionColapsable
                  id={anchorId}
                  anchorAliases={anchorAliases}
                  titulo={section.titulo || "Fotos"}
                  abiertaPorDefecto={Boolean(seccionEnfocada)}
                  bgColor="var(--cream)"
                  sectionStyle={componentStyles["carrusel.fondoSeccion"]}
                  titleStyle={componentStyles["carrusel.tituloSeccion"]}
                  afterContent={sectionSpacing}
                >
                  <SeccionCarrusel items={section.source?.items ?? []} navigationStyle={componentStyles["carrusel.navegacion"]} imageTreatments={tratamientosImagenes} />
                </SeccionColapsable>
              )}

              {section.tipo === "galeria" && (
                <SeccionColapsable
                  id={anchorId}
                  anchorAliases={anchorAliases}
                  titulo={section.titulo || "Galeria"}
                  abiertaPorDefecto={Boolean(seccionEnfocada)}
                  bgColor="var(--cream)"
                  sectionStyle={componentStyles["galeria.fondoSeccion"]}
                  titleStyle={componentStyles["galeria.tituloSeccion"]}
                  afterContent={sectionSpacing}
                >
                  <SeccionGaleria
                    media={getGalleryMediaForSection(section.source)}
                    componentStyles={componentStyles}
                    headerDivider={renderSeparador(sectionInternalSeparator, sectionRoleColors, `${section.id}-divider`)}
                    galeriaConfig={section.source?.galeriaConfig}
                  />
                </SeccionColapsable>
              )}

              {section.tipo === "timeline" && (
                <SeccionColapsable
                  id={anchorId}
                  anchorAliases={anchorAliases}
                  titulo={section.titulo || "El gran dia"}
                  abiertaPorDefecto={Boolean(seccionEnfocada)}
                  bgColor="var(--cream-dark)"
                  sectionStyle={componentStyles["timeline.fondoSeccion"]}
                  titleStyle={componentStyles["timeline.tituloSeccion"]}
                  afterContent={sectionSpacing}
                >
                  <SeccionTimeline
                    localizaciones={config.localizaciones}
                    timeline={getTimelineForSection(section.source)}
                    legacyLogoSize={section.source?.componentSizes?.["timeline.icono"]}
                    componentStyles={componentStyles}
                    headerDivider={renderSeparador(sectionInternalSeparator, sectionRoleColors, `${section.id}-divider`)}
                  />
                </SeccionColapsable>
              )}

              {!isLast && section.tipo !== "timeline" && section.tipo !== "carrusel" && (
                isLastInGroup
                  ? renderSeparador(separador, sectionRoleColors, `${section.id}-separator`)
                  : <SectionChainDecoration>{renderSeparador(separador, sectionRoleColors, `${section.id}-separator`)}</SectionChainDecoration>
              )}
            </div>
          );
        })}
          </SectionChain>
        ))}
      </main>
      <PieDePagina
        config={config}
        seccionPie={pieSection}
        roleColors={getPaletteBySection(pieSection) ? resolvePaletteRoleColors(getPaletteBySection(pieSection)!) : {}}
        resolveSrc={resolvePublicImageSrc}
        imageTreatments={tratamientosImagenes}
        themeVars={getSectionThemeVars(pieSection)}
      />
    </div>
  );

  const introStorageKey = `intro:${config.slug}`;
  const normalizedIntro = introSection?.intro ? normalizeIntroConfig(introSection.intro) : undefined;

  const lacreSrc = normalizedIntro?.activo ? resolveDriveMediaSrc(normalizedIntro.lacreUrl) || "/images/Sello.svg" : undefined;
  const introPalette = getPaletteBySection(introSection);
  const sobreRole = introSection?.componentRoles?.["intro.sobre"] ?? "fondoSubseccion";
  const sobreTexture = introPalette ? resolvePaletteRoleTextures(introPalette)[sobreRole] : undefined;
  const envelopeTexture = sobreTexture
    ? { url: resolveDriveMediaSrc(sobreTexture.url), sizePx: sobreTexture.sizePx, color: sobreTexture.color }
    : undefined;
  const envelopeImageSrcs = normalizedIntro?.activo
    ? [...new Set([normalizedIntro.pc, normalizedIntro.movil].flatMap((device) => {
        if (device?.tipo !== "envelope") return [];
        const resources = getEnvelopeResources(device.envelope ?? {}, envelopeTexture);
        return [resources.texture?.url, resources.image, resources.exterior].filter((src): src is string => Boolean(src));
      }))]
    : [];

  const contentWithIntro = introSection?.intro ? (
    <>
      {lacreSrc && !lacreSrc.trim().startsWith("<") ? <link rel="preload" href={lacreSrc} as="fetch" crossOrigin="anonymous" fetchPriority="high" /> : null}
      {envelopeImageSrcs.map((src) => (
        <link key={src} rel="preload" href={src} as="image" fetchPriority="high" />
      ))}
      <IntroReveal
        config={introSection.intro}
        storageKey={introStorageKey}
        themeStyle={getSectionThemeVars(introSection)}
        introStyle={getSectionComponentStyles(introSection)["intro.fondo"]}
        envelopeTexture={envelopeTexture}
      >
        <PostIntroSectionsGate>{pageContent}</PostIntroSectionsGate>
      </IntroReveal>
    </>
  ) : pageContent;

  return <WeddingViewport design={config.diseno}>{contentWithIntro}</WeddingViewport>;
}
