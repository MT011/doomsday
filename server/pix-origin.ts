export const OFFICIAL_PIX_CALLBACK_ORIGIN = "https://www.prevendadoomsday.com.br";

export function resolvePublicOrigin(configuredOrigin = process.env.AMPLOPAY_CALLBACK_ORIGIN) {
  return configuredOrigin || OFFICIAL_PIX_CALLBACK_ORIGIN;
}

export function getPublicOrigin(req: { headers: { origin?: string | string[] } }) {
  const configuredOrigin = resolvePublicOrigin();

  let configuredUrl: URL;
  try {
    configuredUrl = new URL(configuredOrigin);
  } catch {
    throw new Error("A origem pública configurada para o callback PIX é inválida.");
  }
  if (configuredUrl.protocol !== "https:" || configuredUrl.pathname !== "/" || configuredUrl.search || configuredUrl.hash) {
    throw new Error("A origem pública configurada para o callback PIX deve ser uma origem HTTPS simples.");
  }

  if (typeof req.headers.origin === "string") {
    try {
      if (new URL(req.headers.origin).origin !== configuredUrl.origin) {
        throw new Error("A origem do checkout não corresponde ao domínio público configurado.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("não corresponde")) throw error;
      throw new Error("A origem do checkout é inválida.");
    }
  }
  return configuredUrl.origin;
}
