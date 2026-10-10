import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import ts from "typescript";

function load(path, imports = {}, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports, URL, structuredClone, Map, Set, Date, Buffer, AbortSignal, ...globals,
    require(id) { assert.ok(id in imports, `Unexpected import: ${id}`); return imports[id]; },
  });
  return exports;
}
const pure = load("../src/lib/resource-publication.ts");
const driveUrl = (id) => `https://drive.google.com/file/d/${id}/view`;
const config = {
  slug: "wedding",
  logo: driveUrl("seal"),
  compartir: { imagenUrl: driveUrl("share") },
  tema: { paletas: [{ colores: { fondo: { texturaUrl: driveUrl("texture") } } }] },
  diseno: { secciones: [
    { tipo: "intro", intro: { lacreUrl: driveUrl("wax"), pc: { envelope: { selloSecoUrl: driveUrl("dry") } } } },
    { tipo: "portadaLibre", portadaLibre: { elementos: [
      { tipo: "imagen", url: driveUrl("painting"), enlaceUrl: driveUrl("document") },
      { tipo: "texto", url: driveUrl("not-an-image") },
    ] }, fondos: { seccion: driveUrl("background") } },
    { tipo: "carrusel", items: [{ imagen: driveUrl("photo") }, { imagen: "/api/resources/preview?src=" + encodeURIComponent(driveUrl("painting")) }] },
  ] },
};

test("collects all configured media across devices, intro, palettes, carousel and metadata, without links or duplicates", () => {
  assert.deepEqual(Array.from(pure.selectedResources(config), (r) => r.fileId).sort(),
    ["background", "dry", "painting", "photo", "seal", "share", "texture", "wax"]);
  assert.equal(pure.resourceDriveId("https://example.org/?id=painting"), null);
  assert.equal(pure.resourceDriveId("https://drive.google.com.evil.test/file/d/painting/view"), null);
  assert.equal(pure.resourceDriveId("/api/media/drive?fileId=painting"), "painting");
});

test("published resolution preserves original configuration, hyperlinks and unselected sources", () => {
  const blob = "https://test.public.blob.vercel-storage.com/painting.png";
  const result = pure.resolvePublishedResources(config, new Map([["painting", blob]]));
  assert.equal(result.diseno.secciones[1].portadaLibre.elementos[0].url, blob);
  assert.equal(result.diseno.secciones[2].items[1].imagen, blob);
  assert.equal(config.diseno.secciones[1].portadaLibre.elementos[0].url, driveUrl("painting"));
  assert.equal(result.diseno.secciones[1].portadaLibre.elementos[0].enlaceUrl, driveUrl("document"));
  assert.equal(result.logo, config.logo);
  assert.ok(pure.isPublicBlobUrl(blob));
  assert.equal(pure.isPublicBlobUrl("https://test.public.blob.vercel-storage.com.evil.test/a"), false);
  assert.equal(pure.isPublicBlobUrl("http://test.public.blob.vercel-storage.com/a"), false);
});

test("version includes checksum, size and modified time; unverifiable or non-image sources fail explicitly", () => {
  const metadata = { name: "painting.png", mimeType: "image/png", size: "10", md5Checksum: "a".repeat(32), modifiedTime: "2026-10-10" };
  assert.match(pure.resourceVersion(metadata), /^a{32}:10:2026-10-10$/);
  assert.notEqual(pure.resourceVersion(metadata), pure.resourceVersion({ ...metadata, modifiedTime: "2026-10-11" }));
  for (const invalid of [{ ...metadata, mimeType: "text/html" }, { ...metadata, md5Checksum: undefined }, { ...metadata, size: "0" }]) {
    assert.throws(() => pure.resourceVersion(invalid), /checksum verificables/);
  }
});

test("published share images retain the optimized OG route and load from Blob without accessing Drive", async () => {
  const blob = "https://test.public.blob.vercel-storage.com/share.png";
  const drive = load("../src/lib/drive-image.ts");
  const share = load("../src/lib/share-metadata.ts", {
    "@/lib/drive-image": drive, "@/lib/resource-publication": pure,
  });
  assert.equal(share.resolveShareImageUrl({ compartir: { imagenUrl: blob } }),
    `/api/resources/preview?src=${encodeURIComponent(blob)}&og=1`);
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  let fetched;
  const images = load("../src/lib/og-image.ts", {
    react: { createElement() {} },
    "@/lib/google-drive": { downloadDriveFile() { assert.fail("Published images must not access Drive"); } },
    "@/lib/drive-image": drive, "@/lib/resource-publication": pure, "@/lib/share-metadata": share,
  }, {
    fetch: async (url) => { fetched = String(url); return new Response(bytes, { headers: { "content-type": "image/png" } }); },
  });
  const image = await images.loadImageSource(blob, "https://local.test");
  assert.equal(fetched, blob);
  assert.deepEqual(image.buffer, bytes);
  assert.equal(image.contentType, "image/png");
  await assert.rejects(images.loadImageSource("https://arbitrary.test/a.png", "https://local.test"), /no soportado/);
});

