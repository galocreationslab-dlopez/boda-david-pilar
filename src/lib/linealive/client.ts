export type LineAliveGenerateResult = {
  ok: boolean;
  service?: string;
  detail?: string;
  message?: string;
  animation_html?: string;
  demo_html?: string;
};

export class LineAliveApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LineAliveApiError";
    this.status = status;
  }
}

function resolveGenerateUrl() {
  const explicitGenerateUrl = process.env.LINEALIVE_GENERATE_URL?.trim();
  const baseUrl = process.env.LINEALIVE_API_BASE_URL?.trim();
  const candidate = explicitGenerateUrl || baseUrl;

  if (!candidate) {
    throw new LineAliveApiError(
      "Falta configurar LINEALIVE_API_BASE_URL o LINEALIVE_GENERATE_URL en variables de entorno.",
      500,
    );
  }

  if (candidate.includes("tu-servicio-linealive")) {
    throw new LineAliveApiError(
      "LINEALIVE_API_BASE_URL sigue con el valor de ejemplo. Configura la URL real de tu SaaS LineAlive.",
      500,
    );
  }

  if (explicitGenerateUrl) {
    return explicitGenerateUrl;
  }

  if (baseUrl?.endsWith("/generate")) {
    return baseUrl;
  }

  return `${baseUrl?.replace(/\/$/, "")}/generate`;
}

export async function generateLineAliveAnimation(options: {
  image: File;
  detail?: string;
}): Promise<LineAliveGenerateResult> {
  const formData = new FormData();
  formData.append("image", options.image, options.image.name);
  if (options.detail?.trim()) {
    formData.append("detail", options.detail.trim());
  }

  const authHeaderName = process.env.LINEALIVE_AUTH_HEADER_NAME?.trim();
  const authHeaderValue = process.env.LINEALIVE_AUTH_HEADER_VALUE?.trim();
  const headers = new Headers();
  if (authHeaderName && authHeaderValue) {
    headers.set(authHeaderName, authHeaderValue);
  }

  let response: Response;
  try {
    response = await fetch(resolveGenerateUrl(), {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store",
    });
  } catch {
    throw new LineAliveApiError(
      "No se pudo conectar con LineAlive. Revisa URL, disponibilidad del servicio y red.",
      502,
    );
  }

  const rawBody = await response.text();
  let payload: LineAliveGenerateResult;
  try {
    payload = JSON.parse(rawBody) as LineAliveGenerateResult;
  } catch {
    const contentType = response.headers.get("content-type") || "sin-content-type";
    const isHtml = /<html|<!doctype html/i.test(rawBody);
    const hint = isHtml
      ? " La URL parece devolver HTML (posible login/proxy), no JSON de /generate."
      : "";
    const detail = rawBody
      ? ` Respuesta: ${rawBody.slice(0, 180)}`
      : " Respuesta vacia del upstream.";
    throw new LineAliveApiError(
      `Respuesta invalida de LineAlive (status ${response.status}, content-type ${contentType}).${hint}${detail}`,
      502,
    );
  }

  if (!response.ok || !payload.ok) {
    throw new LineAliveApiError(payload.message || "Error generando animacion en LineAlive.", response.status || 502);
  }

  const animationHtml = typeof payload.animation_html === "string"
    ? payload.animation_html.trim()
    : typeof payload.demo_html === "string"
      ? payload.demo_html.trim()
      : "";

  if (!animationHtml) {
    throw new LineAliveApiError("LineAlive respondio sin animation_html. Revisa la integracion del servicio.", 502);
  }

  return {
    ...payload,
    animation_html: animationHtml,
    demo_html: animationHtml,
  };
}
