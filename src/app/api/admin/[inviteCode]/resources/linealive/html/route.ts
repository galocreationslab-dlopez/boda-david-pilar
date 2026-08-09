import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { downloadDriveFile } from "@/lib/google-drive";

export const runtime = "nodejs";

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
  body > * {
    margin: 0 !important;
  }
  svg, canvas, video, img {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId")?.trim() ?? "";
  if (!fileId) {
    return NextResponse.json({ error: "Falta fileId" }, { status: 400 });
  }

  try {
    const file = await downloadDriveFile(fileId);
    const html = new TextDecoder("utf-8").decode(new Uint8Array(file.buffer));
    const normalizedHtml = normalizeLineAliveHtml(html);
    return new NextResponse(new TextEncoder().encode(normalizedHtml), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la animacion" },
      { status: 500 },
    );
  }
}