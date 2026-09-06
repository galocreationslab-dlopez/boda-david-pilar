/**
 * quadTransform.ts
 * Matemática de "corner pinning": calcula la matriz de proyección 2D que
 * transforma un cuadrilátero arbitrario en un rectángulo (o viceversa), y la
 * convierte al formato matrix3d() que entiende CSS `transform`.
 * Referencia: método clásico de mapeo cuadrilátero→cuadrilátero vía matrices
 * homogéneas 3x3 (usado habitualmente para "corner pinning" con CSS3).
 */

type Mat3 = number[]; // 9 elementos, row-major

function adj(m: Mat3): Mat3 {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

function multmm(a: Mat3, b: Mat3): Mat3 {
  const c = new Array(9).fill(0);
  for (let i = 0; i !== 3; ++i) {
    for (let j = 0; j !== 3; ++j) {
      let cij = 0;
      for (let k = 0; k !== 3; ++k) {
        cij += a[3 * i + k] * b[3 * k + j];
      }
      c[3 * i + j] = cij;
    }
  }
  return c;
}

function multmv(m: Mat3, v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Mat3 {
  const m: Mat3 = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

function general2DProjection(
  x1s: number, y1s: number, x1d: number, y1d: number,
  x2s: number, y2s: number, x2d: number, y2d: number,
  x3s: number, y3s: number, x3d: number, y3d: number,
  x4s: number, y4s: number, x4d: number, y4d: number,
): Mat3 {
  const s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
  const d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
  return multmm(d, adj(s));
}

export type Point = { x: number; y: number };
export type Quad = { tl: Point; tr: Point; br: Point; bl: Point };

/**
 * Devuelve la matriz CSS matrix3d() que transforma el cuadrilátero `source`
 * (en px, dentro de un contenedor de tamaño width x height) para que ocupe
 * exactamente el rectángulo completo del contenedor (0,0)-(width,height).
 */
export function quadToRectMatrix3d(source: Quad, width: number, height: number): string {
  const m = general2DProjection(
    source.tl.x, source.tl.y, 0, 0,
    source.tr.x, source.tr.y, width, 0,
    source.br.x, source.br.y, width, height,
    source.bl.x, source.bl.y, 0, height,
  );

  // Normalizar para que m[8] (componente homogénea) sea 1.
  const norm = m[8] !== 0 ? m.map((v) => v / m[8]) : m;

  // Mapeo estándar de una matriz de proyección 2D (3x3) a CSS matrix3d (4x4, column-major).
  const m3d = [
    norm[0], norm[3], 0, norm[6],
    norm[1], norm[4], 0, norm[7],
    0, 0, 1, 0,
    norm[2], norm[5], 0, norm[8],
  ];

  return `matrix3d(${m3d.map((v) => (Number.isFinite(v) ? v : 0)).join(",")})`;
}

export const DEFAULT_QUAD: Quad = {
  tl: { x: 0.2, y: 0.2 },
  tr: { x: 0.8, y: 0.2 },
  br: { x: 0.8, y: 0.8 },
  bl: { x: 0.2, y: 0.8 },
};
