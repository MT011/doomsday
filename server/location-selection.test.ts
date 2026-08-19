import { describe, expect, it } from "vitest";
import { hasCompleteLocation } from "../client/src/lib/location-selection";

describe("seleção obrigatória de localização", () => {
  it("requer estado, cidade e cinema antes de liberar sessões", () => {
    expect(hasCompleteLocation("", "", "")).toBe(false);
    expect(hasCompleteLocation("SP", "", "")).toBe(false);
    expect(hasCompleteLocation("SP", "São Paulo", "")).toBe(false);
    expect(hasCompleteLocation("SP", "São Paulo", "Cine Exemplo")).toBe(true);
  });
});
