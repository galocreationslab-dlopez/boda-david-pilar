/**
 * app/page.tsx
 * ─────────────────────────────────────────────────────────────
 * Página principal de la invitación de boda.
 * Server Component puro — todos los datos vienen de wedding.config.ts.
 * Estructura:
 *   1. Hero con cuenta atrás
 *   2. Nuestra historia (timeline)
 *   3. El gran día (localizaciones + timeline del día)
 *   4. CTA final
 */

import { weddingConfig } from "@/config/wedding.config";
import { HeroPortada } from "@/components/wedding/HeroPortada";
import { SeccionHistoria } from "@/components/wedding/SeccionHistoria";
import { SeccionDia } from "@/components/wedding/SeccionDia";
import { SeccionCTA } from "@/components/wedding/SeccionCTA";
import { NavegacionPublica } from "@/components/layout/NavegacionPublica";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { SeparadorSeccion } from "@/components/ui/OrnamentoDivisor";

export default function PaginaPrincipal() {
  const config = weddingConfig;

  return (
    <>
      <NavegacionPublica config={config} />

      <main>
        {/* 1 — Hero */}
        <HeroPortada config={config} />

        <SeparadorSeccion colorDesde="#2E1F0E" colorHacia="#F7F3EC" />

        {/* 2 — Historia */}
        <SeccionHistoria eventos={config.historia} />

        <SeparadorSeccion colorDesde="#F7F3EC" colorHacia="#EDE7DB" />

        {/* 3 — El gran día */}
        <SeccionDia
          localizaciones={config.localizaciones}
          timeline={config.timeline}
        />

        <SeparadorSeccion colorDesde="#EDE7DB" colorHacia="#F7F3EC" />

        {/* 4 — CTA final */}
        <SeccionCTA config={config} />
      </main>

      <PieDePagina config={config} />
    </>
  );
}
