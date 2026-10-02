/**
 * components/layout/NavegacionPublica.tsx
 * ─────────────────────────────────────────────────────────────
 * Barra de navegación para las páginas públicas.
 * Mobile-first con menú hamburguesa.
 * Recibe datos como props — no hardcodea nada de la boda.
 */

"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { SelloNupcial } from "@/components/ui/SelloNupcial";
import { resolveDriveMediaSrc } from "@/lib/drive-image";
import {
  ELEMENTOS_BARRA_POR_DEFECTO,
  type ComportamientoBarraNavegacion,
  type ElementoBarra,
  type ElementoBarraId,
  type NavegacionDiseno,
  type PosicionElementoBarra,
  type WeddingConfig,
} from "@/config/wedding.config";

export type SeccionMenuItem = {
  anchorId: string;
  titulo: string;
  // Si es true, el enlace navega/desplaza dentro de la pagina principal.
  // Si es false, la seccion solo existe como vista independiente (?seccion=...).
  enPantallaPrincipal: boolean;
};

type NavegacionPublicaProps = {
  config: Pick<WeddingConfig, "iniciales" | "novia" | "novio">;
  comportamiento?: ComportamientoBarraNavegacion;
  banner?: Pick<NavegacionDiseno, "texto" | "logoUrl" | "elementos" | "logoAnchoPx" | "logoAltoPx" | "logoColor" | "fondoColor" | "textoTamanoPx" | "textoColor">;
  secciones?: SeccionMenuItem[];
  // Query string actual (sin el "?"), ej. "inviteCode=GALO-2603" — se preserva en todos los enlaces internos.
  queryString?: string;
};

const ZONAS: { posicion: PosicionElementoBarra; clases: string }[] = [
  { posicion: "izquierda", clases: "justify-start" },
  { posicion: "centro", clases: "justify-center" },
  { posicion: "derecha", clases: "justify-end" },
];

// Completa con los elementos que falten para tolerar configuraciones antiguas o parciales.
function normalizarElementos(elementos?: ElementoBarra[]): ElementoBarra[] {
  const validos = (elementos ?? []).filter((el) => ELEMENTOS_BARRA_POR_DEFECTO.some((d) => d.id === el.id));
  const faltan = ELEMENTOS_BARRA_POR_DEFECTO.filter((d) => !validos.some((el) => el.id === d.id));
  return [...validos, ...faltan];
}

