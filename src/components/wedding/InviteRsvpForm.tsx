"use client";

import { useState } from "react";

type PersonaProps = {
  id?: string;
  nombre: string;
  tipo_persona?: string;
  edad?: number | null;
  estado_asistencia?: string;
  transporte?: string[] | null;
  necesidades?: {
    alergias?: string | null;
    necesidades_alimentarias?: string | null;
    come_con_padres?: boolean | null;
    menu_adulto?: boolean | null;
    necesita_trona?: boolean | null;
    necesita_ayuda?: boolean | null;
  } | null;
};

type InvitacionProps = {
  inviteCode: string;
  invitacion: {
    nombre_visible: string;
    tipo_invitacion: string;
    adultos_estimados?: number | null;
    adolescentes_estimados?: number | null;
    ninos_estimados?: number | null;
    bebes_estimados?: number | null;
  };
  personas: PersonaProps[];
};

type PersonaForm = {
  id?: string;
  nombre: string;
  edad: string;
  tipo_persona: string;
  asistira: "si" | "no" | "pendiente";
  alergias: string;
  necesidades_alimentarias: string;
  transporte: string;
  come_con_padres: boolean;
  menu_adulto: boolean;
  necesita_trona: boolean;
  necesita_ayuda: boolean;
};

export function InviteRsvpForm({ inviteCode, invitacion, personas }: InvitacionProps) {
  const [comentarios, setComentarios] = useState("");
  const [asistencia, setAsistencia] = useState<"si" | "no" | "puede">("si");
  const [personasState, setPersonasState] = useState<PersonaForm[]>(() =>
    personas.map((persona) => ({
      id: persona.id,
      nombre: persona.nombre,
      edad: persona.edad?.toString() || "",
      tipo_persona: persona.tipo_persona || "adulto",
      asistira: "si",
      alergias: persona.necesidades?.alergias || "",
      necesidades_alimentarias: persona.necesidades?.necesidades_alimentarias || "",
      transporte: Array.isArray(persona.transporte) ? persona.transporte.join(", ") : "",
      come_con_padres: Boolean(persona.necesidades?.come_con_padres),
      menu_adulto: Boolean(persona.necesidades?.menu_adulto),
      necesita_trona: Boolean(persona.necesidades?.necesita_trona),
      necesita_ayuda: Boolean(persona.necesidades?.necesita_ayuda),
    }))
  );
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updatePersona = (index: number, field: keyof PersonaForm, value: string | boolean) => {
    setPersonasState((prev) =>
      prev.map((persona, personaIndex) =>
        personaIndex === index ? { ...persona, [field]: value } : persona
      )
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/rsvp/${inviteCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asistencia_estimada: asistencia,
          comentarios,
          personas: personasState.map((persona) => ({
            id: persona.id,
            nombre: persona.nombre,
            edad:
              persona.tipo_persona === "nino" || persona.tipo_persona === "bebe"
                ? persona.edad
                  ? Number(persona.edad)
                  : null
                : null,
            tipo_persona: persona.tipo_persona || "adulto",
            asistira: persona.asistira,
            alergias: persona.alergias,
            necesidades_alimentarias: persona.necesidades_alimentarias,
            transporte: persona.transporte
              ? persona.transporte
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [],
            come_con_padres: persona.come_con_padres,
            menu_adulto: persona.menu_adulto,
            necesita_trona: persona.necesita_trona,
            necesita_ayuda: persona.necesita_ayuda,
          })),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "No se pudo guardar la respuesta");
      }

      setMessage("Gracias. Hemos guardado la respuesta de esta invitación.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-800">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Confirmación de asistencia</p>
          <h1 className="text-3xl font-semibold text-stone-900">Hola, {invitacion.nombre_visible}</h1>
          <p className="text-base text-stone-600">
            Esta respuesta está ligada a tu invitación única y nos ayudará a preparar mejor el día.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
          <p className="font-medium text-stone-700">Resumen de la invitación</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1">{invitacion.tipo_invitacion}</span>
            <span className="rounded-full bg-white px-3 py-1">Adultos: {invitacion.adultos_estimados ?? 0}</span>
            <span className="rounded-full bg-white px-3 py-1">Niños: {invitacion.ninos_estimados ?? 0}</span>
            <span className="rounded-full bg-white px-3 py-1">Bebés: {invitacion.bebes_estimados ?? 0}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-stone-200 p-5">
            <label className="text-sm font-medium text-stone-700" htmlFor="asistencia">
              ¿Vais a asistir?
            </label>
            <select
              id="asistencia"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"
              value={asistencia}
              onChange={(event) => setAsistencia(event.target.value as "si" | "no" | "puede")}
            >
              <option value="si">Sí, asistiremos</option>
              <option value="no">No podremos asistir</option>
              <option value="puede">Todavía lo estamos pensando</option>
            </select>
          </div>

          <div className="space-y-4">
            {personasState.map((persona, index) => (
              <div key={`${persona.nombre}-${index}`} className="rounded-2xl border border-stone-200 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-stone-800">{persona.nombre}</p>
                    <p className="text-sm text-stone-500">{persona.id}</p>
                  </div>
                  <select
                    className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm"
                    value={persona.asistira}
                    onChange={(event) =>
                      updatePersona(index, "asistira", event.target.value as PersonaForm["asistira"])
                    }
                  >
                    <option value="si">Asistirá</option>
                    <option value="no">No asistirá</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-stone-700">Alergias o intolerancias</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"
                      value={persona.alergias}
                      onChange={(event) => updatePersona(index, "alergias", event.target.value)}
                      placeholder="Indica si aplica"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-700">Necesidades alimentarias</label>
                    <textarea
                      className="mt-2 min-h-[90px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"
                      value={persona.necesidades_alimentarias}
                      onChange={(event) =>
                        updatePersona(index, "necesidades_alimentarias", event.target.value)
                      }
                      placeholder="Embarazo, dieta infantil, sin gluten, etc."
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-stone-700">Transporte</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"
                      value={persona.transporte}
                      onChange={(event) => updatePersona(index, "transporte", event.target.value)}
                      placeholder="Ruta, hora o detalle"
                    />
                  </div>
                  {(persona.tipo_persona === "nino" || persona.tipo_persona === "bebe") && (
                    <div>
                      <label className="text-sm font-medium text-stone-700">Edad (si aplica)</label>
                      <input
                        type="number"
                        min="0"
                        className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"
                        value={persona.edad}
                        onChange={(event) => updatePersona(index, "edad", event.target.value)}
                        placeholder="Edad"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-4">
                  {(persona.tipo_persona === "nino" || persona.tipo_persona === "bebe") && (
                    <>
                      <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={persona.come_con_padres}
                          onChange={(event) => updatePersona(index, "come_con_padres", event.target.checked)}
                        />
                        Come con los padres
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={persona.menu_adulto}
                          onChange={(event) => updatePersona(index, "menu_adulto", event.target.checked)}
                        />
                        Menú adulto
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={persona.necesita_trona}
                          onChange={(event) => updatePersona(index, "necesita_trona", event.target.checked)}
                        />
                        Necesita trona
                      </label>
                    </>
                  )}
                  {(persona.tipo_persona === "adulto" || persona.tipo_persona === "adolescente") && (
                    <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={persona.necesita_ayuda}
                        onChange={(event) => updatePersona(index, "necesita_ayuda", event.target.checked)}
                      />
                      Necesita ayuda adicional
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700" htmlFor="comentarios">
              Comentarios adicionales
            </label>
            <textarea
              id="comentarios"
              className="mt-2 min-h-[110px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"
              value={comentarios}
              onChange={(event) => setComentarios(event.target.value)}
              placeholder="Cualquier detalle que quieras compartir"
            />
          </div>

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <button type="submit" className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
              {sending ? "Guardando..." : "Guardar respuesta"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
