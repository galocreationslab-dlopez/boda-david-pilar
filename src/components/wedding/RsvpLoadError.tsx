"use client";

import { useEffect } from "react";

export default function RsvpLoadError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("No se pudo abrir el formulario RSVP:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section role="alert" className="max-w-md text-center space-y-4">
        <h1 className="text-2xl">No hemos podido cargar tu invitación</h1>
        <p>
          Ha ocurrido un problema al cargar el formulario. Esto no significa que
          tu invitación no exista. Puedes volver a intentarlo.
        </p>
        <button
          type="button"
          className="rounded border px-6 py-3"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
        <p>Si el problema continúa, contacta con los novios para confirmar tu asistencia.</p>
      </section>
    </main>
  );
}
