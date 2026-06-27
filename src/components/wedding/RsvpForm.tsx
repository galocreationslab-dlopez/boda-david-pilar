"use client";

import { useState } from "react";
import type { WeddingConfig } from "@/config/wedding.config";

type Props = {
  config: Pick<
    WeddingConfig,
    "novia" | "novio" | "textos" | "transporte" | "fechaFormateada"
  >;
};

type NinoForm = {
  nombre: string;
  edad: string;
  alergias: string;
  comeConPadres: boolean;
};

type FormState = {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  confirma: "si" | "no" | "";
  tieneAcompanante: "si" | "no" | "";
  alergias: string;
  comentarios: string;
  acompananteNombre: string;
  acompananteApellidos: string;
  acompananteAlergias: string;
  ninos: NinoForm[];
  transporteId: string;
};

const initialState: FormState = {
  nombre: "",
  apellidos: "",
  email: "",
  telefono: "",
  confirma: "",
  tieneAcompanante: "",
  alergias: "",
  comentarios: "",
  acompananteNombre: "",
  acompananteApellidos: "",
  acompananteAlergias: "",
  ninos: [],
  transporteId: "",
};

export function RsvpForm({ config }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateChild = (index: number, field: keyof NinoForm, value: string | boolean) => {
    setForm((prev) => {
      const nextNinos = [...prev.ninos];
      nextNinos[index] = { ...nextNinos[index], [field]: value } as NinoForm;
      return { ...prev, ninos: nextNinos };
    });
  };

  const addChild = () => {
    setForm((prev) => ({
      ...prev,
      ninos: [...prev.ninos, { nombre: "", edad: "", alergias: "", comeConPadres: false }],
    }));
  };

  const removeChild = (index: number) => {
    setForm((prev) => ({
      ...prev,
      ninos: prev.ninos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        weddingSlug: "pilar-y-david",
        nombre: form.nombre,
        apellidos: form.apellidos,
        email: form.email,
        telefono: form.telefono,
        confirma: form.confirma === "si",
        tieneAcompanante: form.tieneAcompanante === "si",
        alergias: form.alergias,
        comentarios: form.comentarios,
        acompanante:
          form.tieneAcompanante === "si"
            ? {
                nombre: form.acompananteNombre,
                apellidos: form.acompananteApellidos,
                alergias: form.acompananteAlergias,
              }
            : null,
        ninos: form.ninos
          .filter((nino) => nino.nombre.trim())
          .map((nino) => ({
            nombre: nino.nombre,
            edad: Number(nino.edad || 0),
            alergias: nino.alergias,
            comeConPadres: nino.comeConPadres,
          })),
        transporteId: form.transporteId || null,
      };

      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "No se pudo guardar tu respuesta");
      }

      setMessage(
        "Gracias por confirmar. Hemos guardado tu respuesta y la tendremos en cuenta."
      );
      setForm(initialState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="section-wedding" style={{ backgroundColor: "var(--cream)" }}>
      <div className="container-wedding max-w-4xl">
        <div className="text-center mb-10">
          <p className="section-subtitle">confirmación</p>
          <h2 className="section-title">Confirma tu asistencia</h2>
          <p className="mx-auto max-w-2xl text-base" style={{ color: "var(--brown-mid)" }}>
            Gracias por acompañarnos. Completa este formulario y nos ayudará a preparar
            el día con todo en orden.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card-wedding space-y-8"
          style={{ backgroundColor: "var(--white)" }}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="label-wedding" htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                className="input-wedding"
                required
                value={form.nombre}
                onChange={(event) => updateField("nombre", event.target.value)}
              />
            </div>
            <div>
              <label className="label-wedding" htmlFor="apellidos">Apellidos</label>
              <input
                id="apellidos"
                className="input-wedding"
                required
                value={form.apellidos}
                onChange={(event) => updateField("apellidos", event.target.value)}
              />
            </div>
            <div>
              <label className="label-wedding" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input-wedding"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
            <div>
              <label className="label-wedding" htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                className="input-wedding"
                value={form.telefono}
                onChange={(event) => updateField("telefono", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="label-wedding" htmlFor="confirma">¿Vas a asistir?</label>
              <select
                id="confirma"
                className="input-wedding"
                required
                value={form.confirma}
                onChange={(event) => updateField("confirma", event.target.value)}
              >
                <option value="">Selecciona una opción</option>
                <option value="si">Sí, asistiré</option>
                <option value="no">No podré asistir</option>
              </select>
            </div>
            <div>
              <label className="label-wedding" htmlFor="transporte">Transporte</label>
              <select
                id="transporte"
                className="input-wedding"
                value={form.transporteId}
                onChange={(event) => updateField("transporteId", event.target.value)}
              >
                <option value="">Sin preferencia</option>
                {config.transporte.map((trayecto) => (
                  <option key={trayecto.id} value={trayecto.id}>
                    {trayecto.origen} → {trayecto.destino} · {trayecto.hora}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="label-wedding" htmlFor="acompanante">¿Vas con acompañante?</label>
              <select
                id="acompanante"
                className="input-wedding"
                value={form.tieneAcompanante}
                onChange={(event) => updateField("tieneAcompanante", event.target.value)}
              >
                <option value="">Selecciona una opción</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="label-wedding" htmlFor="alergias">Alergias o intolerancias</label>
              <input
                id="alergias"
                className="input-wedding"
                value={form.alergias}
                onChange={(event) => updateField("alergias", event.target.value)}
                placeholder="Si aplica, indícanos cuáles"
              />
            </div>
          </div>

          {form.tieneAcompanante === "si" && (
            <div className="rounded-2xl border border-cream-dark p-6 space-y-4">
              <h3 className="font-display text-2xl">Acompañante</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="label-wedding" htmlFor="acompananteNombre">Nombre</label>
                  <input
                    id="acompananteNombre"
                    className="input-wedding"
                    value={form.acompananteNombre}
                    onChange={(event) => updateField("acompananteNombre", event.target.value)}
                  />
                </div>
                <div>
                  <label className="label-wedding" htmlFor="acompananteApellidos">Apellidos</label>
                  <input
                    id="acompananteApellidos"
                    className="input-wedding"
                    value={form.acompananteApellidos}
                    onChange={(event) => updateField("acompananteApellidos", event.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label-wedding" htmlFor="acompananteAlergias">Alergias o intolerancias</label>
                <input
                  id="acompananteAlergias"
                  className="input-wedding"
                  value={form.acompananteAlergias}
                  onChange={(event) => updateField("acompananteAlergias", event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-cream-dark p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl">Niños</h3>
              <button
                type="button"
                className="btn-secondary !py-2 !px-4 !text-xs"
                onClick={addChild}
              >
                Añadir niño
              </button>
            </div>

            {form.ninos.length === 0 && (
              <p className="text-sm" style={{ color: "var(--olive-muted)" }}>
                Si vienes con niños, puedes añadirlos aquí para registrar alergias y otras necesidades.
              </p>
            )}

            {form.ninos.map((nino, index) => (
              <div key={index} className="rounded-xl border border-cream-dark p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl">Niño {index + 1}</p>
                  <button
                    type="button"
                    className="text-sm underline"
                    style={{ color: "var(--bronze)" }}
                    onClick={() => removeChild(index)}
                  >
                    Eliminar
                  </button>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="label-wedding">Nombre</label>
                    <input
                      className="input-wedding"
                      value={nino.nombre}
                      onChange={(event) => updateChild(index, "nombre", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label-wedding">Edad</label>
                    <input
                      type="number"
                      min="0"
                      max="17"
                      className="input-wedding"
                      value={nino.edad}
                      onChange={(event) => updateChild(index, "edad", event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="label-wedding">Alergias o intolerancias</label>
                    <input
                      className="input-wedding"
                      value={nino.alergias}
                      onChange={(event) => updateChild(index, "alergias", event.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-cream-dark px-4 py-3 text-sm" style={{ color: "var(--brown-mid)" }}>
                    <input
                      type="checkbox"
                      checked={nino.comeConPadres}
                      onChange={(event) => updateChild(index, "comeConPadres", event.target.checked)}
                    />
                    Come con los padres
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="label-wedding" htmlFor="comentarios">Comentarios o necesidades especiales</label>
            <textarea
              id="comentarios"
              className="input-wedding min-h-[120px]"
              value={form.comentarios}
              onChange={(event) => updateField("comentarios", event.target.value)}
              placeholder="Cuéntanos cualquier detalle que consideres importante"
            />
          </div>

          {message && (
            <div className="rounded-xl border border-olive-pale bg-olive-pale/40 p-4 text-sm" style={{ color: "var(--brown-dark)" }}>
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? "Enviando..." : "Guardar respuesta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
