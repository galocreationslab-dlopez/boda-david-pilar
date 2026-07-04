/**
 * app/page.tsx
 * Página principal con secciones colapsables.
 */

import { getWeddingConfig } from "@/lib/wedding-config-server";
import { NavegacionPublica } from "@/components/layout/NavegacionPublica";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { SeparadorSeccion } from "@/components/ui/OrnamentoDivisor";
import { SeccionColapsable } from "@/components/wedding/SeccionColapsable";
import MainWithInvite from "@/components/wedding/MainWithInvite";
import { SeccionGaleria } from "@/components/wedding/SeccionGaleria";
import { SeccionHistoria } from "@/components/wedding/SeccionHistoria";
import { SeccionTimeline } from "@/components/wedding/SeccionTimeline";
import { getFeaturedGalleryMedia } from "@/lib/wedding-gallery-server";

export default async function PaginaPrincipal() {
  const config = await getWeddingConfig();
  const galleryMedia = await getFeaturedGalleryMedia();

  return (
    <>
      <NavegacionPublica config={config} />
      <main>
        <SeccionColapsable id="portada" abiertaPorDefecto={true} ocultarCabecera={true}>
          <MainWithInvite config={config} />
        </SeccionColapsable>

        <SeparadorSeccion colorHacia="#F7F3EC" />

        {/* SECCIÓN 2 — Nuestra historia, plegada por defecto */}
        <SeccionColapsable
          id="historia"
          titulo="Nuestra historia"
          abiertaPorDefecto={false}
          bgColor="var(--cream)"
        >
          <SeccionHistoria eventos={config.historia} />
        </SeccionColapsable>

        <SeccionColapsable
          id="galeria"
          titulo="Galería"
          abiertaPorDefecto={false}
          bgColor="var(--cream)"
        >
          <SeccionGaleria media={galleryMedia} />
        </SeccionColapsable>

        <SeparadorSeccion colorHacia="#EDE7DB" />

        {/* SECCIÓN 3 — Timeline del día, plegada por defecto */}
        <SeccionColapsable
          id="timeline"
          titulo="El gran día"
          abiertaPorDefecto={false}
          bgColor="var(--cream-dark)"
        >
          <SeccionTimeline
            localizaciones={config.localizaciones}
            timeline={config.timeline}
          />
        </SeccionColapsable>
        {/* Formulario RSVP — ahora en página independiente /rsvp/[inviteCode] */}
      </main>
      <PieDePagina config={config} />
    </>
  );
}
