import { NextResponse } from "next/server";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import { downloadDriveFile } from "@/lib/google-drive";
import { collectLineAliveHtmlDriveFileIds } from "@/lib/linealive/utils";

export const runtime = "nodejs";

// En Windows (dev) el filesystem ignora mayúsculas/minúsculas; en Vercel (Linux) no.
// Si la ruta exacta no existe, busca una coincidencia case-insensitive antes de fallar.
async function resolveCaseInsensitivePath(absolutePath: string): Promise<string> {
  try {
    await readFile(absolutePath);
    return absolutePath;
  } catch {
    const dir = path.dirname(absolutePath);
    const target = path.basename(absolutePath).toLowerCase();
    const entries = await readdir(dir);
    const match = entries.find((entry) => entry.toLowerCase() === target);
    if (!match) throw new Error("not found");
    return path.join(dir, match);
  }
}

function normalizeLineAliveHtml(html: string): string {
  if (html.includes("linealive-embed-normalize")) {
    return html;
  }

  const injection = `
<style id="linealive-embed-normalize">
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    background: transparent !important;
  }
  #controls,
  #replay {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  #wrap {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    gap: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
    background: transparent !important;
  }
  #stage {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    aspect-ratio: auto !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  #stage svg,
  #stage img,
  svg,
  canvas,
  video,
  img {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }
  body > * {
    margin: 0 !important;
  }
</style>
<script id="linealive-embed-normalize-script">
  (function () {
    var apply = function () {
      if (!document.body) return;
      var root = document.body.firstElementChild;
      if (root) {
        root.style.position = "fixed";
        root.style.inset = "0";
        root.style.width = "100%";
        root.style.height = "100%";
        root.style.margin = "0";
        root.style.maxWidth = "none";
        root.style.maxHeight = "none";
        root.style.overflow = "hidden";
        root.style.background = "transparent";
      }
      var stage = document.getElementById("stage");
      if (stage) {
        stage.style.background = "transparent";
        stage.style.boxShadow = "none";
      }
      var replayButton = document.getElementById("replay");
      if (replayButton) {
        replayButton.style.display = "none";
      }
      var controls = document.getElementById("controls");
      if (controls) {
        controls.style.display = "none";
      }
      var svgs = document.querySelectorAll("svg");
      for (var i = 0; i < svgs.length; i += 1) {
        svgs[i].setAttribute("preserveAspectRatio", "xMidYMid slice");
        svgs[i].setAttribute("width", "100%");
        svgs[i].setAttribute("height", "100%");
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", apply, { once: true });
    } else {
      apply();
    }
    window.addEventListener("resize", apply);
    var mo = new MutationObserver(apply);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  })();
</script>`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${injection}`);
  }

  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}<head>${injection}</head>`);
  }

  return `<!doctype html><html><head>${injection}</head><body>${html}</body></html>`;
}

function normalizePublicLineAlivePath(rawPath: string): string | null {
  const value = rawPath.trim();
  if (!value) return null;

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  if (withLeadingSlash.includes("..")) return null;
  if (!/^\/LineAlive\/[a-zA-Z0-9_./-]+\.html?$/i.test(withLeadingSlash)) return null;

  return withLeadingSlash;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId")?.trim() ?? "";
  const publicPath = normalizePublicLineAlivePath(url.searchParams.get("path")?.trim() ?? "");

  if (!fileId && !publicPath) {
    return NextResponse.json({ error: "Falta fileId o path" }, { status: 400 });
  }

  if (publicPath) {
    try {
      const absolutePath = await resolveCaseInsensitivePath(
        path.join(/* turbopackIgnore: true */ process.cwd(), "public", publicPath.replace(/^\//, "")),
      );
      const html = await readFile(absolutePath, "utf-8");
      const normalizedHtml = normalizeLineAliveHtml(html);
      return new NextResponse(new TextEncoder().encode(normalizedHtml), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch {
      return NextResponse.json({ error: "Archivo HTML no encontrado" }, { status: 404 });
    }
  }

  const config = await getWeddingConfig();
  const allowedIds = collectLineAliveHtmlDriveFileIds(config);
  if (!allowedIds.has(fileId)) {
    return NextResponse.json({ error: "Archivo no autorizado" }, { status: 404 });
  }

  try {
    const file = await downloadDriveFile(fileId);
    const html = new TextDecoder("utf-8").decode(new Uint8Array(file.buffer));
    const normalizedHtml = normalizeLineAliveHtml(html);
    return new NextResponse(new TextEncoder().encode(normalizedHtml), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la animacion" },
      { status: 500 },
    );
  }
}