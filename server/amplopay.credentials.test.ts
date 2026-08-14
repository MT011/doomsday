import { describe, expect, it } from "vitest";
import { validateAmploPayCredentials } from "./amplopay";

describe("AmploPay credentials", () => {
  it("validates the configured server credentials through the producer endpoint", async () => {
    expect(process.env.AMPLOPAY_PIX_ENABLED).toBe("true");
    expect(process.env.AMPLOPAY_CALLBACK_ORIGIN).toBe("https://doomsdaypf-q7jmpgef.manus.space");
    const credential = await validateAmploPayCredentials();
    expect(Array.isArray(credential.permissions) || credential.grantAllPermissions).toBe(true);
    expect(credential.expiresAt === null || typeof credential.expiresAt === "string").toBe(true);
  }, 20_000);
});
