/** Макс. сдвиг указателя (px) между down и up, чтобы считать жест «коротким кликом», а не перетаскиванием. */
export const SHORT_CLICK_MAX_DRAG_PX = 6;

export type ShortClickPointerRef = {
  anchorX: number;
  anchorY: number;
  exceededMaxDrag: boolean;
};

export function createShortClickPointerRef(): ShortClickPointerRef {
  return { anchorX: 0, anchorY: 0, exceededMaxDrag: false };
}

export function shortClickPointerDown(
  ref: ShortClickPointerRef,
  e: PointerEvent,
): void {
  if (e.button !== 0) return;
  ref.anchorX = e.clientX;
  ref.anchorY = e.clientY;
  ref.exceededMaxDrag = false;
}

export function shortClickPointerMove(
  ref: ShortClickPointerRef,
  e: PointerEvent,
): void {
  if (e.buttons !== 1) return;
  if (
    Math.hypot(e.clientX - ref.anchorX, e.clientY - ref.anchorY) >
    SHORT_CLICK_MAX_DRAG_PX
  ) {
    ref.exceededMaxDrag = true;
  }
}

/** После pan без click флаг может зависнуть — сбросить после отпускания кнопки (после фазы click). */
export function shortClickPointerUpClearDeferred(
  ref: ShortClickPointerRef,
): void {
  requestAnimationFrame(() => {
    ref.exceededMaxDrag = false;
  });
}

export function isShortClick(ref: ShortClickPointerRef): boolean {
  return !ref.exceededMaxDrag;
}