export function NavegacionPublica({ config, comportamiento = "siempre_visible", banner, secciones = [], queryString = "" }: NavegacionPublicaProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleMenu = () => {
    window.dispatchEvent(new CustomEvent("intro:unlock-sections"));
    setMenuAbierto((prev) => !prev);
  };

  const buildHomeHref = () => (queryString ? `/?${queryString}` : "/");
  const buildAnchorHref = (anchorId: string) => `${buildHomeHref()}#${anchorId}`;
  const buildSeccionHref = (anchorId: string) => {
    const params = new URLSearchParams(queryString);
    params.set("seccion", anchorId);
    return `/?${params.toString()}`;
  };

  // Enlace a una seccion visible en la pagina principal: si ya esta en el DOM, la desplegamos
  // y desplazamos in-situ (la navegacion de Next via pushState no dispara "hashchange").
  const handleAnchorClick = (anchorId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    setMenuAbierto(false);
    const destino = document.getElementById(anchorId);
    if (!destino) return; // deja que el navegador navegue de forma normal
    event.preventDefault();
    window.history.replaceState(null, "", buildAnchorHref(anchorId));
    window.dispatchEvent(new CustomEvent("seccion:abrir", { detail: { anchorId } }));
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuAbierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAbierto]);

  // En modo "visible_en_scroll" la barra queda oculta mientras se ve la portada
  // y aparece al bajar hacia las siguientes secciones (salvo con el menú abierto).
  const barraOculta = comportamiento === "visible_en_scroll" && !scrolled && !menuAbierto;

  const textoBanner = banner?.texto?.trim() || `${config.novia.nombre} & ${config.novio.nombre}`;
  const elementos = normalizarElementos(banner?.elementos);

  const renderElemento = (id: ElementoBarraId) =>
    id === "menu" ? (
        <button
          onClick={toggleMenu}
          className="p-2"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
        >
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`block w-6 h-0.5 rounded-full transition-all duration-300 ${
                  "bg-brown-dark"
                } ${
                  menuAbierto && i === 0
                    ? "rotate-45 translate-y-2"
                    : menuAbierto && i === 1
                    ? "opacity-0"
                    : menuAbierto && i === 2
                    ? "-rotate-45 -translate-y-2"
                    : ""
                }`}
              />
            ))}
          </div>
        </button>
        ) : id === "logo" ? (
          <Link href={buildHomeHref()} aria-label="Inicio" className="flex items-center">
            {banner?.logoUrl ? (
              // El color se aplica con un filtro SVG que conserva solo la silueta (alfa) del logo.
              <>
                {banner.logoColor && (
                  <svg width="0" height="0" aria-hidden className="absolute">
                    <filter id="banner-logo-tint" colorInterpolationFilters="sRGB">
                      <feFlood floodColor={banner.logoColor} result="color" />
                      <feComposite in="color" in2="SourceAlpha" operator="in" />
                    </filter>
                  </svg>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveDriveMediaSrc(banner.logoUrl)}
                  alt=""
                  className="block object-contain"
                  style={{
                    width: banner.logoAnchoPx || "auto",
                    height: banner.logoAltoPx || (banner.logoAnchoPx ? "auto" : 40),
                    maxWidth: banner.logoAnchoPx ? undefined : "14rem",
                    filter: banner.logoColor ? "url(#banner-logo-tint)" : undefined,
                  }}
                />
              </>
            ) : (
              <SelloNupcial
                size={banner?.logoAltoPx || banner?.logoAnchoPx || 40}
                color={banner?.logoColor || "#8C6A3F"}
              />
            )}
          </Link>
        ) : (
          <Link
            href={buildHomeHref()}
            className={`font-display tracking-widest transition-colors ${
              banner?.textoTamanoPx ? "" : "text-xs sm:text-sm"
            } ${banner?.textoColor ? "" : "text-brown-dark"}`}
            style={{
              fontSize: banner?.textoTamanoPx || undefined,
              color: banner?.textoColor || undefined,
            }}
          >
            {textoBanner}
          </Link>
        );

  return (
    <header
      style={{ backgroundColor: banner?.fondoColor || "var(--role-fondo-principal)" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "shadow-sm" : ""
      } ${
        barraOculta ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      }`}
    >
      <nav className="container-wedding grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-20">
        {ZONAS.map(({ posicion, clases }) => (
          <div key={posicion} className={`flex items-center gap-3 ${clases}`}>
            {elementos
              .filter((el) => el.visible && el.posicion === posicion)
              .map((el) => (
                <Fragment key={el.id}>{renderElemento(el.id)}</Fragment>
              ))}
          </div>
        ))}
      </nav>

      {/* Menú desplegable */}
      {menuAbierto && (
        <div className="border-t border-cream-dark bg-white animate-fade-in">
          <ul className="container-wedding flex flex-col gap-2 py-5">
            {secciones.map((item) => (
              <li key={item.anchorId}>
                <a
                  href={item.enPantallaPrincipal ? buildAnchorHref(item.anchorId) : buildSeccionHref(item.anchorId)}
                  onClick={item.enPantallaPrincipal ? handleAnchorClick(item.anchorId) : () => setMenuAbierto(false)}
                  className="block rounded-xl px-2 py-3 smallcaps text-sm tracking-widest text-brown-mid transition-colors hover:bg-stone-50 hover:text-bronze"
                >
                  {item.titulo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
