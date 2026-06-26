/**
 * app/layout.tsx
 * ─────────────────────────────────────────────────────────────
 * Layout raíz de Next.js. Carga fuentes e inyecta metadatos.
 * Los metadatos leen de wedding.config.ts, no de valores fijos.
 */

import type { Metadata } from "next";
import "../styles/globals.css";
import { weddingConfig } from "@/config/wedding.config";

export const metadata: Metadata = {
  title: `${weddingConfig.novia.nombre} & ${weddingConfig.novio.nombre} · ${weddingConfig.fechaFormateada}`,
  description: `Os invitamos a nuestra boda el ${weddingConfig.fechaFormateada}. ${weddingConfig.textos.bienvenida}`,
  openGraph: {
    title: `${weddingConfig.novia.nombre} & ${weddingConfig.novio.nombre}`,
    description: weddingConfig.textos.bienvenida,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Preconexión a Google Fonts para reducir latencia */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Lato:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream text-brown-dark antialiased">
        {children}
      </body>
    </html>
  );
}
