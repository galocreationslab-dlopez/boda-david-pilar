/**
 * components/ui/SelloNupcial.tsx
 * ─────────────────────────────────────────────────────────────
 * Sello SVG con las iniciales de los novios entrelazadas y una
 * rama de olivo. Es el elemento firma visual de toda la web.
 *
 * Props:
 *  - inicialNovio, inicialNovia: letras del sello
 *  - size: tamaño en px (por defecto 120)
 *  - color: color principal (por defecto --bronze)
 *  - className: clases adicionales
 */

type SelloNupcialProps = {
  inicialNovio: string;
  inicialNovia: string;
  size?: number;
  color?: string;
  className?: string;
};

export function SelloNupcial({
  inicialNovio,
  inicialNovia,
  size = 120,
  color = "#8C6A3F",
  className = "",
}: SelloNupcialProps) {
  const mid = size / 2;
  const r = size * 0.42;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Sello de boda: ${inicialNovio} y ${inicialNovia}`}
      role="img"
    >
      {/* Círculo exterior decorativo */}
      <circle
        cx={mid}
        cy={mid}
        r={r}
        stroke={color}
        strokeWidth="1"
        strokeDasharray="3 4"
        fill="none"
        opacity="0.5"
      />

      {/* Círculo interior */}
      <circle
        cx={mid}
        cy={mid}
        r={r * 0.85}
        stroke={color}
        strokeWidth="0.5"
        fill="none"
        opacity="0.3"
      />

      {/* Rama de olivo izquierda */}
      <g opacity="0.7" stroke={color} strokeWidth="0.8" fill="none">
        <path d={`M${mid * 0.3} ${mid * 1.6} Q${mid * 0.5} ${mid * 1.1} ${mid * 0.6} ${mid * 0.9}`} />
        {/* Hojitas de la rama izquierda */}
        <ellipse cx={mid * 0.36} cy={mid * 1.42} rx={size * 0.045} ry={size * 0.025} transform={`rotate(-40 ${mid * 0.36} ${mid * 1.42})`} fill={color} opacity="0.6" />
        <ellipse cx={mid * 0.44} cy={mid * 1.22} rx={size * 0.04} ry={size * 0.022} transform={`rotate(-35 ${mid * 0.44} ${mid * 1.22})`} fill={color} opacity="0.6" />
        <ellipse cx={mid * 0.52} cy={mid * 1.03} rx={size * 0.038} ry={size * 0.02} transform={`rotate(-30 ${mid * 0.52} ${mid * 1.03})`} fill={color} opacity="0.6" />
      </g>

      {/* Rama de olivo derecha (espejada) */}
      <g opacity="0.7" stroke={color} strokeWidth="0.8" fill="none">
        <path d={`M${mid * 1.7} ${mid * 1.6} Q${mid * 1.5} ${mid * 1.1} ${mid * 1.4} ${mid * 0.9}`} />
        <ellipse cx={mid * 1.64} cy={mid * 1.42} rx={size * 0.045} ry={size * 0.025} transform={`rotate(40 ${mid * 1.64} ${mid * 1.42})`} fill={color} opacity="0.6" />
        <ellipse cx={mid * 1.56} cy={mid * 1.22} rx={size * 0.04} ry={size * 0.022} transform={`rotate(35 ${mid * 1.56} ${mid * 1.22})`} fill={color} opacity="0.6" />
        <ellipse cx={mid * 1.48} cy={mid * 1.03} rx={size * 0.038} ry={size * 0.02} transform={`rotate(30 ${mid * 1.48} ${mid * 1.03})`} fill={color} opacity="0.6" />
      </g>

      {/* Iniciales entrelazadas */}
      <text
        x={mid * 0.72}
        y={mid * 1.15}
        fontFamily="'Cormorant Garamond', serif"
        fontSize={size * 0.36}
        fontWeight="300"
        fill={color}
        textAnchor="middle"
      >
        {inicialNovio}
      </text>
      <text
        x={mid * 1.28}
        y={mid * 1.15}
        fontFamily="'Cormorant Garamond', serif"
        fontSize={size * 0.36}
        fontWeight="300"
        fill={color}
        textAnchor="middle"
      >
        {inicialNovia}
      </text>

      {/* Ampersand central decorativo */}
      <text
        x={mid}
        y={mid * 1.05}
        fontFamily="'Cormorant Garamond', serif"
        fontSize={size * 0.18}
        fontWeight="300"
        fill={color}
        textAnchor="middle"
        opacity="0.7"
      >
        &amp;
      </text>
    </svg>
  );
}