function harness(options = {}) {
  const original = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 16, 255, 128, 1, 2, 3]);
  const metadata = {
    name: "painting.png", mimeType: "image/png", size: String(original.length),
    md5Checksum: crypto.createHash("md5").update(original).digest("hex"), modifiedTime: "2026-10-10T12:00:00Z",
  };
  const rows = new Map();
  const blobs = new Map();
  const logs = [];
  const uploads = [];
  const deletions = [];
  let failSave = false;
  let metadataCalls = 0;
  const supabase = {
    from(table) {
      const filters = new Map();
      let patch;
      const result = (single = false) => {
        if (table === "bodas") return { data: { id: "wedding-id" }, error: null };
        if (options.missingTable) return { data: null, error: { code: "42P01", message: "missing" } };
        const matches = [...rows.values()].filter((r) => [...filters].every(([key, val]) => r[key] === val));
        if (patch) {
          if (failSave && patch.blob_url) return { data: null, error: { message: "database unavailable" } };
          matches.forEach((row) => Object.assign(row, patch));
          if (options.lostCommitResponse && patch.blob_url) return { data: null, error: { message: "lost response" } };
        }
        return { data: single ? matches[0] ?? null : matches, error: null };
      };
      const query = {
        select() { return query; }, eq(key, value) { filters.set(key, value); return query; },
        update(value) { patch = value; return query; }, maybeSingle: async () => result(true),
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      };
      return query;
    },
    async rpc(_name, params) {
      let row = rows.get(params.p_drive_file_id);
      if (!row) {
        row = { wedding_id: "wedding-id", drive_file_id: params.p_drive_file_id, name: "" };
        rows.set(row.drive_file_id, row);
      }
      if (row.lease_token) return { data: false, error: null };
      row.lease_token = params.p_lease_token;
      row.lease_expires_at = new Date(Date.now() + 330000).toISOString();
      return { data: true, error: null };
    },
  };
  class BlobNotFoundError extends Error {}
  const server = load("../src/lib/resource-publication-server.ts", {
    "node:crypto": crypto, "node:stream": { Readable },
    "@vercel/blob": {
      BlobNotFoundError,
      async put(path, body, uploadOptions) {
        assert.equal(uploadOptions.access, "public");
        assert.equal(uploadOptions.multipart, true);
        assert.equal(uploadOptions.addRandomSuffix, true);
        const parts = [];
        for await (const chunk of body) parts.push(Buffer.from(chunk));
        const data = Buffer.concat(parts);
        uploads.push({ path, data });
        const url = `https://test.public.blob.vercel-storage.com/${path}-${uploads.length}`;
        blobs.set(url, options.corruptBlob ? Buffer.from("wrong") : data);
        return { url };
      },
      async head(url) {
        if (!blobs.has(url)) throw new BlobNotFoundError();
        return { size: blobs.get(url).length };
      },
      async del(url) { deletions.push(url); blobs.delete(url); },
    },
    "@/lib/supabase/server": { createServerClient: () => supabase },
    "@/lib/google-drive": {
      async getDriveFileMetadata() {
        metadataCalls++;
        return options.editDuringUpload && metadataCalls > 1 ? { ...metadata, modifiedTime: "later" } : { ...metadata };
      },
      async streamDriveFile() { return new Response(options.corruptDrive ? Buffer.from("wrong") : original).body; },
    },
    "@/lib/resource-publication": pure,
  }, {
    process: { env: options.noToken ? {} : { BLOB_READ_WRITE_TOKEN: "test-only-token" } },
    console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    fetch: async (url) => new Response(blobs.get(url) ?? "", { status: blobs.has(url) ? 200 : 404 }),
  });
  return { server, rows, blobs, logs, uploads, deletions, original, metadata, setFailSave: () => { failSave = true; } };
}
const oneImage = { slug: "wedding", logo: driveUrl("painting") };

