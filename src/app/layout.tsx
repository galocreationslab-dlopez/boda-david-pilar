/**
 * app/layout.tsx
 */

import type { Metadata } from "next";
import { cache } from "react";
import "@/styles/globals.css";
import { getWeddingConfig, buildCssOverrides } from "@/lib/wedding-config-server";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, SITE_URL, resolveShareData } from "@/lib/share-metadata";

// Una sola lectura de configuración por petición, compartida entre metadatos y layout.
const getRequestConfig = cache(getWeddingConfig);

// Los textos e imagen se editan en Admin > Datos boda, por eso los metadatos se generan en el servidor por petición.
export async function generateMetadata(): Promise<Metadata> {
  const share = resolveShareData(await getRequestConfig());
  const image = {
    url: share.imageUrl,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: share.imageAlt,
  };

  return {
    metadataBase: new URL(SITE_URL),
    title: share.title,
    description: share.description,
    openGraph: {
      title: share.title,
      description: share.description,
      url: SITE_URL,
      siteName: share.siteName,
      locale: "es_ES",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: share.title,
      description: share.description,
      images: [image],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getRequestConfig();
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
