import { describe, expect, it } from "vitest";
import { clampSeatMapPan, getMapGestureIntent, shouldGoBackWithEdgeSwipe } from "../client/src/lib/mobile-gestures";

describe("gestos móveis do fluxo de assentos", () => {
  it("deixa o deslocamento vertical disponível para rolar a página e reserva o arrasto horizontal ao mapa", () => {
    expect(getMapGestureIntent({ deltaX: 3, deltaY: 3, pointerType: "touch" })).toBe("pending");
    expect(getMapGestureIntent({ deltaX: 18, deltaY: 8, pointerType: "touch" })).toBe("map");
    expect(getMapGestureIntent({ deltaX: 8, deltaY: 30, pointerType: "touch" })).toBe("scroll");
    expect(getMapGestureIntent({ deltaX: 8, deltaY: 30, pointerType: "mouse" })).toBe("map");
  });

  it("mantém o mapa dentro dos limites úteis da planta", () => {
    expect(clampSeatMapPan({ desiredPan: { x: 800, y: -800 }, mapSize: { width: 610, height: 350 }, viewportSize: { width: 360, height: 505 }, zoom: 1 })).toEqual({ x: 143, y: 0 });
    expect(clampSeatMapPan({ desiredPan: { x: -800, y: 800 }, mapSize: { width: 610, height: 350 }, viewportSize: { width: 360, height: 505 }, zoom: 1.6 })).toEqual({ x: -326, y: 45.5 });
  });

  it("aceita retorno somente ao deslizar da borda esquerda no celular", () => {
    expect(shouldGoBackWithEdgeSwipe({ startX: 18, deltaX: 110, deltaY: 18, pointerType: "touch", viewportWidth: 390 })).toBe(true);
    expect(shouldGoBackWithEdgeSwipe({ startX: 42, deltaX: 110, deltaY: 18, pointerType: "touch", viewportWidth: 390 })).toBe(false);
    expect(shouldGoBackWithEdgeSwipe({ startX: 18, deltaX: 58, deltaY: 6, pointerType: "touch", viewportWidth: 390 })).toBe(false);
    expect(shouldGoBackWithEdgeSwipe({ startX: 18, deltaX: 110, deltaY: 18, pointerType: "mouse", viewportWidth: 390 })).toBe(false);
    expect(shouldGoBackWithEdgeSwipe({ startX: 18, deltaX: 110, deltaY: 18, pointerType: "touch", viewportWidth: 1024 })).toBe(false);
  });
});
