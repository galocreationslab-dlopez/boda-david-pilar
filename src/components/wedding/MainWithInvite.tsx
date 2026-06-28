"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeroPortada } from "./HeroPortada";
import { InviteRsvpForm } from "./InviteRsvpForm";

type InvitacionAPI = {
  invitacion: any;
  personas: any[];
};

export default function MainWithInvite({ config }: { config: any }) {
  const search = useSearchParams();
  const inviteCode = search?.get("inviteCode") || search?.get("invitecode") || null;
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitacion, setInvitacion] = useState<any | null>(null);
  const [personas, setPersonas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validate() {
      if (!inviteCode) return setValid(false);
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/rsvp/${inviteCode}`);
        if (!res.ok) {
          setValid(false);
          setError("Código de invitación no válido");
          return;
        }
        const data: InvitacionAPI = await res.json();
        setInvitacion(data.invitacion);
        setPersonas(data.personas || []);
        setValid(true);
      } catch (e) {
        setValid(false);
        setError("Error validando invitación");
      } finally {
        setLoading(false);
      }
    }

    validate();
  }, [inviteCode]);

  return (
    <div>
      <HeroPortada config={config} />

      {inviteCode && (
        <div className="mx-auto mt-6 max-w-4xl px-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            {loading ? (
              <p className="text-sm text-stone-600">Comprobando invitación...</p>
            ) : valid && invitacion ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-600">Invitación detectada para</p>
                  <p className="text-lg font-semibold">{invitacion.nombre_visible}</p>
                </div>
                <div className="flex gap-3">
                  <button className="rounded-full bg-amber-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowForm((s) => !s)}>
                    {showForm ? "Ocultar formulario" : "Confirmar asistencia"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-600">{error || "Código de invitación no válido"}</p>
            )}
          </div>
        </div>
      )}

      {showForm && valid && invitacion && (
        <div className="mt-8">
          <InviteRsvpForm inviteCode={inviteCode!} invitacion={invitacion} personas={personas} />
        </div>
      )}
    </div>
  );
}
