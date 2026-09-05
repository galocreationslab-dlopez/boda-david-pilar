import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin esto, Vercel no empaqueta public/LineAlive en la funciÃ³n serverless (path dinÃ¡mico no rastreable)
  outputFileTracingIncludes: {
    "/api/linealive/html": ["./public/LineAlive/**/*"],
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
