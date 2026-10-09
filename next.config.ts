import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Metadatos (og:*, twitter:*) siempre dentro del <head> del HTML inicial, para cualquier cliente
  // (Next 16 solo lo garantiza para una lista de bots; con esto también para curl y otros previsualizadores).
  htmlLimitedBots: /.*/,

  // Sin esto, Vercel no empaqueta public/LineAlive en la funciÃ³n serverless (path dinÃ¡mico no rastreable)
  outputFileTracingIncludes: {
    "/api/linealive/html": ["./public/LineAlive/**/*"],
    // sharp carga libvips (.so) de forma nativa y el trazado no lo detecta: sin esto, las rutas que usan sharp fallan en Vercel.
    "/api/resources/preview": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
    "/api/admin/**/resources/**": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },

  // Permite imÃ¡genes desde Google Drive y dominios externos
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    // Nuestros proxies locales de Drive usan query string (?src=...)
    localPatterns: [
      {
        pathname: "/api/resources/preview",
      },
      {
        pathname: "/api/admin/**/resources/preview",
      },
    ],
  },

  // Cabeceras de seguridad bÃ¡sicas
  async headers() {
    return [
      {
        source: "/api/linealive/html",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/api/admin/:inviteCode/resources/linealive/html",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
