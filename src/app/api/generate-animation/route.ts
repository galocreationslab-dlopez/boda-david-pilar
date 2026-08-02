import { NextResponse } from "next/server";
import { generateLineAliveAnimation, LineAliveApiError } from "@/lib/linealive/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const detailRaw = formData.get("detail");

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debes enviar un archivo en el campo image.",
        },
        { status: 400 },
      );
    }

    const detail = typeof detailRaw === "string" ? detailRaw : undefined;
    const result = await generateLineAliveAnimation({ image, detail });

    return NextResponse.json(
      {
        ok: true,
        service: result.service,
        detail: result.detail,
        message: result.message,
        demo_html: result.demo_html,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof LineAliveApiError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado integrando LineAlive.",
      },
      { status: 500 },
    );
  }
}
