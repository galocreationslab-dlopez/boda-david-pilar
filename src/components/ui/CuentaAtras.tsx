/**
 * components/ui/CuentaAtras.tsx
 * ─────────────────────────────────────────────────────────────
 * Cuenta atrás animada hasta la fecha de la boda.
 * Es un componente Client (usa useState/useEffect).
 * Recibe la fecha como prop para que sea reutilizable.
 */

"use client";

import { useState, useEffect } from "react";

type TiempoRestante = {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
};

type CuentaAtrasProps = {
  fechaObjetivo: string; // ISO date "2027-03-06"
  className?: string;
};

function calcularTiempo(fechaObjetivo: string): TiempoRestante {
  const ahora = new Date().getTime();
  const objetivo = new Date(fechaObjetivo).getTime();
  const diferencia = objetivo - ahora;

  if (diferencia <= 0) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }

  return {
    dias: Math.floor(diferencia / (1000 * 60 * 60 * 24)),
    horas: Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutos: Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)),
    segundos: Math.floor((diferencia % (1000 * 60)) / 1000),
  };
}

function UnidadTiempo({
  valor,
  etiqueta,
}: {
  valor: number;
  etiqueta: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-1 sm:px-0 sm:py-0">
      <span
        className="font-display text-4xl sm:text-6xl font-light tabular-nums"
        style={{ color: "var(--white)" }}
        aria-live="polite"
        aria-atomic="true"
      >
        {String(valor).padStart(2, "0")}
      </span>
      <span
        className="smallcaps text-xs tracking-widest"
        style={{ color: "var(--bronze-pale)" }}
      >
        {etiqueta}
      </span>
    </div>
  );
}

function Separador() {
  return (
    <span
      className="hidden self-center pb-4 font-display text-3xl font-light sm:inline"
      style={{ color: "var(--bronze-pale)", opacity: 0.5 }}
      aria-hidden="true"
    >
      ·
    </span>
  );
}

export function CuentaAtras({ fechaObjetivo, className = "" }: CuentaAtrasProps) {
  const [tiempo, setTiempo] = useState<TiempoRestante>(() =>
    calcularTiempo(fechaObjetivo)
  );

  useEffect(() => {
    const intervalo = setInterval(() => {
      setTiempo(calcularTiempo(fechaObjetivo));
    }, 1000);

    return () => clearInterval(intervalo);
  }, [fechaObjetivo]);

  const haTerminado =
    tiempo.dias === 0 &&
    tiempo.horas === 0 &&
    tiempo.minutos === 0 &&
    tiempo.segundos === 0;

  if (haTerminado) {
    return (
      <div className={`text-center ${className}`}>
        <p
          className="font-display text-3xl font-light"
          style={{ color: "var(--white)" }}
        >
          ¡Hoy es el gran día!
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:items-end sm:justify-center sm:gap-6 ${className}`}>
      <UnidadTiempo valor={tiempo.dias} etiqueta="días" />
      <Separador />
      <UnidadTiempo valor={tiempo.horas} etiqueta="horas" />
      <Separador />
      <UnidadTiempo valor={tiempo.minutos} etiqueta="minutos" />
      <Separador />
      <UnidadTiempo valor={tiempo.segundos} etiqueta="segundos" />
    </div>
  );
}
