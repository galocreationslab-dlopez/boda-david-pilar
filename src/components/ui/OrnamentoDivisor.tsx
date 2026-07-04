/**
 * components/ui/OrnamentoDivisor.tsx
 * ─────────────────────────────────────────────────────────────
 * Divisor decorativo con rama de olivo SVG.
 * Usado entre secciones y bajo los títulos.
 */

type OrnamentoDivisorProps = {
  color?: string;
  className?: string;
};

export function OrnamentoDivisor({
  color = "#8C6A3F",
  className = "",
}: OrnamentoDivisorProps) {
  return (
    <div
      className={`flex items-center justify-center gap-3 my-6 ${className}`}
    >
      {/* Línea izquierda */}
      <div
        className="h-px flex-1 max-w-[100px]"
        style={{
          background: `linear-gradient(to right, transparent, ${color}40)`,
        }}
      />

      {/* Icono central: hoja de olivo SVG */}
      <svg
        width="28"
        height="16"
        viewBox="0 0 28 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Tallo */}
        <path
          d="M14 15 L14 1"
          stroke={color}
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Hoja izquierda */}
        <path
          d="M14 8 Q9 5 7 2 Q11 2 14 6"
          fill={color}
          opacity="0.5"
        />
        {/* Hoja derecha */}
        <path
          d="M14 8 Q19 5 21 2 Q17 2 14 6"
          fill={color}
          opacity="0.5"
        />
        {/* Hoja inferior izquierda */}
        <path
          d="M14 11 Q9 9 8 7 Q11 7 14 10"
          fill={color}
          opacity="0.4"
        />
        {/* Hoja inferior derecha */}
        <path
          d="M14 11 Q19 9 20 7 Q17 7 14 10"
          fill={color}
          opacity="0.4"
        />
      </svg>

      {/* Línea derecha */}
      <div
        className="h-px flex-1 max-w-[100px]"
        style={{
          background: `linear-gradient(to left, transparent, ${color}40)`,
        }}
      />
    </div>
  );
}

/**
 * Separador entre secciones grandes — ola suave con color de fondo
 */
export function SeparadorSeccion({
  colorHacia = "#EDE7DB",
}: {
  colorHacia?: string;
}) {
  return (
    <div className="w-full overflow-hidden leading-none" aria-hidden="true">
      <svg
        viewBox="0 0 1440 60"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-full h-[40px] sm:h-[60px]"
      >
        <path
          d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z"
          fill={colorHacia}
        />
      </svg>
    </div>
  );
}
