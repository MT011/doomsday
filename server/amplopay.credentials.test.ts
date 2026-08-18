import { describe, expect, it } from "vitest";
import { validateAmploPayCredentials } from "./amplopay";

describe("AmploPay credentials", () => {
  it.skipIf(!process.env.AMPLOPAY_PIX_ENABLED)(
    "requires protected credentials, live PIX activation and a public callback origin",
    () => {
      expect(process.env.AMPLOPAY_PIX_ENABLED).toBe("true");
      expect(process.env.AMPLOPAY_CALLBACK_ORIGIN).toBe("https://www.prevendadoomsday.com.br");
      expect(process.env.AMPLOPAY_PUBLIC_KEY).toBeTruthy();
      expect(process.env.AMPLOPAY_SECRET_KEY).toBeTruthy();
    }
  );

  it.skipIf(process.env.AMPLOPAY_RUN_EXTERNAL_CREDENTIAL_TEST !== "true")(
    "validates the configured server credentials through the producer endpoint",
    async () => {
      const credential = await validateAmploPayCredentials();
      expect(Array.isArray(credential.permissions) || credential.grantAllPermissions).toBe(true);
      expect(credential.expiresAt === null || typeof credential.expiresAt === "string").toBe(true);
    },
    20_000
  );
});
