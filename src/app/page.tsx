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
import { SeccionHistoria } from "@/components/wedding/SeccionHistoria";
import { SeccionTimeline } from "@/components/wedding/SeccionTimeline";
import { getFeaturedGalleryMedia } from "@/lib/wedding-gallery-server";
import type { SeparadorDiseno, TipoSeccionDiseno, SeccionDiseno, TemaPaleta } from "@/config/wedding.config";
import type { CSSProperties } from "react";

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
    return {
      ["--bronze" as string]: palette?.colores.bronze,
      ["--bronze-light" as string]: palette?.colores.bronzeLight,
      ["--olive" as string]: palette?.colores.olive,
      ["--olive-muted" as string]: palette?.colores.oliveMuted,
      ["--cream" as string]: palette?.colores.cream,
      ["--brown-dark" as string]: palette?.colores.brownDark,
      ["--white" as string]: palette?.colores.white,
      ["--font-display" as string]: config.tema.fuentes.display,
      ["--font-body" as string]: config.tema.fuentes.body,
    };
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
                  <MainWithInvite config={config} />
                </SeccionColapsable>
              )}

              {section.tipo === "historia" && (
                <SeccionColapsable id={anchorId} titulo={section.titulo || "Nuestra historia"} abiertaPorDefecto={false} bgColor="var(--cream)">
                  <SeccionHistoria eventos={config.historia} />
                </SeccionColapsable>
              )}

              {section.tipo === "galeria" && (
                <SeccionColapsable id={anchorId} titulo={section.titulo || "Galeria"} abiertaPorDefecto={false} bgColor="var(--cream)">
                  <SeccionGaleria media={galleryMedia} />
                </SeccionColapsable>
              )}

              {section.tipo === "timeline" && (
                <SeccionColapsable id={anchorId} titulo={section.titulo || "El gran dia"} abiertaPorDefecto={false} bgColor="var(--cream-dark)">
                  <SeccionTimeline localizaciones={config.localizaciones} timeline={config.timeline} />
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
