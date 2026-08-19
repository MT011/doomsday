export type Point = { x: number; y: number };
export type MapGestureIntent = "pending" | "map" | "scroll";

const GESTURE_ACTIVATION_DISTANCE = 8;
const EDGE_ACTIVATION_ZONE = 24;
const EDGE_RETURN_DISTANCE = 88;

export function getMapGestureIntent({ deltaX, deltaY, pointerType }: { deltaX: number; deltaY: number; pointerType: string }): MapGestureIntent {
  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);

  if (Math.max(horizontalDistance, verticalDistance) < GESTURE_ACTIVATION_DISTANCE) return "pending";
  if (pointerType !== "touch") return "map";

  return horizontalDistance > verticalDistance * 1.15 ? "map" : "scroll";
}

export function clampSeatMapPan({ desiredPan, mapSize, viewportSize, zoom }: { desiredPan: Point; mapSize: { width: number; height: number }; viewportSize: { width: number; height: number }; zoom: number }): Point {
  const horizontalLimit = Math.max(0, (mapSize.width * zoom - viewportSize.width) / 2 + 18);
  const verticalLimit = Math.max(0, (mapSize.height * zoom - viewportSize.height) / 2 + 18);
  const clamp = (value: number, limit: number) => limit === 0 ? 0 : Math.min(limit, Math.max(-limit, value));

  return {
    x: clamp(desiredPan.x, horizontalLimit),
    y: clamp(desiredPan.y, verticalLimit),
  };
}

export function shouldGoBackWithEdgeSwipe({ startX, deltaX, deltaY, pointerType, viewportWidth }: { startX: number; deltaX: number; deltaY: number; pointerType: string; viewportWidth: number }): boolean {
  return pointerType === "touch"
    && viewportWidth <= 768
    && startX <= EDGE_ACTIVATION_ZONE
    && deltaX >= EDGE_RETURN_DISTANCE
    && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;
}
