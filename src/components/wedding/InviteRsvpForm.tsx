"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InviteExtras } from "./InviteExtras";

type PersonaProps = {
  id?: string;
  nombre: string;
  tipo_persona?: string;
  edad?: number | null;
  estado_asistencia?: string;
  transporte?: string[] | null;
  necesidades?: Record<string, unknown>;
  comentarios?: string | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

type InvitacionProps = {
  inviteCode: string;
  invitacion: {
    nombre_visible: string;
    tipo_invitacion: string;
    nombre1?: string;
    nombre2?: string;
    estado?: string;
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
  apellidos: string;
  edad: string;
  tipo_persona: string;
  asistira: "si" | "no" | "pendiente";
  alergias: string;
  necesidades_alimentarias: string;
  alojamiento: string;
  transporte_g_to_b: boolean;
  transporte_b_to_t: boolean;
  transporte_t_to_g: boolean;
  come_con_padres: boolean;
  menu_adulto: boolean;
  necesita_trona: boolean;
  necesita_ayuda: boolean;
};

export function InviteRsvpForm({ inviteCode, invitacion, personas }: InvitacionProps) {
  const defaultAsistencia: "si" | "no" | "puede" =
    invitacion.estado === "confirmada"
      ? "si"
      : invitacion.estado === "rechazada"
        ? "no"
        : "puede";
  const [comentarios, setComentarios] = useState(personas?.[0]?.comentarios || "");
  const asistencia: "si" | "no" | "puede" = defaultAsistencia;

  const getTipoPersona = (tipo?: string): PersonaForm["tipo_persona"] => {
    if (tipo === "adulto" || tipo === "nino" || tipo === "bebe") return tipo;
    return "adulto";
  };

  const initial = (): PersonaForm[] => {
    // If invitation has explicit nombre1/nombre2 and no asistentes provided, prefill for pareja/soltero
    if ((invitacion.tipo_invitacion === "pareja" || invitacion.tipo_invitacion === "soltero") && (!personas || personas.length === 0)) {
      const list: PersonaForm[] = [];
      if (invitacion.nombre1) {
        list.push({
          id: undefined,
          nombre: invitacion.nombre1,
          apellidos: "",
          edad: "",
          tipo_persona: "adulto",
          asistira: "si",
          alergias: "",
          necesidades_alimentarias: "",
          alojamiento: "",
          transporte_g_to_b: false,
          transporte_b_to_t: false,
          transporte_t_to_g: false,
          come_con_padres: false,
          menu_adulto: false,
          necesita_trona: false,
          necesita_ayuda: false,
        });
      }
      if (invitacion.tipo_invitacion === "pareja" && invitacion.nombre2) {
        list.push({
          id: undefined,
          nombre: invitacion.nombre2 || "",
          apellidos: "",
          edad: "",
          tipo_persona: "adulto",
          asistira: "si",
          alergias: "",
          necesidades_alimentarias: "",
          alojamiento: "",
          transporte_g_to_b: false,
          transporte_b_to_t: false,
          transporte_t_to_g: false,
          come_con_padres: false,
          menu_adulto: false,
          necesita_trona: false,
          necesita_ayuda: false,
        });
      }
      // fallback: if no nombre1, derive from nombre_visible
      if (!list.length) {
        list.push({
          id: undefined,
          nombre: invitacion.nombre_visible || "Invitado",
          apellidos: "",
          edad: "",
          tipo_persona: "adulto",
          asistira: "si",
          alergias: "",
          necesidades_alimentarias: "",
          alojamiento: "",
          transporte_g_to_b: false,
          transporte_b_to_t: false,
          transporte_t_to_g: false,
          come_con_padres: false,
          menu_adulto: false,
          necesita_trona: false,
          necesita_ayuda: false,
        });
      }
      return list;
    }

    return personas.map((p) => {
      const necesidades = p.necesidades ?? {};
      const [nombreBase, ...resto] = (p.nombre || "").trim().split(/\s+/);
      return {
      id: p.id,
      nombre: nombreBase || p.nombre,
      apellidos: resto.join(" "),
      edad: p.edad?.toString() || "",
      tipo_persona: getTipoPersona(p.tipo_persona),
      asistira:
        p.estado_asistencia === "si"
          ? "si"
          : p.estado_asistencia === "no"
            ? "no"
            : "pendiente",
      alergias: asString(necesidades.alergias),
      necesidades_alimentarias: asString(necesidades.necesidades_alimentarias),
      alojamiento: asString(necesidades.alojamiento),
      transporte_g_to_b: Array.isArray(p.transporte) ? p.transporte.includes("granada-beas") : false,
      transporte_b_to_t: Array.isArray(p.transporte) ? p.transporte.includes("beas-torre") : false,
      transporte_t_to_g: Array.isArray(p.transporte) ? p.transporte.includes("torre-granada") : false,
      come_con_padres: asBoolean(necesidades.come_con_padres),
      menu_adulto: asBoolean(necesidades.menu_adulto),
      necesita_trona: asBoolean(necesidades.necesita_trona),
      necesita_ayuda: asBoolean(necesidades.necesita_ayuda),
      };
    });
  };

  const [personasState, setPersonasState] = useState<PersonaForm[]>(initial);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // if first person's alojamiento/transport changes, copy to others (keep manual edits possible)
    // handled explicitly in change handlers below
  }, []);

  const updatePersona = <K extends keyof PersonaForm>(
    index: number,
    field: K,
    value: PersonaForm[K],
  ) => {
    setPersonasState((prev) =>
      prev.map((persona, personaIndex) => (personaIndex === index ? { ...persona, [field]: value } : persona))
    );
  };

  const copyAccommodationAndTransport = (fromIndex: number) => {
    setPersonasState((prev) => {
      const source = prev[fromIndex];
      return prev.map((p, i) =>
        i === fromIndex
          ? p
          : {
              ...p,
              alojamiento: source.alojamiento,
              transporte_g_to_b: source.transporte_g_to_b,
              transporte_b_to_t: source.transporte_b_to_t,
              transporte_t_to_g: source.transporte_t_to_g,
            }
      );
    });
  };

  const addAcompanante = (base?: Partial<PersonaForm>) => {
    setPersonasState((prev) => [
      ...prev,
      {
        id: undefined,
        nombre: base?.nombre || "Acompañante",
        apellidos: base?.apellidos || "",
        edad: "",
        tipo_persona: base?.tipo_persona || "adulto",
        asistira: "si",
        alergias: "",
        necesidades_alimentarias: "",
        alojamiento: base?.alojamiento || "",
        transporte_g_to_b: base?.transporte_g_to_b || false,
        transporte_b_to_t: base?.transporte_b_to_t || false,
        transporte_t_to_g: base?.transporte_t_to_g || false,
        come_con_padres: false,
        menu_adulto: false,
        necesita_trona: false,
        necesita_ayuda: false,
      },
    ]);
  };

  const addNino = () => {
    setPersonasState((prev) => [
      ...prev,
      {
        id: undefined,
        nombre: "Niño",
        apellidos: "",
        edad: "",
        tipo_persona: "nino",
        asistira: "si",
        alergias: "",
        necesidades_alimentarias: "",
        alojamiento: "",
        transporte_g_to_b: false,
        transporte_b_to_t: false,
        transporte_t_to_g: false,
        come_con_padres: true,
        menu_adulto: false,
        necesita_trona: false,
        necesita_ayuda: false,
      },
    ]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    setError(null);

    try {
      const payloadPersonas = personasState.map((persona) => ({
        id: persona.id,
        nombre: `${persona.nombre}${persona.apellidos ? ` ${persona.apellidos}` : ""}`.trim(),
        edad: persona.tipo_persona === "nino" || persona.tipo_persona === "bebe" ? (persona.edad ? Number(persona.edad) : null) : null,
        tipo_persona: persona.tipo_persona || "adulto",
        asistira: persona.asistira,
        alergias: persona.alergias,
        necesidades_alimentarias: persona.necesidades_alimentarias,
        alojamiento: persona.alojamiento || null,
        transporte: [
          persona.transporte_g_to_b ? "granada-beas" : null,
          persona.transporte_b_to_t ? "beas-torre" : null,
          persona.transporte_t_to_g ? "torre-granada" : null,
        ].filter(Boolean),
        come_con_padres: persona.come_con_padres || false,
        menu_adulto: persona.menu_adulto || false,
        necesita_trona: persona.necesita_trona || false,
        necesita_ayuda: persona.necesita_ayuda || false,
      }));

      const response = await fetch(`/api/rsvp/${inviteCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asistencia_estimada: asistencia, comentarios, personas: payloadPersonas }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la respuesta");

      setMessage("Gracias. Hemos guardado la respuesta de esta invitación.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-800 sm:px-6 sm:py-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:gap-8 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Confirmación de asistencia</p>
            <h1 className="text-3xl font-semibold text-stone-900">Hola, {invitacion.nombre_visible}</h1>
            <p className="text-base text-stone-600">Esta respuesta está ligada a tu invitación única y nos ayudará a preparar mejor el día.</p>
          </div>

          <Link
            href={`/?inviteCode=${encodeURIComponent(inviteCode)}`}
            className="text-sm text-stone-500 transition-colors hover:text-stone-800"
          >
            ← Volver a la web
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {personasState.map((persona, index) => (
              <div key={`${persona.nombre}-${index}`} className="rounded-2xl border border-stone-200 p-5">
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-stone-700">Nombre</label>
                      <input className="mt-2 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" value={persona.nombre} onChange={(e) => updatePersona(index, "nombre", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-stone-700">Apellidos</label>
                      <input className="mt-2 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" value={persona.apellidos} onChange={(e) => updatePersona(index, "apellidos", e.target.value)} />
                    </div>
                  </div>
                  <select className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm md:w-auto" value={persona.asistira} onChange={(e) => updatePersona(index, "asistira", e.target.value as PersonaForm["asistira"])}>
                    <option value="si">Asistirá</option>
                    <option value="no">No asistirá</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-stone-700">Alojamiento</label>
                    <input className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm" value={persona.alojamiento} onChange={(e) => { updatePersona(index, "alojamiento", e.target.value); if (index === 0) copyAccommodationAndTransport(0); }} placeholder="Dónde os alojaréis" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-700">Alergias / preferencias</label>
                    <textarea className="mt-2 min-h-[90px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm" value={persona.alergias} onChange={(e) => updatePersona(index, "alergias", e.target.value)} placeholder="Alérgenos, vegetarianismo, embarazo, etc." />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-stone-700">Transporte</p>
                  <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={persona.transporte_g_to_b} onChange={(e) => { updatePersona(index, "transporte_g_to_b", e.target.checked); if (index === 0) copyAccommodationAndTransport(0); }} /> Granada → Beas de Granada
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={persona.transporte_b_to_t} onChange={(e) => { updatePersona(index, "transporte_b_to_t", e.target.checked); if (index === 0) copyAccommodationAndTransport(0); }} /> Beas de Granada → Torre del Rey
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                      <input type="checkbox" checked={persona.transporte_t_to_g} onChange={(e) => { updatePersona(index, "transporte_t_to_g", e.target.checked); if (index === 0) copyAccommodationAndTransport(0); }} /> Torre del Rey → Granada
                    </label>
                  </div>
                </div>

                {(persona.tipo_persona === "nino" || persona.tipo_persona === "bebe") && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-stone-700">Edad</label>
                      <input type="number" min="0" className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm" value={persona.edad} onChange={(e) => updatePersona(index, "edad", e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                        <input type="checkbox" checked={persona.come_con_padres} onChange={(e) => updatePersona(index, "come_con_padres", e.target.checked)} /> Come con los padres
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                        <input type="checkbox" checked={persona.menu_adulto} onChange={(e) => updatePersona(index, "menu_adulto", e.target.checked)} /> Menú adulto (mayores de 12)
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                        <input type="checkbox" checked={persona.necesita_trona} onChange={(e) => updatePersona(index, "necesita_trona", e.target.checked)} /> Necesita trona (menores de 6)
                      </label>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { if (invitacion.tipo_invitacion === "soltero") { addAcompanante({ alojamiento: personasState[0]?.alojamiento, transporte_g_to_b: personasState[0]?.transporte_g_to_b, transporte_b_to_t: personasState[0]?.transporte_b_to_t, transporte_t_to_g: personasState[0]?.transporte_t_to_g }); } else { addNino(); } }} className="rounded-full bg-slate-100 px-4 py-2 text-sm">{invitacion.tipo_invitacion === "soltero" ? "Añadir acompañante" : "Añadir hijo"}</button>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700" htmlFor="comentarios">Comentarios adicionales</label>
            <textarea id="comentarios" className="mt-2 min-h-[110px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm" value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Cualquier detalle que quieras compartir" />
          </div>

          {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <div className="flex justify-center">
            <button type="submit" className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">{sending ? "Guardando..." : "Guardar respuesta"}</button>
          </div>
        </form>

        <InviteExtras inviteCode={inviteCode} invitacionNombre={invitacion.nombre_visible} />
      </div>
    </main>
  );
}
