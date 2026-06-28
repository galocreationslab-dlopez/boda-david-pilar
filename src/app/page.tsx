/**
 * app/page.tsx
 * Página principal con secciones colapsables.
 */

import { weddingConfig } from "@/config/wedding.config";
import { NavegacionPublica } from "@/components/layout/NavegacionPublica";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { SeparadorSeccion } from "@/components/ui/OrnamentoDivisor";
import { SeccionColapsable } from "@/components/wedding/SeccionColapsable";
import MainWithInvite from "@/components/wedding/MainWithInvite";
import { SeccionHistoria } from "@/components/wedding/SeccionHistoria";
import { SeccionTimeline } from "@/components/wedding/SeccionTimeline";

export default function PaginaPrincipal() {
  const config = weddingConfig;

  return (
    <>
      <NavegacionPublica config={config} />
      <main>
        <SeccionColapsable id="portada" abiertaPorDefecto={true} ocultarCabecera={true}>
          <MainWithInvite config={config} />
        </SeccionColapsable>

        <SeparadorSeccion colorDesde="#2E1F0E" colorHacia="#F7F3EC" />

        {/* SECCIÓN 2 — Nuestra historia, plegada por defecto */}
        <SeccionColapsable
          id="historia"
          titulo="Nuestra historia"
          abiertaPorDefecto={false}
          bgColor="var(--cream)"
        >
          <SeccionHistoria eventos={config.historia} />
        </SeccionColapsable>

        <SeparadorSeccion colorDesde="#F7F3EC" colorHacia="#EDE7DB" />

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
      </main>
      <PieDePagina config={config} />
    </>
  );
}
