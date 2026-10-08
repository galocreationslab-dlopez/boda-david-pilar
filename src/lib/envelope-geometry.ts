import { normalizeIntroEnvelopeConfig, type IntroEnvelopeConfig } from "@/config/wedding.config";

type Point = { x: number; y: number };
const point = ({ x, y }: Point) => `${x},${y}`;
const towards = (a: Point, b: Point, fraction: number): Point => ({
  x: a.x + (b.x - a.x) * fraction,
  y: a.y + (b.y - a.y) * fraction,
});

// The same open edge closes both neighbouring pieces; only its Y scale changes.
function upperEdge(height: number, radius: number) {
  const apex = { x: 50, y: height };
  const left = towards(apex, { x: 0, y: 0 }, radius);
  const right = towards(apex, { x: 100, y: 0 }, radius);
  return `L${point(left)} Q${point(apex)} ${point(right)} L100,0`;
}

export function getEnvelopeGeometry(raw: IntroEnvelopeConfig) {
  const config = normalizeIntroEnvelopeConfig(raw);
  const height = config.alturaSolapaPorcentaje!;
  const radius = config.radioPicoSolapaPorcentaje! / 100;
  const upper = upperEdge(height, radius);
  const lowerY = 100 - config.alturaSolapaInferiorPorcentaje!;
  const halfFlat = config.anchoPlanoSolapaInferiorPorcentaje! / 2;
  const lowerRadius = config.redondeoSolapaInferiorPorcentaje! / 100;
  const left = { x: 50 - halfFlat, y: lowerY };
  const right = { x: 50 + halfFlat, y: lowerY };
  const leftSlope = towards(left, { x: 0, y: 100 }, lowerRadius);
  const rightSlope = towards(right, { x: 100, y: 100 }, lowerRadius);
  // At zero flat width this is one rounded apex, not two overlapping corners.
  const lowerEdge = halfFlat === 0
    ? `M0,100 L${point(leftSlope)} Q50,${lowerY} ${point(rightSlope)} L100,100`
    : `M0,100 L${point(leftSlope)} Q${point(left)} ${point(towards(left, right, lowerRadius / 2))} L${point(towards(right, left, lowerRadius / 2))} Q${point(right)} ${point(rightSlope)} L100,100`;
  return {
    height,
    flapPath: `M0,0 ${upperEdge(100, radius)} Z`,
    flapEdge: `M0,0 ${upperEdge(100, radius)}`,
    frontPath: `M0,100 L0,0 ${upper} L100,100 Z`,
    frontEdge: `M0,0 ${upper}`,
    lowerPath: `${lowerEdge} Z`,
    lowerEdge,
  };
}
