/**
 * app/layout.tsx
 */

import type { Metadata } from "next";
import "@/styles/globals.css";
import { weddingConfig } from "@/config/wedding.config";
import { getWeddingConfig, buildCssOverrides } from "@/lib/wedding-config-server";

export const metadata: Metadata = {
  title: `${weddingConfig.novia.nombre} & ${weddingConfig.novio.nombre} · ${weddingConfig.fechaFormateada}`,
  description: `Os invitamos a nuestra boda el ${weddingConfig.fechaFormateada}.`,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getWeddingConfig();
  const cssOverrides = buildCssOverrides(config);

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Lato:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        {/* CSS variables desde configuración en BD — sobreescriben globals.css */}
      </head>
      <body>
        {/* CSS variables desde BD — en body para sobrescribir globals.css en cascade */}
        <style dangerouslySetInnerHTML={{ __html: cssOverrides }} />
        {children}
      </body>
    </html>
  );
}
