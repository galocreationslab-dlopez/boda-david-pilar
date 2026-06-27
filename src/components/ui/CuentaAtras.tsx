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
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-display text-5xl sm:text-6xl font-light tabular-nums"
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
      className="font-display text-3xl font-light self-center pb-4"
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
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const intervalo = setInterval(() => {
      setTiempo(calcularTiempo(fechaObjetivo));
    }, 1000);

    return () => clearInterval(intervalo);
  }, [fechaObjetivo]);

  // Evitar mismatch de hidratación
  if (!montado) return null;

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
    <div className={`flex items-end justify-center gap-3 sm:gap-6 ${className}`}>
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
