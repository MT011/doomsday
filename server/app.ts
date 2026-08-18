import express from "express";
import { createExpressMiddleware, type CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { registerAmploPayWebhook } from "./amplopay-webhook.js";
import { publicApiRouter, type PublicApiContext } from "./public-api-router.js";

function createPublicContext({ req, res }: CreateExpressContextOptions): PublicApiContext {
  return { req, res, user: null };
}

/**
 * Configura as rotas HTTP sem abrir uma porta. Isso permite o mesmo app no
 * servidor local e como função Express na Vercel.
 */
export function createApp() {
  const app = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerAmploPayWebhook(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: publicApiRouter,
      createContext: createPublicContext,
    })
  );

  return app;
}
