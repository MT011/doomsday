import { describe, expect, it } from "vitest";
import { getBottomUpSeatRows } from "../client/src/lib/seat-map-orientation";

describe("orientação do mapa de assentos", () => {
  it("exibe as fileiras do fundo em direção à tela sem alterar a lista original", () => {
    const rows = ["A", "B", "C", "D"];

    expect(getBottomUpSeatRows(rows)).toEqual(["D", "C", "B", "A"]);
    expect(rows).toEqual(["A", "B", "C", "D"]);
  });
});
