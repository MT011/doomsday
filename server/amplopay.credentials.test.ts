import { describe, expect, it } from "vitest";
import { validateAmploPayCredentials } from "./amplopay";

describe("AmploPay credentials", () => {
  it("validates the configured server credentials through the producer endpoint", async () => {
    const credential = await validateAmploPayCredentials();
    expect(Array.isArray(credential.permissions) || credential.grantAllPermissions).toBe(true);
    expect(credential.expiresAt === null || typeof credential.expiresAt === "string").toBe(true);
  }, 20_000);
});
