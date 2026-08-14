import { describe, expect, it } from "vitest";
import { formatCpfInput, formatPhoneInput } from "../shared/input-masks";

describe("máscaras de preenchimento", () => {
  it("formata CPF de modo progressivo e limita a 11 dígitos", () => {
    expect(formatCpfInput("123")).toBe("123");
    expect(formatCpfInput("1234567")).toBe("123.456.7");
    expect(formatCpfInput("12345678901")).toBe("123.456.789-01");
    expect(formatCpfInput("123.456.789-01999")).toBe("123.456.789-01");
  });

  it("formata celular com DDD de modo progressivo e limita a 11 dígitos", () => {
    expect(formatPhoneInput("12")).toBe("(12");
    expect(formatPhoneInput("1234567")).toBe("(12) 3456-7");
    expect(formatPhoneInput("12345678910")).toBe("(12) 34567-8910");
    expect(formatPhoneInput("(12) 34567-89109")).toBe("(12) 34567-8910");
  });
});
