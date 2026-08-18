import { createApp } from "../server/app";

/**
 * Entrada de função para a Vercel. O catch-all preserva o prefixo `/api`,
 * permitindo que Express atenda `/api/trpc` e `/api/amplopay/webhook`.
 */
export default createApp();
