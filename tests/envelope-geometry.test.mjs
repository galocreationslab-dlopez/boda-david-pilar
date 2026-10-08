import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const directory = path.dirname(fileURLToPath(import.meta.url));

function loadSource(relativePath, imports = {}) {
  const exports = {};
  const source = readFileSync(path.join(directory, "..", relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  });
  vm.runInNewContext(compiled.outputText, {
    exports,
    require: (id) => {
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
  });
  return exports;
}

const configModule = loadSource("src\\config\\wedding.config.ts");
const { normalizeIntroEnvelopeConfig, normalizeIntroConfig } = configModule;
const { getEnvelopeGeometry } = loadSource("src\\lib\\envelope-geometry.ts", {
  "@/config/wedding.config": configModule,
});

test("upper flap and front share the exact edge at every supported extreme", () => {
  for (const height of [20, 42, 70]) {
    for (const radius of [0, 10, 50]) {
      const geometry = getEnvelopeGeometry({ alturaSolapaPorcentaje: height, radioPicoSolapaPorcentaje: radius });
      const flapNumbers = geometry.flapEdge.match(/[\d.]+/g).map(Number);
      const frontNumbers = geometry.frontEdge.match(/[\d.]+/g).map(Number);
      assert.equal(flapNumbers.length, frontNumbers.length);
      flapNumbers.forEach((value, index) => {
        assert.ok(Math.abs(frontNumbers[index] - (index % 2 === 0 ? value : value * height / 100)) < 1e-10);
      });
      assert.equal(geometry.flapPath, `${geometry.flapEdge} Z`);
      assert.equal(geometry.frontPath, `M0,100 L0,0 ${geometry.frontEdge.slice(5)} L100,100 Z`);
    }
  }
});

test("lower silhouettes close the same seam without overlaps or out-of-bounds coordinates", () => {
  for (const height of [5, 58, 95]) {
    for (const width of [0, 0.01, 12, 80]) {
      for (const radius of [0, 10, 50]) {
        const geometry = getEnvelopeGeometry({
          alturaSolapaInferiorPorcentaje: height,
          anchoPlanoSolapaInferiorPorcentaje: width,
          redondeoSolapaInferiorPorcentaje: radius,
        });
        assert.equal(geometry.lowerPath, `${geometry.lowerEdge} Z`);
        assert.ok(geometry.lowerEdge.startsWith("M0,100 "));
        assert.ok(geometry.lowerEdge.endsWith(" L100,100"));
        const numbers = geometry.lowerEdge.match(/[\d.]+/g).map(Number);
        numbers.forEach((value) => assert.ok(Number.isFinite(value) && value >= 0 && value <= 100));
        const x = numbers.filter((_, index) => index % 2 === 0);
        x.forEach((value, index) => assert.ok(index === 0 || value >= x[index - 1]));
        assert.equal((geometry.lowerEdge.match(/Q/g) ?? []).length, width === 0 ? 1 : 2);
      }
    }
  }
});

test("invalid and extreme saved values normalize to finite supported geometry", () => {
  const config = normalizeIntroEnvelopeConfig({
    alturaSolapaPorcentaje: NaN,
    radioPicoSolapaPorcentaje: Infinity,
    alturaSolapaInferiorPorcentaje: -10,
    anchoPlanoSolapaInferiorPorcentaje: 200,
    redondeoSolapaInferiorPorcentaje: NaN,
  });
  assert.equal(config.alturaSolapaPorcentaje, 42);
  assert.equal(config.radioPicoSolapaPorcentaje, 10);
  assert.equal(config.alturaSolapaInferiorPorcentaje, 5);
  assert.equal(config.anchoPlanoSolapaInferiorPorcentaje, 80);
  assert.equal(config.redondeoSolapaInferiorPorcentaje, 10);
  Object.values(getEnvelopeGeometry(config)).forEach((value) => assert.ok(!/NaN|Infinity/.test(String(value))));
});

test("geometry and compatibility persist independently for PC and mobile without changing animation settings", () => {
  const raw = {
    activo: true,
    pc: { tipo: "envelope", envelope: { geometriaSobre: "clasica", alturaSolapaInferiorPorcentaje: 95, modoSalidaSobre: "fadeProgramado", lineaTemporal: { inicioAperturaMs: 320 }, selloSecoUrl: "/stamp.svg", imagenUrl: "/paper.jpg" } },
    movil: { tipo: "envelope", envelope: { geometriaSobre: "papel", alturaSolapaInferiorPorcentaje: 5, anchoPlanoSolapaInferiorPorcentaje: 80, lacreFadeDuranteApertura: true, duracionFadeLacreMs: 550 } },
  };
  const saved = normalizeIntroConfig(JSON.parse(JSON.stringify(normalizeIntroConfig(raw))));
  assert.equal(saved.pc.envelope.geometriaSobre, "clasica");
  assert.equal(saved.pc.envelope.alturaSolapaInferiorPorcentaje, 95);
  assert.equal(saved.pc.envelope.lineaTemporal.inicioAperturaMs, 320);
  assert.equal(saved.pc.envelope.selloSecoUrl, "/stamp.svg");
  assert.equal(saved.pc.envelope.imagenUrl, "/paper.jpg");
  assert.equal(saved.movil.envelope.geometriaSobre, "papel");
  assert.equal(saved.movil.envelope.alturaSolapaInferiorPorcentaje, 5);
  assert.equal(saved.movil.envelope.anchoPlanoSolapaInferiorPorcentaje, 80);
  assert.equal(saved.movil.envelope.lacreFadeDuranteApertura, true);
  assert.equal(saved.movil.envelope.duracionFadeLacreMs, 550);
});
