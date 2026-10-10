import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as react from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path, imports = {}, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    ...globals,
    require(id) {
      if (id === "react/jsx-runtime") return jsxRuntime;
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
  });
  return exports;
}

function hooks(element) {
  const values = [];
  const effects = [];
  let cursor = 0;
  return {
    react: {
      ...react,
      useRef: () => ({ current: element }),
      useState(initial) {
        const index = cursor++;
        if (!(index in values)) values[index] = initial;
        return [values[index], (value) => { values[index] = typeof value === "function" ? value(values[index]) : value; }];
      },
      useEffect: (effect) => effects.push(effect),
    },
    render(component, props) { cursor = 0; effects.length = 0; return component(props); },
    effects,
  };
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!react.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}

test("device selection mounts only the matching canvas, including at the breakpoint", () => {
  let device = null;
  const DeviceContent = loadModule("../src/components/layout/DeviceContent.tsx", {
    react,
    "@/components/motion/useDeviceViewport": { useDeviceViewport: () => device },
  }).default;
  const props = { pc: react.createElement("img", { src: "/pc.png" }), movil: react.createElement("img", { src: "/mobile.png" }) };
  const render = () => renderToStaticMarkup(react.createElement(DeviceContent, props));
  assert.equal(render(), "");
  device = "movil";
  assert.match(render(), /mobile\.png/);
  assert.doesNotMatch(render(), /pc\.png/);
  device = "desktop";
  assert.match(render(), /pc\.png/);
  assert.doesNotMatch(render(), /mobile\.png/);

  let query;
  const useDeviceViewport = loadModule("../src/components/motion/useDeviceViewport.ts", {
    react: { useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
  }, { window: { matchMedia: (value) => { query = value; return { matches: false }; } } }).useDeviceViewport;
  assert.equal(useDeviceViewport(), "desktop");
  assert.equal(query, "(width < 768px)");
});

test("forced editor canvases retain original URLs, visibility, masks and map links", () => {
  const utils = loadModule("../src/lib/portada-libre.ts");
  const Portada = loadModule("../src/components/wedding/PortadaLibre.tsx", {
    "@/lib/portada-libre": utils,
    "@/components/media/ImageTreatmentFrame": { default: ({ children }) => children },
    "@/components/media/ImageMapFlip": { default: ({ children, link }) => react.createElement("div", { "data-map": link }, children) },
    "@/components/wedding/PortadaAspectRatioBox": { default: ({ children }) => children },
    "@/components/layout/DeviceContent": { default: () => { throw new Error("Forced previews must not use the window device"); } },
  }).default;
  const config = utils.normalizePortadaLibre({
    elementos: [
      { id: "pc", tipo: "imagen", url: "/master-pc.png", alt: "PC" },
      { id: "mobile", tipo: "imagen", url: "/master-mobile.png", alt: "Mobile", enlaceMaps: "https://maps.google.com/?q=Granada" },
    ],
    pc: { layout: { mobile: { oculto: true } } },
    movil: { layout: { pc: { oculto: true }, mobile: { colorModo: "paleta", colorRol: "logo" } } },
  });
  const render = (device) => renderToStaticMarkup(react.createElement(Portada, { config, forzarDispositivo: device, roleColors: { logo: "#123456" } }));
  const pc = render("pc");
  assert.match(pc, /data-portada-device="pc"/);
  assert.match(pc, /src="\/master-pc.png"/);
  assert.doesNotMatch(pc, /master-mobile\.png/);
  const mobile = render("movil");
  assert.match(mobile, /data-portada-device="movil"/);
  assert.match(mobile, /src="\/master-mobile.png"/);
  assert.doesNotMatch(mobile, /master-pc\.png/);
  assert.match(mobile, /mask-image:url/);
  assert.match(mobile, /background-color:#123456/);
  assert.match(mobile, /data-map="https:\/\/maps.google.com\/\?q=Granada"/);
  assert.match(mobile, /aria-hidden="true" loading="lazy"/);
});

test("frames do not render image sources until near the viewport and measure the rendered image", () => {
  let intersection;
  let observed;
  let measure;
  let load;
  let disconnected = false;
  const image = { naturalWidth: 200, naturalHeight: 100 };
  const frame = {
    clientWidth: 100, clientHeight: 100,
    querySelector: () => image,
    addEventListener: (name, fn, capture) => { assert.equal(name, "load"); assert.equal(capture, true); load = fn; },
    removeEventListener() {},
  };
  const harness = hooks(frame);
  const Frame = loadModule("../src/components/media/ImageTreatmentFrame.tsx", {
    react: harness.react,
    "@/lib/image-treatment": { getImageTreatmentStyle: () => ({ filter: "sepia(1)" }) },
  }, {
    console,
    Image: class { constructor() { throw new Error("An auxiliary download was started"); } },
    IntersectionObserver: class {
      constructor(callback, options) { intersection = callback; assert.equal(options.rootMargin, "300px"); }
      observe(target) { observed = target; }
      disconnect() { disconnected = true; }
    },
    ResizeObserver: class { constructor(callback) { measure = callback; } observe() {} disconnect() {} },
  }).default;
  const props = { src: "/original.png", fit: "contain", children: react.createElement("img", { src: "/original.png", loading: "lazy" }) };
  let tree = harness.render(Frame, props);
  assert.equal(tree.props["data-media-state"], "deferred");
  assert.equal(elements(tree).filter((e) => e.type === "img").length, 0);
  harness.effects.forEach((effect) => effect());
  assert.equal(observed, frame);
  intersection([{ isIntersecting: false }]);
  assert.equal(harness.render(Frame, props).props["data-media-state"], "deferred");
  intersection([{ isIntersecting: true }]);
  assert.equal(disconnected, true);
  tree = harness.render(Frame, props);
  assert.equal(elements(tree).filter((e) => e.type === "img").length, 1);
  harness.effects.forEach((effect) => effect());
  load();
  tree = harness.render(Frame, props);
  assert.equal(tree.props.children.props.style.width, "100px");
  assert.equal(tree.props.children.props.style.height, "50px");
  assert.equal(tree.props.children.props.style.filter, "sepia(1)");
  frame.clientWidth = 80;
  measure();
  assert.equal(harness.render(Frame, props).props.children.props.style.height, "40px");
  assert.equal(harness.render(Frame, { ...props, src: "/other.png" }).props.children.props.style.width, "100%");
});

test("aspect boxes use the image load event without probing the source", () => {
  const harness = hooks(null);
  class ImageElement { naturalWidth = 200; naturalHeight = 100; }
  let ratio;
  const Box = loadModule("../src/components/wedding/PortadaAspectRatioBox.tsx", {
    react: harness.react,
    "@/components/layout/WeddingViewport": { useWeddingViewport: () => ({ inset: false }) },
    "@/lib/portada-aspect-ratio": { getPortadaAspectLayout: (layout, value) => { ratio = value; return layout; } },
  }, { HTMLImageElement: ImageElement, Image: class { constructor() { throw new Error("Unexpected image probe"); } } }).default;
  const props = { layout: { x: 0, y: 0, w: 100, h: 100, mantenerAspecto: true }, imageSrc: "/original.png", modo: "aspecto", referenceRatio: 1 };
  const tree = harness.render(Box, props);
  harness.effects.forEach((effect) => effect());
  assert.equal(ratio, undefined);
  tree.props.onLoadCapture({ target: new ImageElement() });
  harness.render(Box, props);
  assert.equal(ratio.width, 200);
  assert.equal(ratio.height, 100);
  harness.render(Box, { ...props, imageSrc: "/other.png" });
  assert.equal(ratio, undefined);
});

test("closed sections do not mount media and retain state after the first opening", () => {
  const harness = hooks(null);
  const { SeccionColapsable } = loadModule("../src/components/wedding/SeccionColapsable.tsx", {
    react: { ...harness.react, useContext: () => null },
  });
  const props = { id: "photos", abiertaPorDefecto: false, children: react.createElement("img", { src: "/photo.png" }) };
  let tree = harness.render(SeccionColapsable, props);
  assert.equal(elements(tree).filter((e) => e.type === "img").length, 0);
  elements(tree).find((e) => e.type === "button").props.onClick();
  harness.render(SeccionColapsable, props);
  tree = harness.render(SeccionColapsable, props);
  assert.equal(elements(tree).filter((e) => e.type === "img").length, 1);
  elements(tree).find((e) => e.type === "button").props.onClick();
  tree = harness.render(SeccionColapsable, props);
  assert.equal(elements(tree).filter((e) => e.type === "img").length, 1);
  assert.equal(elements(tree).find((e) => e.props.id === "contenido-photos").props.inert, true);
});

test("carousel loads only the current photo and neighbours, preserving every slide and control", () => {
  const harness = hooks(null);
  const { SeccionCarrusel } = loadModule("../src/components/wedding/SeccionCarrusel.tsx", {
    react: harness.react,
    "@/lib/drive-image": { resolveDriveMediaSrc: (src) => src },
    "@/components/media/ImageTreatmentFrame": { default: ({ children }) => children },
  });
  const props = { items: Array.from({ length: 9 }, (_, i) => ({ id: String(i), imagen: `/photo-${i}.png` })) };
  let tree = harness.render(SeccionCarrusel, props);
  assert.deepEqual(elements(tree).filter((e) => e.type === "img").map((e) => e.props.src), ["/photo-0.png", "/photo-1.png"]);
  assert.equal(elements(tree).filter((e) => e.props["aria-roledescription"] === "diapositiva").length, 9);
  elements(tree).find((e) => e.props.onScroll).props.onScroll({ currentTarget: { clientWidth: 100, scrollLeft: 400 } });
  tree = harness.render(SeccionCarrusel, props);
  assert.deepEqual(elements(tree).filter((e) => e.type === "img").map((e) => e.props.src), ["/photo-3.png", "/photo-4.png", "/photo-5.png"]);
  assert.equal(elements(tree).filter((e) => e.props["aria-label"]?.startsWith("Ir a foto")).length, 9);
  const photo = elements(tree).find((e) => e.type === "img");
  photo.props.onError();
  assert.ok(elements(harness.render(SeccionCarrusel, props)).some((e) => e.type === "p" && e.props.children === "No se pudo cargar esta foto."));
});
