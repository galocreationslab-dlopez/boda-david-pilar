import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./section-chains.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { buildSectionGroups, normalizeSectionChains, preserveSectionChainNeighbors, getPublicSectionGroups, getSectionAnchor, getLegacySectionAnchor, getPublicPieSection } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const section = (id, extra = {}) => ({
  id, tipo: "carrusel", nombre: id, titulo: id, visible: true, perfiles: ["publico"], items: [], paletaId: "", ...extra,
});
const ids = (groups) => groups.map((group) => group.sections.map((entry) => entry.id));

test("repeated section types have stable distinct anchors and legacy aliases", () => {
  const first = section("first", { tipo: "historia" });
  const second = section("second", { tipo: "historia" });
  assert.notEqual(getSectionAnchor(first), getSectionAnchor(second));
  assert.equal(getLegacySectionAnchor(first), "historia");
  assert.equal(getSectionAnchor(section("cover", { tipo: "portadaLibre" })), "portada-cover");
});

test("legacy sections remain independent; consecutive flags form one group", () => {
  const sections = [section("one"), section("two"), section("three"), section("four")];
  assert.deepEqual(ids(buildSectionGroups(sections)), [["one"], ["two"], ["three"], ["four"]]);
  const chain = sections.map((entry, index) => ({ ...entry, encadenarAnterior: index > 0 }));
  assert.deepEqual(ids(buildSectionGroups(chain)), [["one", "two", "three", "four"]]);
  chain[2].encadenarAnterior = false;
  assert.deepEqual(ids(buildSectionGroups(chain)), [["one", "two"], ["three", "four"]]);
});

test("intro and headerless heads cannot start chains", () => {
  for (const head of [section("intro", { tipo: "intro" }), section("invite", { tipo: "invitacion" }), section("cover", { tipo: "portadaLibre", portadaLibre: { colapsable: false } })]) {
    assert.deepEqual(ids(buildSectionGroups([head, section("child", { encadenarAnterior: true })])), [[head.id], ["child"]]);
  }
  assert.equal(normalizeSectionChains([section("first", { encadenarAnterior: true })])[0].encadenarAnterior, false);
});

test("access filtering never changes group membership or expands profiles", () => {
  const sections = [section("public"), section("private", { perfiles: ["familia"] }), section("child", { encadenarAnterior: true })];
  assert.deepEqual(ids(getPublicSectionGroups(sections)), [["public"]]);
  const mixed = [section("head"), section("private-child", { encadenarAnterior: true, perfiles: ["familia"] }), section("hidden", { encadenarAnterior: true, visible: false, menuDirecto: true }), section("public-child", { encadenarAnterior: true })];
  assert.deepEqual(ids(getPublicSectionGroups(mixed)), [["head", "public-child"]]);
});

test("deleting or moving sections cuts changed neighbor links without losing content", () => {
  const original = [section("before"), section("head"), section("child", { encadenarAnterior: true, distanciaSiguiente: { movil: 32, pc: 64 } }), section("tail", { encadenarAnterior: true })];
  const deleted = preserveSectionChainNeighbors(original, original.filter((entry) => entry.id !== "head"));
  assert.deepEqual(ids(buildSectionGroups(deleted)), [["before"], ["child", "tail"]]);
  const moved = preserveSectionChainNeighbors(original, [original[0], original[2], original[1], original[3]]);
  assert.deepEqual(ids(buildSectionGroups(moved)), [["before"], ["child"], ["head"], ["tail"]]);
  assert.deepEqual(deleted[1].distanciaSiguiente, { movil: 32, pc: 64 });
  assert.deepEqual(normalizeSectionChains(JSON.parse(JSON.stringify(deleted))), deleted);
});

test("pie section never chains and stays its own group even if flagged otherwise", () => {
  const pie = section("footer", { tipo: "pie", encadenarAnterior: true });
  const sections = [section("one"), pie, section("child", { encadenarAnterior: true })];
  assert.deepEqual(ids(buildSectionGroups(sections)), [["one"], ["footer"], ["child"]]);
  assert.equal(normalizeSectionChains(sections).find((s) => s.id === "footer").encadenarAnterior, false);
  assert.deepEqual(ids(buildSectionGroups([pie, section("after", { encadenarAnterior: true })])), [["footer"], ["after"]]);
  assert.equal(getSectionAnchor(pie), "pie");
  assert.equal(getLegacySectionAnchor(pie), "pie");
  assert.equal(getPublicPieSection(sections).id, "footer");
  assert.equal(getPublicPieSection([section("one")]), undefined);
});