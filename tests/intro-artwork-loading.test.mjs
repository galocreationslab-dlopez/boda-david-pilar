import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import * as react from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

function load(path, imports = {}, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports, URL, URLSearchParams, AbortController, console, ...globals,
    require(id) {
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id in imports) return imports[id];
      if (id.startsWith("@/components/")) return new Proxy({}, { get: (_, key) => `${id}:${String(key)}` });
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
  });
  return exports;
}

const drive = load("../src/lib/drive-image.ts");
const configModule = load("../src/config/wedding.config.ts");

test("only explicit raster paths bypass inspection, never SVGs or opaque Drive proxies", () => {
  for (const src of ["/seal.png", "https://cdn.test/seal.JPG?v=1#seal", " /seal.webp ", "/seal.gif", "/seal.avif", "/seal.bmp"]) {
    assert.equal(drive.isRasterImageSrc(src), true, src);
  }
  for (const src of ["/seal.svg", "/api/resources/preview?src=seal.png", "/image?filename=seal.jpg", "<svg></svg>", "/seal.png.html"]) {
    assert.equal(drive.isRasterImageSrc(src), false, src);
  }
});

function artworkHarness(decode, fetch) {
  let state = null;
  let effect;
  const warnings = [];
  const timers = new Set();
  const { useIntroArtwork } = load("../src/components/motion/useIntroArtwork.ts", {
    react: {
      useState: () => [state, (next) => { state = next; }],
      useEffect: (callback) => { effect = callback; },
    },
    "@/lib/drive-image": drive,
    "@/components/motion/useIntroResources": { decodeIntroImage: decode, INTRO_RESOURCE_TIMEOUT_MS: 30000 },
    "@/components/motion/AutoDrawSVG": { parseNativeSvgAnimations: () => [], svgMarkupHandlesClick: () => false },
  }, {
    fetch,
    console: { warn: (...args) => warnings.push(args) },
    window: { setTimeout: (callback) => { timers.add(callback); return callback; }, clearTimeout: (timer) => timers.delete(timer) },
  });
  return {
    render: function Artwork(src) { return useIntroArtwork(src); },
    start: () => effect(),
    warnings,
    timers,
  };
}

test("cold raster artwork waits for decoding, keeps its URL and requires no fetch or object URL", async () => {
  for (const src of ["/seal.png", "https://test.public.blob.vercel-storage.com/dry-stamp.png"]) {
    let finish;
    const requests = [];
    const app = artworkHarness((url) => {
      requests.push(url);
      return new Promise((resolve) => { finish = resolve; });
    }, () => assert.fail("Raster artwork must not be fetched for SVG detection"));
    assert.equal(app.render(src).kind, "loading");
    const cleanup = app.start();
    assert.equal(app.render(src).kind, "loading");
    finish();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(app.render(src).kind, "image");
    assert.equal(app.render(src).source, src);
    assert.deepEqual(requests, [src]);
    assert.equal(app.timers.size, 0);
    cleanup();
  }
});

test("raster decode errors are reported and unmounting cancels without publishing a stale result", async () => {
  const error = new Error("Image decoding failed");
  const app = artworkHarness(async () => { throw error; }, () => assert.fail("Unexpected fetch"));
  app.render("/bad.png");
  app.start();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.render("/bad.png").kind, "failed");
  assert.equal(app.warnings.length, 1);
  assert.equal(app.warnings[0][2], error);

  let signal;
  const cancelled = artworkHarness((_src, value) => {
    signal = value;
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
  }, () => assert.fail("Unexpected fetch"));
  cancelled.render("/seal.png");
  cancelled.start()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(signal.aborted, true);
  assert.equal(cancelled.render("/seal.png").kind, "loading");
  assert.equal(cancelled.warnings.length, 0);
});

