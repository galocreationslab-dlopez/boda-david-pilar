"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_RSVP_TEXTOS_CHAT,
  DEFAULT_RSVP_TEXTOS_FORMULARIO,
  type Localizacion,
  type RsvpTextosChat,
  type RsvpTextosFormulario,
  type WeddingConfig,
} from "@/config/wedding.config";

type DriveStatus = {
  configured: boolean;
  hasStoredToken: boolean;
  lastVerifiedAt: string | null;
  lastError: string | null;
};

type Props = {
  inviteCode: string;
  config: WeddingConfig;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

const RSVP_FORM_FIELDS: Array<{ key: keyof RsvpTextosFormulario; label: string; multiline?: boolean; hint?: string }> = [
  { key: "eyebrow", label: "Texto superior (eyebrow)" },
  { key: "saludoPrefijo", label: "Prefijo de saludo (antes del nombre)", hint: "Déjalo vacío para no mostrar ningún prefijo antes del nombre." },
  { key: "fraseInicial", label: "Frase inicial", multiline: true },
  { key: "volverLabel", label: "Enlace: volver a la web" },
  { key: "nombreLabel", label: "Etiqueta: nombre" },
  { key: "apellidosLabel", label: "Etiqueta: apellidos" },
  { key: "asistiraSiLabel", label: "Opción: asistirá" },
  { key: "asistiraNoLabel", label: "Opción: no asistirá" },
  { key: "asistiraPendienteLabel", label: "Opción: pendiente" },
  { key: "alojamientoLabel", label: "Etiqueta: alojamiento" },
  { key: "alojamientoPlaceholder", label: "Placeholder: alojamiento" },
  { key: "alergiasLabel", label: "Etiqueta: intolerancias / alergias" },
  { key: "alergiasPlaceholder", label: "Placeholder: intolerancias / alergias" },
  { key: "transporteLabel", label: "Etiqueta: transporte" },
  { key: "edadLabel", label: "Etiqueta: edad" },
  { key: "comeConPadresLabel", label: "Etiqueta: come con los padres" },
  { key: "menuAdultoLabel", label: "Etiqueta: menú adulto" },
  { key: "necesitaTronaLabel", label: "Etiqueta: necesita trona" },
  { key: "addAcompananteLabel", label: "Botón: añadir acompañante" },
  { key: "addNinoLabel", label: "Botón: añadir hijo" },
  { key: "comentariosLabel", label: "Etiqueta: comentarios" },
  { key: "comentariosPlaceholder", label: "Placeholder: comentarios" },
  { key: "submitLabel", label: "Botón: guardar respuesta" },
  { key: "submitLabelSending", label: "Botón: guardando (enviando)" },
  { key: "successMessage", label: "Mensaje de éxito", multiline: true },
  { key: "errorFallback", label: "Mensaje de error genérico" },
];

const RSVP_CHAT_FIELDS: Array<{ key: keyof RsvpTextosChat; label: string; multiline?: boolean }> = [
  { key: "eyebrow", label: "Texto superior (eyebrow)" },
  { key: "titulo", label: "Título" },
  { key: "subtitulo", label: "Subtítulo" },
  { key: "cargandoMensaje", label: "Mensaje mientras carga" },
  { key: "sinMensajes", label: "Mensaje sin mensajes" },
  { key: "respuestaNoviosLabel", label: "Etiqueta de respuesta de los novios" },
  { key: "campoLabel", label: "Etiqueta del campo de mensaje" },
  { key: "placeholder", label: "Placeholder del campo de mensaje" },
  { key: "botonEnviar", label: "Botón: enviar" },
  { key: "botonEnviando", label: "Botón: enviando" },
  { key: "feedbackExito", label: "Mensaje de éxito al enviar" },
  { key: "feedbackErrorFallback", label: "Mensaje de error al enviar" },
];

function toFechaHora(loc: Localizacion): string {
  const fecha = loc.fecha?.trim() ?? "";
  const hora = loc.hora?.trim() ?? "";
  if (!fecha && !hora) return "";
  if (!fecha) return hora;
  if (!hora) return fecha;
  return `${fecha} - ${hora}`;
}

function splitFechaHora(value: string): { fecha: string; hora: string } {
  const raw = value.trim();
  if (!raw) return { fecha: "", hora: "" };
  const sep = raw.split("-");
  if (sep.length === 1) return { fecha: raw, hora: "" };
  const fecha = sep.slice(0, sep.length - 1).join("-").trim();
  const hora = sep[sep.length - 1].trim();
  return { fecha, hora };
}

export default function DatosBodaView({ inviteCode, config }: Props) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch(`/api/admin/${inviteCode}/google-drive/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDriveStatus(data))
      .catch(() => setDriveStatus(null));
  }, [inviteCode]);

  useEffect(() => {
    const driveResult = searchParams.get("drive");
    if (driveResult === "connected") {
      showMsg("ok", "Google Drive reconectado correctamente.");
    } else if (driveResult === "error") {
      showMsg("error", `No se pudo conectar Google Drive: ${searchParams.get("reason") ?? "error desconocido"}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [noviaNombre, setNoviaNombre] = useState(config.novia.nombre ?? "");
  const [novioNombre, setNovioNombre] = useState(config.novio.nombre ?? "");
  const [inicialNovia, setInicialNovia] = useState(config.iniciales.novia ?? "");
  const [inicialNovio, setInicialNovio] = useState(config.iniciales.novio ?? "");
  const [nombreConjunto, setNombreConjunto] = useState(config.nombreConjunto ?? `${config.novia.nombre} & ${config.novio.nombre}`);
  const [inicialesConjuntas, setInicialesConjuntas] = useState(config.inicialesConjuntas ?? `${config.iniciales.novia}&${config.iniciales.novio}`);
  const [fechaFormateada, setFechaFormateada] = useState(config.fechaFormateada ?? "");
  const [drive, setDrive] = useState(config.drive);
  const [mostrarChat, setMostrarChat] = useState(config.rsvp?.mostrarChat !== false);
  const [rsvpTextos, setRsvpTextos] = useState<RsvpTextosFormulario>(config.rsvp?.textos ?? {});
  const [chatTextos, setChatTextos] = useState<RsvpTextosChat>(config.rsvp?.chatTextos ?? {});

  const [ubicaciones, setUbicaciones] = useState<Array<Localizacion & { fechaHoraTexto?: string }>>(
    (config.localizaciones ?? []).map((loc) => ({
      ...loc,
      fechaHoraTexto: toFechaHora(loc),
    })),
  );

  const showMsg = (type: "ok" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const updateUbicacion = (id: string, patch: Partial<Localizacion & { fechaHoraTexto?: string }>) => {
    setUbicaciones((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...patch } : loc)));
  };

  const updateRsvpTexto = (key: keyof RsvpTextosFormulario, value: string) => {
    setRsvpTextos((prev) => ({ ...prev, [key]: value }));
  };

  const updateChatTexto = (key: keyof RsvpTextosChat, value: string) => {
    setChatTextos((prev) => ({ ...prev, [key]: value }));
  };

  const addUbicacion = () => {
    const id = uid();
    setUbicaciones((prev) => [
      ...prev,
      {
        id,
        nombre: "",
        descripcion: "",
        direccion: "",
        coordenadas: { lat: 0, lng: 0 },
        hora: "",
        diaSemana: "",
        fecha: "",
        icono: "finca",
        enlaceMaps: "",
        fechaHoraTexto: "",
      },
    ]);
  };

  const removeUbicacion = (id: string) => {
    if (!confirm("¿Eliminar esta ubicación?")) return;
    setUbicaciones((prev) => prev.filter((loc) => loc.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      const localizaciones = ubicaciones.map((loc) => {
        const parsed = splitFechaHora(loc.fechaHoraTexto ?? "");
        const titulo = loc.nombre.trim() || "Ubicación";
        const lugar = loc.descripcion.trim() || "";
        return {
          ...loc,
          nombre: titulo,
          descripcion: lugar,
          fecha: parsed.fecha || loc.fecha || "",
          hora: parsed.hora || loc.hora || "",
        } as Localizacion;
      });

      const payload = {
        novia: { ...config.novia, nombre: noviaNombre },
        novio: { ...config.novio, nombre: novioNombre },
        iniciales: { novia: inicialNovia, novio: inicialNovio },
        nombreConjunto,
        inicialesConjuntas,
        fechaFormateada,
        localizaciones,
        drive,
        rsvp: {
          mostrarChat,
          textos: rsvpTextos,
          chatTextos,
        },
      };

      const res = await fetch(`/api/admin/${inviteCode}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo guardar");
      showMsg("ok", "Datos de boda guardados correctamente.");
    } catch (error) {
      showMsg("error", error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Datos Boda</h1>
          <p className="mt-1 text-sm text-stone-500">Configura los datos principales del HERO y las ubicaciones del evento.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl border p-4 text-sm ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-700">Novios</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label-field">Novi@ 1</label>
            <input className="input-field" value={noviaNombre} onChange={(e) => setNoviaNombre(e.target.value)} placeholder="Pilar" />
          </div>
          <div>
            <label className="label-field">Inicial Novi@ 1</label>
            <input className="input-field" value={inicialNovia} onChange={(e) => setInicialNovia(e.target.value)} placeholder="P" />
          </div>
          <div>
            <label className="label-field">Novi@ 2</label>
            <input className="input-field" value={novioNombre} onChange={(e) => setNovioNombre(e.target.value)} placeholder="David" />
          </div>
          <div>
            <label className="label-field">Inicial Novi@ 2</label>
            <input className="input-field" value={inicialNovio} onChange={(e) => setInicialNovio(e.target.value)} placeholder="D" />
          </div>
          <div>
            <label className="label-field">Nombre conjunto</label>
            <input className="input-field" value={nombreConjunto} onChange={(e) => setNombreConjunto(e.target.value)} placeholder="Pilar & David" />
          </div>
          <div>
            <label className="label-field">Iniciales conjuntas</label>
            <input className="input-field" value={inicialesConjuntas} onChange={(e) => setInicialesConjuntas(e.target.value)} placeholder="P&D" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-700">HERO</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label-field">Fecha visible</label>
            <input className="input-field" value={fechaFormateada} onChange={(e) => setFechaFormateada(e.target.value)} placeholder="6 de marzo de 2027" />
          </div>
          <div className="md:col-span-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
            El texto de invitacion se edita desde Diseño de la web, dentro de la sección Invitacion.
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-stone-700">Ubicaciones</h2>
          <button onClick={addUbicacion} className="rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:border-amber-400 hover:text-amber-600">+ Añadir ubicación</button>
        </div>

        {ubicaciones.map((loc) => (
          <div key={loc.id} className="rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-700">{loc.nombre || "Nueva ubicación"}</p>
              <button onClick={() => removeUbicacion(loc.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="label-field">Fecha y hora</label>
                <input className="input-field" value={loc.fechaHoraTexto ?? ""} onChange={(e) => updateUbicacion(loc.id, { fechaHoraTexto: e.target.value })} placeholder="06mar27 - 12:00" />
              </div>
              <div>
                <label className="label-field">Título</label>
                <input className="input-field" value={loc.nombre} onChange={(e) => updateUbicacion(loc.id, { nombre: e.target.value })} placeholder="Ceremonia en la iglesia" />
              </div>
              <div>
                <label className="label-field">Lugar</label>
                <input className="input-field" value={loc.descripcion} onChange={(e) => updateUbicacion(loc.id, { descripcion: e.target.value })} placeholder="Dirección en texto" />
              </div>
              <div>
                <label className="label-field">Cómo llegar (Google Maps URL)</label>
                <input className="input-field" value={loc.enlaceMaps ?? ""} onChange={(e) => updateUbicacion(loc.id, { enlaceMaps: e.target.value })} placeholder="https://maps.google.com/..." />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-700">Google Drive</h2>
        <p className="text-sm text-stone-500">Define aquí la carpeta donde se guardan los recursos de la web y las subidas privadas de invitados.</p>

        <div className={`rounded-xl border p-4 text-sm ${driveStatus?.lastError ? "border-red-200 bg-red-50 text-red-700" : driveStatus?.hasStoredToken ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {driveStatus === null
                  ? "Comprobando conexión con Google Drive…"
                  : driveStatus.lastError
                    ? "Conexión con Google Drive interrumpida"
                    : driveStatus.hasStoredToken
                      ? "Conectado a Google Drive"
                      : "Google Drive no está conectado"}
              </p>
              {driveStatus?.lastVerifiedAt && (
                <p className="mt-1 text-xs opacity-80">
                  Última verificación correcta: {new Date(driveStatus.lastVerifiedAt).toLocaleString("es-ES")}
                </p>
              )}
              {driveStatus?.lastError && (
                <p className="mt-1 text-xs opacity-80">{driveStatus.lastError}</p>
              )}
            </div>
            <a
              href={`/api/admin/google-drive/oauth/start?code=${encodeURIComponent(inviteCode)}`}
              className="whitespace-nowrap rounded-lg border border-current px-3 py-1.5 text-xs font-semibold hover:opacity-80"
            >
              {driveStatus?.hasStoredToken ? "Reconectar" : "Conectar"} Google Drive
            </a>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label-field">Ruta visible recursos web</label>
            <input
              className="input-field"
              value={drive.recursosWeb.folderPath}
              onChange={(e) =>
                setDrive((current) => ({
                  ...current,
                  recursosWeb: { ...current.recursosWeb, folderPath: e.target.value },
                }))
              }
              placeholder="Recursos de la web"
            />
          </div>
          <div>
            <label className="label-field">ID carpeta recursos web</label>
            <input
              className="input-field font-mono"
              value={drive.recursosWeb.folderId}
              onChange={(e) =>
                setDrive((current) => ({
                  ...current,
                  recursosWeb: { ...current.recursosWeb, folderId: e.target.value },
                }))
              }
              placeholder="0B..."
            />
          </div>
          <div>
            <label className="label-field">Shared Drive ID recursos web</label>
            <input
              className="input-field font-mono"
              value={drive.recursosWeb.sharedDriveId ?? ""}
              onChange={(e) =>
                setDrive((current) => ({
                  ...current,
                  recursosWeb: {
                    ...current.recursosWeb,
                    sharedDriveId: e.target.value || undefined,
                  },
                }))
              }
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="label-field">ID carpeta subidas invitados</label>
            <input
              className="input-field font-mono"
              value={drive.invitados.folderId}
              onChange={(e) =>
                setDrive((current) => ({
                  ...current,
                  invitados: { ...current.invitados, folderId: e.target.value },
                }))
              }
              placeholder="0B..."
            />
          </div>
          <div>
            <label className="label-field">Ruta visible subidas invitados</label>
            <input
              className="input-field"
              value={drive.invitados.folderPath}
              onChange={(e) =>
                setDrive((current) => ({
                  ...current,
                  invitados: { ...current.invitados, folderPath: e.target.value },
                }))
              }
              placeholder="Subidas de invitados"
            />
          </div>
          <div>
            <label className="label-field">Shared Drive ID invitados</label>
            <input
              className="input-field font-mono"
              value={drive.invitados.sharedDriveId ?? ""}
              onChange={(e) =>
                setDrive((current) => ({
                  ...current,
                  invitados: {
                    ...current.invitados,
                    sharedDriveId: e.target.value || undefined,
                  },
                }))
              }
              placeholder="Opcional"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-stone-700">RSVP — formulario de confirmación</h2>
          <p className="mt-1 text-sm text-stone-500">
            Personaliza los textos del formulario de confirmación. Deja un campo vacío para usar el texto por defecto.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {RSVP_FORM_FIELDS.map((field) => (
            <div key={field.key} className={field.multiline ? "md:col-span-2" : undefined}>
              <label className="label-field">{field.label}</label>
              {field.multiline ? (
                <textarea
                  className="input-field min-h-[80px]"
                  value={rsvpTextos[field.key] ?? ""}
                  onChange={(e) => updateRsvpTexto(field.key, e.target.value)}
                  placeholder={DEFAULT_RSVP_TEXTOS_FORMULARIO[field.key]}
                />
              ) : (
                <input
                  className="input-field"
                  value={rsvpTextos[field.key] ?? ""}
                  onChange={(e) => updateRsvpTexto(field.key, e.target.value)}
                  placeholder={DEFAULT_RSVP_TEXTOS_FORMULARIO[field.key]}
                />
              )}
              {field.hint && <p className="mt-1 text-xs text-stone-500">{field.hint}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-stone-700">RSVP — chat &quot;Pregunta a los novios&quot;</h2>
          <p className="mt-1 text-sm text-stone-500">
            Ocultarlo es solo una opción de presentación: los mensajes existentes no se borran y las consultas no se disparan mientras está oculto.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <input type="checkbox" checked={mostrarChat} onChange={(e) => setMostrarChat(e.target.checked)} />
          Mostrar el chat &quot;Pregunta a los novios&quot; en la página de confirmación
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          {RSVP_CHAT_FIELDS.map((field) => (
            <div key={field.key} className={field.multiline ? "md:col-span-2" : undefined}>
              <label className="label-field">{field.label}</label>
              {field.multiline ? (
                <textarea
                  className="input-field min-h-[80px]"
                  value={chatTextos[field.key] ?? ""}
                  onChange={(e) => updateChatTexto(field.key, e.target.value)}
                  placeholder={DEFAULT_RSVP_TEXTOS_CHAT[field.key]}
                />
              ) : (
                <input
                  className="input-field"
                  value={chatTextos[field.key] ?? ""}
                  onChange={(e) => updateChatTexto(field.key, e.target.value)}
                  placeholder={DEFAULT_RSVP_TEXTOS_CHAT[field.key]}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-base font-semibold text-stone-700">Permisos (fase siguiente)</h2>
        <p className="mt-2 text-sm text-stone-500">La gestión de roles personalizados de invitado se implementará en la siguiente fase junto al sistema de visibilidad por rol.</p>
      </section>
    </div>
  );
}
