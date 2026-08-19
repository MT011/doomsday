import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

describe("verificação de domínio da Meta", () => {
  it("expõe a meta tag de verificação oficial no head", () => {
    expect(indexHtml).toContain(
      '<meta name="facebook-domain-verification" content="3l53mhv87wwp9ou757lwhzz3ywrfd2" />',
    );
  });
});
