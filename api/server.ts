// @ts-expect-error — pre-bundled by esbuild during build step, no .d.ts
import app from "../dist/api-handler.js";

export default app;

export const config = {
  api: {
    bodyParser: false,
  },
};