test("unknown artwork still inspects SVG markup and preserves its source", async () => {
  const markup = "<svg></svg>";
  let state;
  let effect;
  const { useIntroArtwork } = load("../src/components/motion/useIntroArtwork.ts", {
    react: { useState: () => [state, (next) => { state = next; }], useEffect: (callback) => { effect = callback; } },
    "@/lib/drive-image": drive,
    "@/components/motion/useIntroResources": { decodeIntroImage: () => assert.fail("Unexpected decoding"), INTRO_RESOURCE_TIMEOUT_MS: 30000 },
    "@/components/motion/AutoDrawSVG": { parseNativeSvgAnimations: () => [], svgMarkupHandlesClick: () => false },
  }, {
    DOMParser: class { parseFromString() { return { querySelector: () => null, documentElement: { localName: "svg" } }; } },
    fetch: async () => ({ ok: true, headers: { get: () => "image/svg+xml" }, blob: async () => ({ text: async () => markup }) }),
    window: { setTimeout: () => 1, clearTimeout() {} },
  });
  useIntroArtwork("/api/resources/preview?src=unknown");
  effect();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(useIntroArtwork("/api/resources/preview?src=unknown").kind, "staticSvg");
  assert.equal(useIntroArtwork("/api/resources/preview?src=unknown").source, markup);
});

test("public page uses identical published preloads and image groups with or without inviteCode on both devices", () => {
  const componentSize = load("../src/lib/component-size.ts");
  const portada = load("../src/lib/portada-libre.ts");
  const imageLoading = load("../src/lib/image-loading.ts", {
    "@/config/wedding.config": configModule,
    "@/lib/portada-libre": portada,
    "@/lib/drive-image": drive,
  });
  const WeddingPage = load("../src/components/wedding/WeddingPage.tsx", {
    "@/config/wedding.config": configModule,
    "@/lib/section-chains": load("../src/lib/section-chains.ts"),
    "@/lib/theme-roles": load("../src/lib/theme-roles.ts"),
    "@/lib/theme-fonts": load("../src/lib/theme-fonts.ts", { "@/lib/component-size": componentSize }),
    "@/lib/component-size": componentSize,
    "@/lib/drive-image": drive,
    "@/lib/intro-envelope-resources": load("../src/lib/intro-envelope-resources.ts", { "@/lib/drive-image": drive }),
    "@/lib/image-loading": imageLoading,
  }).default;
  const blob = "https://test.public.blob.vercel-storage.com/";
  const intro = { id: "intro", nombre: "Intro", tipo: "intro", visible: true, intro: {
    activo: true, lacreUrl: `${blob}seal.png`,
    pc: { tipo: "envelope", envelope: { selloSecoUrl: `${blob}stamp.png` } },
    movil: { tipo: "envelope", envelope: { selloSecoUrl: `${blob}stamp.png` } },
  } };
  const config = { ...configModule.weddingConfig, diseno: { secciones: [
    intro,
    { id: "photos", nombre: "Fotos", tipo: "carrusel", visible: true, items: [{ id: "photo", imagen: `${blob}photo.jpg` }] },
  ] } };
  const elements = (node) => Array.isArray(node) ? node.flatMap(elements) : react.isValidElement(node) ? [node, ...elements(node.props.children)] : [];
  const inspect = (rawSearchParams) => {
    const tree = WeddingPage({ config, galleryMedia: [], rawSearchParams });
    const all = elements(tree);
    const provider = all.find((element) => element.type.endsWith?.("ImageLoadingProvider:default"));
    return {
      preloads: all.filter((element) => element.type === "link").map((element) => element.props),
      pc: provider.props.pc, movil: provider.props.movil, waitForIntro: provider.props.waitForIntro,
    };
  };
  const plain = inspect({});
  assert.deepEqual(plain, inspect({ inviteCode: "TEST" }));
  assert.deepEqual(plain, inspect({ invitecode: "TEST" }));
  assert.equal(plain.waitForIntro, true);
  assert.ok(plain.preloads.length > 0);
  assert.ok(plain.preloads.every((link) => link.as === "image" && link.crossOrigin === undefined && link.fetchPriority === "high"));
  assert.deepEqual(plain.preloads.filter((link) => link.href === `${blob}stamp.png`).map((link) => link.media),
    ["(min-width: 768px)", "(max-width: 767.98px)"]);
  intro.intro.lacreUrl = `${blob}seal.svg`;
  assert.equal(inspect({}).preloads[0].as, "fetch");
  assert.equal(inspect({}).preloads[0].crossOrigin, "anonymous");
});
