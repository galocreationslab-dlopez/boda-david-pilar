/**
 * components/layout/NavegacionPublica.tsx
 * ─────────────────────────────────────────────────────────────
 * Barra de navegación para las páginas públicas.
 * Mobile-first con menú hamburguesa.
 * Recibe datos como props — no hardcodea nada de la boda.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SelloNupcial } from "@/components/ui/SelloNupcial";
import type { ComportamientoBarraNavegacion, WeddingConfig } from "@/config/wedding.config";

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
  secciones?: SeccionMenuItem[];
  // Query string actual (sin el "?"), ej. "inviteCode=GALO-2603" — se preserva en todos los enlaces internos.
  queryString?: string;
};

export function NavegacionPublica({ config, comportamiento = "siempre_visible", secciones = [], queryString = "" }: NavegacionPublicaProps) {
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-sm shadow-sm"
          : "bg-transparent"
      } ${
        barraOculta ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      }`}
    >
      <nav className="container-wedding flex h-16 items-center justify-between sm:h-20">
        {/* Botón hamburguesa — esquina superior izquierda, en todos los tamaños */}
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
                  scrolled ? "bg-brown-dark" : "bg-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
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

        {/* Logo / Sello */}
        <Link
          href={buildHomeHref()}
          className="flex items-center gap-2 group"
          aria-label="Inicio"
        >
          <SelloNupcial
            size={40}
            color={scrolled ? "#8C6A3F" : "#FDFAF5"}
          />
          <span
            className={`font-display text-xs tracking-widest sm:text-sm transition-colors ${
              scrolled ? "text-brown-dark" : "text-white"
            }`}
          >
            <span className="sm:hidden">
              {config.novia.nombre} &amp; {config.novio.nombre}
            </span>
            <span className="hidden sm:inline">
              {config.novia.nombre} &amp; {config.novio.nombre}
            </span>
          </span>
        </Link>
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