test("publishes byte-exact originals, persists metadata, resolves public URLs and reuses unchanged copies", async () => {
  const h = harness();
  const first = await h.server.publishResource(oneImage, "painting");
  assert.equal(first.reused, false);
  assert.deepEqual(h.uploads[0].data, h.original);
  assert.equal(h.rows.get("painting").sha256, crypto.createHash("sha256").update(h.original).digest("hex"));
  assert.equal(h.rows.get("painting").lease_token, null);
  assert.equal((await h.server.withPublishedResources(oneImage)).logo, first.item.publishedUrl);
  assert.equal(oneImage.logo, driveUrl("painting"));
  assert.equal((await h.server.publishResource(oneImage, "painting")).reused, true);
  assert.equal(h.uploads.length, 1);
  h.metadata.modifiedTime = "2026-10-11T12:00:00Z";
  const replacement = await h.server.publishResource(oneImage, "painting");
  assert.notEqual(replacement.item.publishedUrl, first.item.publishedUrl);
  assert.equal(h.blobs.has(first.item.publishedUrl), true, "Previous versions must not be deleted");
});

test("deleted Blob copies are republished instead of silently reusing broken URLs", async () => {
  const h = harness();
  const first = await h.server.publishResource(oneImage, "painting");
  h.blobs.delete(first.item.publishedUrl);
  const replacement = await h.server.publishResource(oneImage, "painting");
  assert.equal(replacement.reused, false);
  assert.equal(h.uploads.length, 2);
});

for (const option of ["corruptDrive", "corruptBlob", "editDuringUpload"]) {
  test(`${option}: no invalid URL is activated, failed uploads are cleaned up and errors persist`, async () => {
    const h = harness({ [option]: true });
    await assert.rejects(h.server.publishResource(oneImage, "painting"));
    const row = h.rows.get("painting");
    assert.equal(row.blob_url, undefined);
    assert.ok(row.last_error);
    assert.equal(row.lease_token, null);
    assert.equal(h.deletions.length, 1);
    assert.equal(h.blobs.size, 0);
    assert.equal((await h.server.listResourcePublications(oneImage))[0].status, "error");
  });
}

test("failed database activation retains previous verified copies and deletes only the unregistered upload", async () => {
  const h = harness();
  const first = await h.server.publishResource(oneImage, "painting");
  h.metadata.modifiedTime = "2026-10-11T12:00:00Z";
  h.setFailSave();
  await assert.rejects(h.server.publishResource(oneImage, "painting"), /database unavailable/);
  assert.equal(h.rows.get("painting").blob_url, first.item.publishedUrl);
  assert.equal(h.blobs.has(first.item.publishedUrl), true);
  assert.equal(h.deletions.length, 1);
  assert.equal((await h.server.withPublishedResources(oneImage)).logo, first.item.publishedUrl);
});

test("missing setup, unselected IDs and concurrent publication return explicit errors", async () => {
  await assert.rejects(harness({ noToken: true }).server.publishResource(oneImage, "painting"), /BLOB_READ_WRITE_TOKEN/);
  await assert.rejects(harness().server.publishResource(oneImage, "other"), /contenido guardado/);
  const h = harness();
  h.rows.set("painting", { wedding_id: "wedding-id", drive_file_id: "painting", lease_token: "another-request" });
  await assert.rejects(h.server.publishResource(oneImage, "painting"), (error) => error.status === 409);
  const missing = harness({ missingTable: true });
  await assert.rejects(missing.server.listResourcePublications(oneImage), (error) => error.status === 503);
  assert.equal((await missing.server.withPublishedResources(oneImage)).logo, oneImage.logo);
  assert.equal(missing.logs.length, 1, "Missing migration is explicitly logged on public rendering");
});

test("a lost database commit response never causes deletion of an already active URL", async () => {
  const h = harness({ lostCommitResponse: true });
  await assert.rejects(h.server.publishResource(oneImage, "painting"), /lost response/);
  assert.ok(h.rows.get("painting").blob_url);
  assert.equal(h.blobs.has(h.rows.get("painting").blob_url), true);
  assert.equal(h.deletions.length, 0);
});

test("aborted transfers do not activate or buffer an original", async () => {
  const h = harness();
  const controller = new AbortController();
  controller.abort(new Error("cancelled"));
  await assert.rejects(h.server.uploadVerifiedOriginal("wedding-id", "painting", h.metadata, controller.signal), /cancelled/);
  assert.equal(h.blobs.size, 0);
  assert.equal(h.uploads.length, 0);
});

