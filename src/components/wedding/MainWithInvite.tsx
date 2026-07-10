"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeroPortada } from "./HeroPortada";
import type { WeddingConfig } from "@/config/wedding.config";

type InvitacionAPI = {
  invitacion: {
    tipo_invitacion?: string;
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
  editable?: boolean;
  onEditNombreConjunto?: (value: string) => void;
  onEditBienvenida?: (value: string) => void;
};

export default function MainWithInvite({ config, viewport = "desktop", editable = false, onEditNombreConjunto, onEditBienvenida }: Props) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const hasInviteCode = Boolean(inviteCode && inviteCode.trim().length > 0);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitacion, setInvitacion] = useState<InvitacionAPI["invitacion"]>(null);
  const limiteConfirmacion = parseSpanishDate(config?.textos?.confirmacionLimite);
  const estaEnPlazo = !limiteConfirmacion || new Date() <= limiteConfirmacion;

  // Leer el código de la URL en el cliente, sin useSearchParams → no necesita Suspense
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("inviteCode") || params.get("invitecode") || null;
    const raf = window.requestAnimationFrame(() => setInviteCode(code));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function validate() {
      if (!hasInviteCode) {
        setValid(false);
        setLoading(false);
        setInvitacion(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/rsvp/${inviteCode}`);
        if (!isActive) return;

        if (!res.ok) {
          setValid(false);
          setInvitacion(null);
          return;
        }
        const data: InvitacionAPI = await res.json();
        if (!isActive) return;

        setInvitacion(data.invitacion);
        setValid(true);
      } catch {
        if (!isActive) return;

        setValid(false);
        setInvitacion(null);
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }

    validate();

    return () => {
      isActive = false;
    };
  }, [inviteCode, hasInviteCode]);

  const esAdmin = invitacion?.tipo_invitacion === "admin";

  const handleConfirmarClick = () => {
    if (!inviteCode) return;
    if (esAdmin) {
      router.push(`/admin/${inviteCode}`);
    } else {
      router.push(`/rsvp/${inviteCode}`);
    }
  };

  const mostrarBoton =
    hasInviteCode && !loading && valid && Boolean(invitacion) && (esAdmin || estaEnPlazo);

  return (
    <div>
      <HeroPortada
        config={config}
        viewport={viewport}
        mostrarBotonConfirmar={mostrarBoton}
        labelBotonConfirmar={esAdmin ? "Panel de administración" : undefined}
        onConfirmarClick={handleConfirmarClick}
        editable={editable}
        onEditNombreConjunto={onEditNombreConjunto}
        onEditBienvenida={onEditBienvenida}
      />
    </div>
  );
}
