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
import { SeccionGaleria } from "@/components/wedding/SeccionGaleria";
import { SeccionHistoria, type HistoriaComponentKey } from "@/components/wedding/SeccionHistoria";
import { SeccionTimeline, type TimelineComponentKey } from "@/components/wedding/SeccionTimeline";
import type { HeroComponentKey } from "@/components/wedding/HeroPortada";
import type { GaleriaComponentKey } from "@/components/wedding/SeccionGaleria";
import { getFeaturedGalleryMedia } from "@/lib/wedding-gallery-server";
import { resolvePaletteRoleColors, resolvePaletteToThemeColors } from "@/lib/theme-roles";
import type { SeparadorDiseno, TipoSeccionDiseno, SeccionDiseno, TemaColorRole, TemaPaleta } from "@/config/wedding.config";
import type { CSSProperties } from "react";

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

const SECTION_COMPONENT_OPTIONS: Record<TipoSeccionDiseno, Array<{ key: SectionComponentKey; defaultRole: TemaColorRole }>> = {
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

function renderSeparador(separador: SeparadorDiseno | undefined) {
  if (!separador || separador.modo === "sin_transicion") return null;
  if (separador.grafico === "ornamento") return <OrnamentoDivisor className="my-0" />;
  if (separador.grafico === "linea_doble") {
    return (
      <div className="px-4 py-2" aria-hidden="true">
        <div className="h-px" style={{ backgroundColor: "var(--bronze-pale)" }} />
        <div className="mt-1 h-px" style={{ backgroundColor: "var(--bronze-light)" }} />
      </div>
    );
  }
  if (separador.grafico === "onda_fina") return <SeparadorSeccion colorHacia="var(--cream)" />;
  return (
    <div className="flex items-center justify-center gap-2 py-3" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--bronze-light)" }} />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--bronze)" }} />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--bronze-light)" }} />
    </div>
  );
}

export default async function PaginaPrincipal() {
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
      ["--font-display" as string]: config.tema.fuentes.display,
      ["--font-body" as string]: config.tema.fuentes.body,
    };
  };

  const getSectionComponentStyles = (section?: SeccionDiseno): Partial<Record<SectionComponentKey, CSSProperties>> => {
    if (!section) return {};
    const palette = getPaletteBySection(section);
    if (!palette) return {};
    const roleColors = resolvePaletteRoleColors(palette);
    const options = SECTION_COMPONENT_OPTIONS[section.tipo] ?? [];
    return options.reduce((acc, option) => {
      const role = section.componentRoles?.[option.key] ?? option.defaultRole;
      const color = roleColors[role];
      acc[option.key] = getComponentStyleByKey(option.key, color);
      return acc;
    }, {} as Partial<Record<SectionComponentKey, CSSProperties>>);
  };

  const visibleSections = (config.diseno?.secciones ?? []).filter((s) => {
    if (!s.visible) return false;
    if (!s.perfiles || s.perfiles.length === 0) return true;
    return s.perfiles.includes("publico");
  });

  const fallbackSections: Array<{ id: string; tipo: TipoSeccionDiseno; titulo: string; source?: SeccionDiseno }> = [
    { id: "sec-portada-fallback", tipo: "portada", titulo: "Invitacion" },
    { id: "sec-historia-fallback", tipo: "historia", titulo: "Nuestra historia" },
    { id: "sec-galeria-fallback", tipo: "galeria", titulo: "Galeria" },
    { id: "sec-timeline-fallback", tipo: "timeline", titulo: "El gran dia" },
  ];

  const orderedSections = visibleSections.length > 0
    ? visibleSections.map((s) => ({ id: s.id, tipo: s.tipo, titulo: s.titulo || s.nombre, source: s }))
    : fallbackSections;

  return (
    <>
      <NavegacionPublica config={config} />
      <main>
        {orderedSections.map((section, index) => {
          const componentStyles = getSectionComponentStyles(section.source);
          const isLast = index === orderedSections.length - 1;
          const anchorId = section.tipo === "portada"
            ? "portada"
            : section.tipo === "historia"
            ? "historia"
            : section.tipo === "galeria"
            ? "galeria"
            : "timeline";
          return (
            <div key={section.id} style={getSectionThemeVars(section.source)}>
              {section.tipo === "portada" && (
                <SeccionColapsable id={anchorId} abiertaPorDefecto={true} ocultarCabecera={true}>
                  <MainWithInvite config={config} componentStyles={componentStyles} />
                </SeccionColapsable>
              )}

              {section.tipo === "historia" && (
                <SeccionColapsable
                  id={anchorId}
                  titulo={section.titulo || "Nuestra historia"}
                  abiertaPorDefecto={false}
                  bgColor="var(--cream)"
                  sectionStyle={componentStyles["historia.fondoSeccion"]}
                  titleStyle={componentStyles["historia.tituloSeccion"]}
                >
                  <SeccionHistoria
                    eventos={config.historia}
                    componentStyles={componentStyles}
                    sectionInternalTitle={section.source?.subtituloInterno || "El camino hasta aquí"}
                  />
                </SeccionColapsable>
              )}

              {section.tipo === "galeria" && (
                <SeccionColapsable
                  id={anchorId}
                  titulo={section.titulo || "Galeria"}
                  abiertaPorDefecto={false}
                  bgColor="var(--cream)"
                  sectionStyle={componentStyles["galeria.fondoSeccion"]}
                  titleStyle={componentStyles["galeria.tituloSeccion"]}
                >
                  <SeccionGaleria media={galleryMedia} componentStyles={componentStyles} />
                </SeccionColapsable>
              )}

              {section.tipo === "timeline" && (
                <SeccionColapsable
                  id={anchorId}
                  titulo={section.titulo || "El gran dia"}
                  abiertaPorDefecto={false}
                  bgColor="var(--cream-dark)"
                  sectionStyle={componentStyles["timeline.fondoSeccion"]}
                  titleStyle={componentStyles["timeline.tituloSeccion"]}
                >
                  <SeccionTimeline localizaciones={config.localizaciones} timeline={config.timeline} componentStyles={componentStyles} />
                </SeccionColapsable>
              )}

              {!isLast && renderSeparador(separador)}
            </div>
          );
        })}
      </main>
      <PieDePagina config={config} />
    </>
  );
}
