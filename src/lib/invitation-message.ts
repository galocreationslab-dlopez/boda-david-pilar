export type InvitationMessageConfig = {
  texto: string;
  posicionEnlace: "principio" | "final";
};

export const DEFAULT_INVITATION_MESSAGE: InvitationMessageConfig = {
  texto: "",
  posicionEnlace: "final",
};

export function composeInvitationMessage(url: string, config: InvitationMessageConfig): string {
  if (!config.texto.trim()) return url;
  return config.posicionEnlace === "principio"
    ? `${url}\n\n${config.texto}`
    : `${config.texto}\n\n${url}`;
}
