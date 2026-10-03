/**
 * app/page.tsx
 * Página principal con secciones colapsables.
 */

import { getWeddingConfig } from "@/lib/wedding-config-server";
import { NavegacionPublica } from "@/components/layout/NavegacionPublica";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { OrnamentoDivisor, SeparadorSeccion } from "@/components/ui/OrnamentoDivisor";
import { SeccionColapsable } from "@/components/wedding/SeccionColapsable";
import MainWithInvite from "@/components/wedding/MainWithInvite";
import PortadaLibre from "@/components/wedding/PortadaLibre";
import { SeccionGaleria } from "@/components/wedding/SeccionGaleria";
import { SeccionHistoria, type HistoriaComponentKey } from "@/components/wedding/SeccionHistoria";
import { SeccionTimeline, type TimelineComponentKey } from "@/components/wedding/SeccionTimeline";
import type { HeroComponentKey } from "@/components/wedding/HeroPortada";
import type { GaleriaComponentKey } from "@/components/wedding/SeccionGaleria";
import { getFeaturedGalleryMedia } from "@/lib/wedding-gallery-server";
import { buildTextureCssVars, resolvePaletteRoleColors, resolvePaletteRoleTextures, resolvePaletteToThemeColors, withTextureStyle } from "@/lib/theme-roles";
import { getComponentSizeStyle } from "@/lib/component-size";
import { buildFontCssVars, getComponentFontStyle } from "@/lib/theme-fonts";
import { DEFAULT_TEXTO_INVITACION, normalizeIntroConfig, type SeparadorDiseno, type TipoSeccionDiseno, type SeccionDiseno, type TemaColorRole, type TemaPaleta } from "@/config/wedding.config";
import IntroReveal from "@/components/motion/IntroReveal";
import PostIntroSectionsGate from "@/components/motion/PostIntroSectionsGate";
import { resolveDriveMediaSrc } from "@/lib/drive-image";
import type { CSSProperties } from "react";

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
  | "galeria.fondoSeccion";

const SECTION_COMPONENT_OPTIONS: Record<TipoSeccionDiseno, Array<{ key: SectionComponentKey; defaultRole: TemaColorRole }>> = {
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
    { key: "galeria.fondoSeccion", defaultRole: "fondoSeccion" },
    { key: "galeria.card", defaultRole: "fondoSubseccion" },
    { key: "galeria.imagen", defaultRole: "bordes" },
    { key: "galeria.titulo", defaultRole: "textoPrincipal" },
    { key: "galeria.subtitulo", defaultRole: "textoSecundario" },
  ],
};

