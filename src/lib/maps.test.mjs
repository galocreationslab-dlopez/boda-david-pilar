import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./portada-libre.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { getGoogleMapsEmbedUrl: embed, getGoogleMapsLinkUrl: link, normalizeMapsConfig, normalizePortadaLibre } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("supported navigation formats are normalized separately from embeds", () => {
  for (const url of [
    "https://maps.google.com/?q=Granada",
    "https://www.google.es/maps?q=Granada",
    "https://www.google.com/maps/search/?api=1&query=Granada",
    "https://www.google.com/maps/place/Beas+de+Granada/",
    "https://www.google.com/maps/dir/?api=1&destination=Granada",
    "https://www.google.com/maps?q=Granada&output=embed",
  ]) {
    assert.ok(link(url), url);
    assert.match(embed(url), /^https:\/\/www\.google\.com\/maps\?q=.+&output=embed$/);
  }
  assert.equal(link(" http://maps.google.com/?q=Granada "), "https://maps.google.com/?q=Granada");
  assert.equal(embed("https://www.google.com/maps/embed?pb=!1m18!2m3"), "https://www.google.com/maps/embed?pb=!1m18!2m3");
  assert.equal(embed("https://www.google.com/maps/place/Iglesia/data=!8m2!3d37.2!4d-3.5"), "https://www.google.com/maps?q=37.2%2C-3.5&output=embed");
});

test("short links preserve navigation without guessing the iframe location", () => {
  for (const url of ["https://maps.app.goo.gl/abc123", "https://goo.gl/maps/abc123"]) {
    assert.equal(link(url), url);
    assert.equal(embed(url), undefined);
  }
  assert.equal(embed("https://www.google.com/maps/@37,-3,15z"), undefined);
});

test("rejects arbitrary HTML, hosts, credentials, ports and protocols", () => {
  for (const url of [
    '<iframe src="https://www.google.com/maps/embed?pb=!1m18"></iframe>',
    "javascript:alert(1)", "https://evil.com/maps?q=Granada",
    "https://google.com.evil.com/maps?q=Granada", "https://evil.google.com/maps?q=Granada",
    "https://user@www.google.com/maps?q=Granada", "https://www.google.com:444/maps?q=Granada",
    "https://www.google.com/not-maps?q=Granada", "https://goo.gl/abc123", "not a URL",
    "https://maps.app.goo.gl/%3Ciframe%3E",
  ]) {
    assert.equal(link(url), undefined, url);
    assert.equal(embed(url), undefined, url);
  }
  assert.equal(embed("https://www.google.com/maps/embed?pb=invalid"), undefined);
  assert.equal(embed("https://www.google.com/maps/embed?pb=!garbage"), undefined);
  assert.equal(embed("https://www.google.com/maps/embed?pb=!1m18!2s%3Cscript%3E"), undefined);
});

test("normalization and JSON save/reload preserve links, action and mobile/PC sizes", () => {
  const image = { id: "cover", tipo: "imagen", enlaceUrl: "https://example.com", enlaceMaps: " http://maps.google.com/?q=Granada ", accionImagen: "enlace" };
  const event = { id: "church", enlaceMaps: "https://maps.app.goo.gl/abc123", enlaceMapsEmbed: "https://www.google.com/maps?q=Granada", logoTamano: { movil: 24, pc: 180 } };
  const config = { diseno: { secciones: [{ portadaLibre: { elementos: [image] } }, { items: [event] }] } };
  assert.equal(normalizeMapsConfig(config), undefined);
  const reloaded = JSON.parse(JSON.stringify(config));
  assert.equal(reloaded.diseno.secciones[0].portadaLibre.elementos[0].enlaceUrl, "https://example.com");
  assert.equal(normalizePortadaLibre(reloaded.diseno.secciones[0].portadaLibre).elementos[0].accionImagen, "enlace");
  assert.equal(image.enlaceMaps, "https://maps.google.com/?q=Granada");
  assert.deepEqual(reloaded.diseno.secciones[1].items[0].logoTamano, { movil: 24, pc: 180 });
  image.enlaceMaps = "";
  event.enlaceMaps = "";
  event.enlaceMapsEmbed = "";
  assert.equal(normalizeMapsConfig(config), undefined);
  assert.equal(JSON.parse(JSON.stringify(config)).diseno.secciones[1].items[0].enlaceMaps, "");
  assert.match(normalizeMapsConfig({ timeline: [{ enlaceMaps: "https://evil.com/maps" }] }), /no valida/);
  assert.match(normalizeMapsConfig({ enlaceMapsEmbed: "https://maps.app.goo.gl/abc123" }), /embebible no valida/);
  assert.match(normalizeMapsConfig({ enlaceMaps: 42 }), /debe ser/);
});
