import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path, imports = {}, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, ...globals, require(id) { assert.ok(id in imports, id); return imports[id]; } });
  return exports;
}
const { weddingImageLoadingOrder } = loadModule("../src/config/wedding.config.ts");
const utils = loadModule("../src/lib/portada-libre.ts");
const drive = loadModule("../src/lib/drive-image.ts");
const api = loadModule("../src/lib/image-loading.ts", {
  "@/config/wedding.config": { weddingImageLoadingOrder },
  "@/lib/portada-libre": utils,
  "@/lib/drive-image": drive,
});
const [alhambra, leon, juntas] = weddingImageLoadingOrder.pinturas;
const [olivo, chopo] = weddingImageLoadingOrder.ramas;
const sections = [{
  tipo: "portadaLibre",
  portadaLibre: {
    elementos: [
      { id: alhambra, tipo: "imagen", url: "/alhambra.png" },
      { id: leon, tipo: "imagen", url: "/leon.png" },
      { id: olivo, tipo: "imagen", url: "/olivo.png" },
      { id: chopo, tipo: "imagen", url: "/chopo.png" },
      { id: juntas, tipo: "imagen", url: "/juntas.png" },
    ],
    pc: { layout: { [alhambra]: { oculto: true }, [leon]: { oculto: true } } },
    movil: { layout: { [juntas]: { oculto: true } } },
  },
}, { tipo: "carrusel", items: [{ imagen: "/photo1.jpg" }, { imagen: "/photo2.jpg" }, { imagen: "/photo3.jpg" }] },
{ tipo: "portadaLibre", portadaLibre: { elementos: [{ id: "hotel", tipo: "imagen", url: "/hotel.png" }] } }];

test("fixed groups select only the device paintings, followed by branches, carousel and information", () => {
  for (const [device, paintings] of [["pc", ["/juntas.png"]], ["movil", ["/alhambra.png", "/leon.png"]]]) {
    const groups = api.getImageLoadingGroups(sections, device);
    assert.equal(JSON.stringify(groups.map((g) => g.sources)), JSON.stringify([
      paintings, ["/olivo.png", "/chopo.png"], ["/photo1.jpg", "/photo2.jpg", "/photo3.jpg"], ["/hotel.png"],
    ]));
    assert.equal(new Set(groups.flatMap((g) => g.sources)).size, groups.flatMap((g) => g.sources).length);
  }
});

test("groups wait for every image of the previous stage and never exceed two concurrent loads", async () => {
  const groups = api.getImageLoadingGroups(sections, "movil");
  const events = [];
  let active = 0;
  let peak = 0;
  await api.loadImageGroups(groups, new AbortController().signal, async (src) => {
    events.push(`start:${src}`);
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    events.push(`end:${src}`);
  }, (src) => events.push(`loaded:${src}`), () => assert.fail("Unexpected failure"), (name) => events.push(`group:${name}`));
  assert.equal(peak, 2);
  for (let index = 1; index < groups.length; index++) {
    const start = events.indexOf(`group:${groups[index].name}`);
    assert.ok(groups[index - 1].sources.every((src) => events.indexOf(`loaded:${src}`) < start));
  }
  assert.equal(events.at(-1), "group:complete");
});

test("failed images are reported and later groups continue; cancellation prevents later groups", async () => {
  const groups = [{ name: "pinturas", sources: ["/bad.png"] }, { name: "ramas", sources: ["/good.png"] }];
  const failures = [];
  const loaded = [];
  await api.loadImageGroups(groups, new AbortController().signal, async (src) => {
    if (src === "/bad.png") throw new Error("HTTP 500");
  }, (src) => loaded.push(src), (src) => failures.push(src), () => {});
  assert.deepEqual(failures, ["/bad.png"]);
  assert.deepEqual(loaded, ["/good.png"]);
  const controller = new AbortController();
  const starts = [];
  await assert.rejects(api.loadImageGroups(groups, controller.signal, async (src) => {
    starts.push(src);
    controller.abort(new Error("Device changed"));
  }, () => assert.fail("Aborted image marked loaded"), () => assert.fail("Cancellation is not a failure"), () => {}), /Device changed/);
  assert.deepEqual(starts, ["/bad.png"]);
});

test("original preloading waits for decoding and preserves the exact source", async () => {
  let image;
  let decode;
  const { loadOriginalImage } = loadModule("../src/lib/image-loading.ts", {
    "@/config/wedding.config": { weddingImageLoadingOrder },
    "@/lib/portada-libre": utils,
    "@/lib/drive-image": drive,
  }, { Image: class {
    constructor() { image = this; }
    decode() { return new Promise((resolve) => { decode = resolve; }); }
  } });
  let complete = false;
  const promise = loadOriginalImage("/master-16bit.png", new AbortController().signal).then(() => { complete = true; });
  assert.equal(image.src, "/master-16bit.png");
  assert.equal(image.fetchPriority, "low");
  image.onload();
  await Promise.resolve();
  assert.equal(complete, false);
  decode();
  await promise;
  assert.equal(complete, true);
});
