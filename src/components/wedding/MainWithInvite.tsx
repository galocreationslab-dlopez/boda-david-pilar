"use client";

import { useEffect, useState } from "react";
import { HeroPortada, type HeroComponentKey } from "./HeroPortada";
import type { WeddingConfig } from "@/config/wedding.config";
import type { CSSProperties } from "react";

type InvitacionAPI = {
  invitacion: {
    tipo_invitacion?: string;
    texto_invitacion_personalizado?: string | null;
  } | null;
  personas: unknown[];
};

const MONTHS_ES: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function parseSpanishDate(input?: string): Date | null {
  if (!input) return null;
  const match = input
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/);

  if (!match) return null;

  const day = Number(match[1]);
  const monthName = match[2]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const year = Number(match[3]);
  const month = MONTHS_ES[monthName];

  if (Number.isNaN(day) || Number.isNaN(year) || month === undefined) return null;

  return new Date(year, month, day, 23, 59, 59, 999);
}

type Props = {
  config: WeddingConfig;
  viewport?: "desktop" | "movil";
  selloUrl?: string;
  editable?: boolean;
  designMode?: boolean;
  selectedComponentKey?: HeroComponentKey | null;
  onSelectComponent?: (key: HeroComponentKey) => void;
  componentStyles?: Partial<Record<HeroComponentKey, CSSProperties>>;
  headerDivider?: React.ReactNode;
  onEditNombreConjunto?: (value: string) => void;
  onEditBienvenida?: (value: string) => void;
};

export default function MainWithInvite({
  config,
  viewport = "desktop",
  selloUrl,
  editable = false,
  designMode = false,
  selectedComponentKey,
  onSelectComponent,
  componentStyles,
  headerDivider,
  onEditNombreConjunto,
  onEditBienvenida,
}: Props) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const hasInviteCode = Boolean(inviteCode && inviteCode.trim().length > 0);
  const [invitacion, setInvitacion] = useState<InvitacionAPI["invitacion"]>(null);
  const limiteConfirmacion = parseSpanishDate(config?.textos?.confirmacionLimite);
  const estaEnPlazo = !limiteConfirmacion || new Date() <= limiteConfirmacion;

  // Leer el código de la URL en el cliente, sin useSearchParams → no necesita Suspense
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("inviteCode")?.trim() || params.get("invitecode")?.trim() || null;
    const raf = window.requestAnimationFrame(() => setInviteCode(code));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadInvitation() {
      if (!inviteCode || !hasInviteCode) {
        setInvitacion(null);
        return;
      }
      try {
        const res = await fetch(`/api/rsvp/${encodeURIComponent(inviteCode)}`, { cache: "no-store" });
        if (!isActive) return;

        if (!res.ok) {
          console.error("No se pudo cargar la invitación:", res.status);
          setInvitacion(null);
          return;
        }
        const data: InvitacionAPI = await res.json();
        if (!isActive) return;

        setInvitacion(data.invitacion);
      } catch (error) {
        if (!isActive) return;

        console.error("No se pudo cargar la invitación:", error);
        setInvitacion(null);
      }
    }

    loadInvitation();

    return () => {
      isActive = false;
    };
  }, [inviteCode, hasInviteCode]);

  const esAdmin = invitacion?.tipo_invitacion === "admin";

  const handleConfirmarClick = () => {
    if (!inviteCode) return;
    // Pedir un documento nuevo evita reutilizar un error del Router Cache.
    window.location.assign(`/${esAdmin ? "admin" : "rsvp"}/${encodeURIComponent(inviteCode)}`);
  };

  const mostrarBoton = hasInviteCode && (esAdmin || estaEnPlazo);

  const personalizedWelcome = invitacion?.texto_invitacion_personalizado?.trim();
  const heroConfig = personalizedWelcome
    ? {
        ...config,
        textos: {
          ...config.textos,
          bienvenida: personalizedWelcome,
        },
      }
    : config;

  return (
    <div>
      <HeroPortada
        config={heroConfig}
        selloUrl={selloUrl}
        viewport={viewport}
        mostrarBotonConfirmar={mostrarBoton}
        labelBotonConfirmar={esAdmin ? "Panel de administración" : undefined}
        isAdminButton={esAdmin}
        onConfirmarClick={handleConfirmarClick}
        editable={editable}
        designMode={designMode}
        selectedComponentKey={selectedComponentKey}
        onSelectComponent={onSelectComponent}
        componentStyles={componentStyles}
        headerDivider={headerDivider}
        onEditNombreConjunto={onEditNombreConjunto}
        onEditBienvenida={onEditBienvenida}
      />
    </div>
  );
}
