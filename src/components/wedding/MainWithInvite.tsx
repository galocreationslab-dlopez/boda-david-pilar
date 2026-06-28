"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeroPortada } from "./HeroPortada";
import { InviteRsvpForm } from "./InviteRsvpForm";

type InvitacionAPI = {
  invitacion: any;
  personas: any[];
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

export default function MainWithInvite({ config }: { config: any }) {
  const search = useSearchParams();
  const inviteCode = search?.get("inviteCode") || search?.get("invitecode") || null;
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitacion, setInvitacion] = useState<any | null>(null);
  const [personas, setPersonas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const limiteConfirmacion = parseSpanishDate(config?.textos?.confirmacionLimite);
  const estaEnPlazo = !limiteConfirmacion || new Date() <= limiteConfirmacion;

  useEffect(() => {
    async function validate() {
      if (!inviteCode) {
        setValid(false);
        setInvitacion(null);
        setPersonas([]);
        setShowForm(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/rsvp/${inviteCode}`);
        if (!res.ok) {
          setValid(false);
          setInvitacion(null);
          setPersonas([]);
          setShowForm(false);
          return;
        }
        const data: InvitacionAPI = await res.json();
        setInvitacion(data.invitacion);
        setPersonas(data.personas || []);
        setValid(true);
      } catch {
        setValid(false);
        setInvitacion(null);
        setPersonas([]);
        setShowForm(false);
      } finally {
        setLoading(false);
      }
    }

    validate();
  }, [inviteCode]);

  return (
    <div>
      <HeroPortada
        config={config}
        mostrarBotonConfirmar={!loading && valid && Boolean(invitacion) && estaEnPlazo}
        onConfirmarClick={() => setShowForm(true)}
      />

      {showForm && valid && invitacion && (
        <div className="mt-8">
          <InviteRsvpForm inviteCode={inviteCode!} invitacion={invitacion} personas={personas} />
        </div>
      )}
    </div>
  );
}