function getComponentStyleByKey(key: SectionComponentKey, color: string): CSSProperties {
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

function getAnchorId(tipo: TipoSeccionDiseno, sectionId?: string): string {
  if (tipo === "portadaLibre") return `portada-${sectionId ?? "libre"}`;
  if (tipo === "invitacion" || tipo === "portada") return "invitacion";
  if (tipo === "historia") return "historia";
  if (tipo === "galeria") return "galeria";
  return "timeline";
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

  const getPaletteBySection = (section?: SeccionDiseno): TemaPaleta | undefined => {
    if (!section) return paletaGlobal;
    if (section.usarPaletaGlobal ?? true) return paletaGlobal;
    return paletas.find((palette) => palette.id === section.paletaId) ?? paletaGlobal;
  };

  const getSectionThemeVars = (section?: SeccionDiseno): CSSProperties => {
    const palette = getPaletteBySection(section);
    const resolved = palette ? resolvePaletteToThemeColors(palette) : config.tema.colores;
    const roles = palette ? resolvePaletteRoleColors(palette) : null;
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
      const role = section.componentRoles?.[option.key] ?? option.defaultRole;
      const color = roleColors[role];
      acc[option.key] = {
        ...withTextureStyle(option.key, getComponentStyleByKey(option.key, color), roleTextures[role], resolveDriveMediaSrc),
        ...getComponentSizeStyle(option.key, section.componentSizes?.[option.key]),
        ...getComponentFontStyle(option.key, section.componentFonts?.[option.key]),
      };
      return acc;
    }, {} as Partial<Record<SectionComponentKey, CSSProperties>>);
  };

  const perfilPublicoFilter = (s: SeccionDiseno): boolean => {
    if (!s.perfiles || s.perfiles.length === 0) return true;
    return s.perfiles.includes("publico");
  };

  const todasLasSecciones = (config.diseno?.secciones ?? []).filter(perfilPublicoFilter);

  // Secciones con acceso directo desde el menu hamburguesa (aunque no esten en pantalla principal).
  const menuSecciones = todasLasSecciones
    .filter((s) => s.menuDirecto && s.tipo !== "intro")
    .map((s) => ({
      anchorId: getAnchorId(s.tipo === "portada" ? "invitacion" : s.tipo, s.id),
      titulo: s.titulo || s.nombre,
      enPantallaPrincipal: s.visible,
    }));

  // Seccion pedida via el menu de "solo acceso directo" (no visible en el scroll principal).
  const seccionEnfocada = seccionFoco
    ? todasLasSecciones.find((s) => s.menuDirecto && !s.visible && getAnchorId(s.tipo === "portada" ? "invitacion" : s.tipo, s.id) === seccionFoco)
    : undefined;

  const visibleSections = seccionEnfocada
    ? [seccionEnfocada]
    : todasLasSecciones.filter((s) => s.visible);

  const introSection = seccionEnfocada ? undefined : visibleSections.find((section) => section.tipo === "intro" && section.intro);
  const contentSections = visibleSections.filter((section) => section.tipo !== "intro");

  const fallbackSections: Array<{ id: string; tipo: TipoSeccionDiseno; titulo: string; source?: SeccionDiseno }> = [
    { id: "sec-invitacion-fallback", tipo: "invitacion", titulo: "Invitacion" },
    { id: "sec-historia-fallback", tipo: "historia", titulo: "Nuestra historia" },
    { id: "sec-galeria-fallback", tipo: "galeria", titulo: "Galeria" },
    { id: "sec-timeline-fallback", tipo: "timeline", titulo: "El gran dia" },
  ];

  const normalizeSectionType = (tipo: TipoSeccionDiseno): TipoSeccionDiseno => (tipo === "portada" ? "invitacion" : tipo);

  const orderedSections = contentSections.length > 0
    ? contentSections.map((s) => ({ id: s.id, tipo: normalizeSectionType(s.tipo), titulo: s.titulo || s.nombre, source: s }))
    : seccionEnfocada
      ? []
      : fallbackSections;

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
    }));
  };

  const getGalleryMediaForSection = (section?: SeccionDiseno) => {
    if (section?.galeriaConfig?.mostrarSeleccionNovios === false) {
      return [];
    }
    return galleryMedia;
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
        {orderedSections.map((section, index) => {
          const componentStyles = getSectionComponentStyles(section.source);
          const sectionPalette = section.source ? getPaletteBySection(section.source) : paletaGlobal;
          const sectionRoleColors = sectionPalette ? resolvePaletteRoleColors(sectionPalette) : null;
          const isLast = index === orderedSections.length - 1;
          const anchorId = section.tipo === "portadaLibre"
            ? getAnchorId("portadaLibre", section.id)
            : section.tipo === "invitacion"
            ? "invitacion"
            : section.tipo === "historia"
            ? "historia"
            : section.tipo === "galeria"
            ? "galeria"
            : "timeline";
          const sectionInternalSeparator = section.source?.separadorInterno ?? {
            modo: "suave",
            grafico: "ornamento",
            imagenColorRole: "nexosTransicionesBordes",
          };
          return (
            <div key={section.id} style={getSectionThemeVars(section.source)}>
              {section.tipo === "invitacion" && (
                <SeccionColapsable id={anchorId} abiertaPorDefecto={true} ocultarCabecera={true}>
                  <MainWithInvite
                    config={getInvitacionConfigForSection(section.source)}
                    componentStyles={componentStyles}
                    headerDivider={renderSeparador(sectionInternalSeparator, sectionRoleColors, `${section.id}-divider`)}
                  />
                </SeccionColapsable>
              )}

              {section.tipo === "portadaLibre" && (
                <SeccionColapsable
                  id={anchorId}
                  titulo={section.source?.portadaLibre?.mostrarTitulo ? section.titulo : ""}
                  abiertaPorDefecto={Boolean(seccionEnfocada) || section.source?.portadaLibre?.abiertaPorDefecto !== false}
                  ocultarCabecera={section.source?.portadaLibre?.colapsable === false}
                  bgColor="var(--cream)"
                >
                  <PortadaLibre
                    config={section.source?.portadaLibre}
                    roleColors={sectionRoleColors ?? {}}
                    resolveSrc={resolvePublicImageSrc}
                  />
                </SeccionColapsable>
              )}

              {section.tipo === "historia" && (
                <SeccionColapsable
                  id={anchorId}
                  titulo={section.titulo || "Nuestra historia"}
                  abiertaPorDefecto={Boolean(seccionEnfocada)}
                  bgColor="var(--cream)"
                  sectionStyle={componentStyles["historia.fondoSeccion"]}
                  titleStyle={componentStyles["historia.tituloSeccion"]}
                >
                  <SeccionHistoria
                    eventos={getHistoriaForSection(section.source)}
                    componentStyles={componentStyles}
                    sectionInternalTitle={section.source?.subtituloInterno || "El camino hasta aquí"}
                    headerDivider={renderSeparador(sectionInternalSeparator, sectionRoleColors, `${section.id}-divider`)}
                  />
                </SeccionColapsable>
              )}

              {section.tipo === "galeria" && (
                <SeccionColapsable
                  id={anchorId}
                  titulo={section.titulo || "Galeria"}
                  abiertaPorDefecto={Boolean(seccionEnfocada)}
                  bgColor="var(--cream)"
                  sectionStyle={componentStyles["galeria.fondoSeccion"]}
                  titleStyle={componentStyles["galeria.tituloSeccion"]}
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
                  titulo={section.titulo || "El gran dia"}
                  abiertaPorDefecto={Boolean(seccionEnfocada)}
                  bgColor="var(--cream-dark)"
                  sectionStyle={componentStyles["timeline.fondoSeccion"]}
                  titleStyle={componentStyles["timeline.tituloSeccion"]}
                >
                  <SeccionTimeline
                    localizaciones={config.localizaciones}
                    timeline={getTimelineForSection(section.source)}
                    componentStyles={componentStyles}
                    headerDivider={renderSeparador(sectionInternalSeparator, sectionRoleColors, `${section.id}-divider`)}
                  />
                </SeccionColapsable>
              )}

              {!isLast && renderSeparador(separador, sectionRoleColors, `${section.id}-separator`)}
            </div>
          );
        })}
      </main>
      <PieDePagina config={config} />
    </div>
  );

  const introStorageKey = `intro:${config.slug}`;
  const normalizedIntro = introSection?.intro ? normalizeIntroConfig(introSection.intro) : undefined;

  // Precarga (en el <head>, antes de hidratar React) el lacre y el fondo del sobre:
  // ambos se sirven vía nuestro proxy de Drive, así que el navegador puede empezar a
  // descargarlos en paralelo con el JS en vez de esperar a que el componente monte y
  // calcule el `background-image`/`fetch()`, que es lo que hacía que tardaran en verse.
  const lacreSrc = normalizedIntro ? resolveDriveMediaSrc(normalizedIntro.lacreUrl) || "/images/Sello.svg" : undefined;
  const envelopeImageSrcs = normalizedIntro
    ? Array.from(
        new Set(
          [normalizedIntro.pc?.envelope?.imagenUrl, normalizedIntro.movil?.envelope?.imagenUrl]
            .filter((url): url is string => Boolean(url?.trim()))
            .map((url) => resolveDriveMediaSrc(url)),
        ),
      )
    : [];

  const introPalette = getPaletteBySection(introSection);
  const sobreRole = introSection?.componentRoles?.["intro.sobre"] ?? "fondoSubseccion";
  const sobreTexture = introPalette ? resolvePaletteRoleTextures(introPalette)[sobreRole] : undefined;
  const envelopeTexture = sobreTexture
    ? { url: resolveDriveMediaSrc(sobreTexture.url), sizePx: sobreTexture.sizePx, color: sobreTexture.color }
    : undefined;

  return introSection?.intro ? (
    <>
      {lacreSrc ? <link rel="preload" href={lacreSrc} as="fetch" crossOrigin="anonymous" /> : null}
      {envelopeImageSrcs.map((src) => (
        <link key={src} rel="preload" href={src} as="image" />
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
}
