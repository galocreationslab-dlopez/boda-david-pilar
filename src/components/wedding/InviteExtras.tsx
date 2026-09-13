"use client";

import { useCallback, useEffect, useState } from "react";

type MessageItem = {
  id: string;
  author_role: "guest" | "admin";
  author_name?: string | null;
  contenido: string;
  created_at: string;
};

type Props = {
  inviteCode: string;
  invitacionNombre: string;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InviteExtras({ inviteCode, invitacionNombre }: Props) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/rsvp/${inviteCode}/messages`);
    if (!response.ok) return;
    const data = await response.json();
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, [inviteCode]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setLoading(true);
      await loadMessages();
      if (active) setLoading(false);
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [loadMessages]);

  const sendMessage = async () => {
    const contenido = messageText.trim();
    if (!contenido) return;
    setSending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/rsvp/${inviteCode}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo enviar el mensaje");
      setMessageText("");
      await loadMessages();
      setFeedback("Mensaje enviado. Os responderemos desde la administracion.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error al enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-5 sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">Area privada</p>
        <h2 className="text-2xl font-semibold text-stone-900">Pregunta a los novios</h2>
        <p className="text-sm text-stone-500">Solo tu invitacion puede ver este contenido privado.</p>
      </div>

      {feedback && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{feedback}</div>}

      {loading ? (
        <p className="text-sm text-stone-500">Cargando contenido privado...</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-stone-500">Todavia no hay mensajes en esta conversacion.</p>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`rounded-2xl p-4 ${message.author_role === "admin" ? "bg-emerald-50" : "bg-stone-50"}`}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-stone-400">
                    <span>{message.author_role === "admin" ? "Respuesta de los novios" : invitacionNombre}</span>
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-stone-700">{message.contenido}</p>
                </article>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
            <label className="block text-sm font-medium text-stone-700">Escribe aqui tu pregunta o dedicatoria</label>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
              placeholder="Preguntas, dudas, frases bonitas..."
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !messageText.trim()}
              className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? "Enviando..." : "Enviar mensaje"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

