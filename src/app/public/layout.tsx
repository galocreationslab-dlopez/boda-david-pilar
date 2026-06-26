/**
 * app/public/layout.tsx
 * ─────────────────────────────────────────────────────────────
 * Layout compartido para todas las páginas públicas de la boda.
 * Incluye navegación y pie de página.
 */

import { NavegacionPublica } from "@/components/layout/NavegacionPublica";
import { PieDePagina } from "@/components/layout/PieDePagina";
import { weddingConfig } from "@/config/wedding.config";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavegacionPublica config={weddingConfig} />
      <main>{children}</main>
      <PieDePagina config={weddingConfig} />
    </>
  );
}