function panelHarness({ storageConfigured = true, saveOk = true, failFile = null } = {}) {
  const states = [];
  let cursor = 0;
  const effects = [];
  const busyChanges = [];
  const events = [];
  const items = ["painting", "photo"].map((fileId) => ({
    fileId, name: `${fileId}.png`, source: driveUrl(fileId), status: "pending", publishedUrl: null, error: null,
  }));
  const panel = load("../src/components/admin/ResourcePublicationPanel.tsx", {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
      },
      useCallback: (callback) => callback,
      useEffect: (effect) => effects.push(effect),
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  }, {
    AbortController,
    fetch: async (_url, init = {}) => {
      if (init.method !== "POST") return Response.json({ items: structuredClone(items), storageConfigured });
      const { fileId } = JSON.parse(init.body);
      events.push(fileId);
      if (fileId === failFile) return Response.json({ error: "Upload failed" }, { status: 500 });
      const item = items.find((entry) => entry.fileId === fileId);
      const reused = item.status === "published";
      Object.assign(item, { status: "published", publishedUrl: `https://test.public.blob.vercel-storage.com/${fileId}` });
      return Response.json({ item, reused });
    },
  });
  const render = () => {
    cursor = 0;
    return panel.default({
      inviteCode: "test", disabled: false,
      beforePublish: async () => { events.push("save"); return saveOk; },
      onBusyChange: (value) => busyChanges.push(value),
    });
  };
  function findButton(node) {
    if (!node || typeof node !== "object") return null;
    if (node.type === "button") return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const found = findButton(child);
      if (found) return found;
    }
    return null;
  }
  render();
  const mountedEffects = [...effects];
  mountedEffects.forEach((effect) => effect());
  return { render, events, states, busyChanges, async click() {
    findButton(render()).props.onClick();
    for (let tries = 0; tries < 100 && busyChanges.at(-1) !== false; tries++) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(busyChanges.at(-1), false, "Publication must settle");
  } };
}

test("button saves selection before uploads, reports progress/results and reuses copies on retry", async () => {
  const h = panelHarness();
  await new Promise((resolve) => setImmediate(resolve));
  await h.click();
  assert.deepEqual(h.events, ["save", "painting", "photo"]);
  assert.deepEqual(h.busyChanges, [true, false]);
  assert.match(JSON.stringify(h.render()), /2 publicados, 0 reutilizados y 0 fallidos/);
  await h.click();
  assert.match(JSON.stringify(h.render()), /0 publicados, 2 reutilizados y 0 fallidos/);
});

test("button shows per-file failures and allows later resources to complete", async () => {
  const h = panelHarness({ failFile: "painting" });
  await h.click();
  assert.match(JSON.stringify(h.render()), /1 publicados, 0 reutilizados y 1 fallidos/);
  assert.match(JSON.stringify(h.render()), /Upload failed/);
  assert.match(JSON.stringify(h.render()), /Reintentar publicacion/);
});

test("missing storage or failed content save prevents uploads and surfaces the cause", async () => {
  for (const options of [{ storageConfigured: false }, { saveOk: false }]) {
    const h = panelHarness(options);
    await h.click();
    assert.ok(!h.events.includes("painting"));
    assert.match(JSON.stringify(h.render()), /role":"alert/);
  }
});

test("API authenticates GET and POST, rejects invalid JSON/IDs and never accepts arbitrary remote URLs", async () => {
  let authorized = false;
  let calls = 0;
  const route = load("../src/app/api/admin/[inviteCode]/resources/publish/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/admin-auth": { validateAdminCode: async () => authorized },
    "@/lib/wedding-config-server": { getWeddingConfig: async () => oneImage },
    "@/lib/resource-publication-server": {
      ResourcePublicationError: class extends Error {},
      listResourcePublications: async () => { calls++; return []; },
      publishResource: async () => { calls++; return { item: {}, reused: false }; },
    },
  }, { Response, process: { env: {} }, console });
  const params = { params: Promise.resolve({ inviteCode: "test" }) };
  assert.equal((await route.GET(new Request("https://local.test"), params)).status, 403);
  assert.equal((await route.POST(new Request("https://local.test", { method: "POST", body: "{}" }), params)).status, 403);
  assert.equal(calls, 0);
  authorized = true;
  for (const body of ["bad json", "{}", '{"fileId":"https://evil.test"}']) {
    assert.equal((await route.POST(new Request("https://local.test", { method: "POST", body }), params)).status, 400);
  }
  assert.equal(calls, 0);
  assert.equal((await route.GET(new Request("https://local.test"), params)).status, 200);
});
