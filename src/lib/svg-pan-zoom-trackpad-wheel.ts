/**
 * Расширение поверх svg-pan-zoom без правок node_modules:
 * — тачпад: двухпальцевый скролл (pixel deltas) → pan, как во Figma;
 * — pinch (wheel + ctrlKey в Chromium/WebKit) или колёсико мыши (line/page mode) → zoom.
 *
 * @see https://github.com/bumbu/svg-pan-zoom — встроенный wheel только зумит по deltaY.
 */

export interface SvgPanZoomWheelInstance {
  panBy(point: { x: number; y: number }): unknown;
  /**
   * Относительный зум относительно текущего (как внутренний wheel у библиотеки).
   * Важно: публичный `zoomAtPoint` — это *абсолютный* уровень (см. getPublicInstance в svg-pan-zoom);
   * для множителя за один жест нужен именно `zoomAtPointBy`.
   */
  zoomAtPointBy(scale: number, point: { x: number; y: number }): unknown;
  isPanEnabled(): boolean;
  isZoomEnabled(): boolean;
  disableMouseWheelZoom(): unknown;
}

export interface SvgPanZoomTrackpadWheelOptions {
  /** Должен совпадать с zoomScaleSensitivity экземпляра svg-pan-zoom (колёсико мыши). */
  zoomScaleSensitivity?: number;
  /**
   * Чувствительность pinch на тачпаде (wheel + ctrl/meta, пиксельные deltaY).
   * Больше — сильнее зум за тот же жест. Подобрано под Chromium/WebKit на macOS.
   */
  pinchZoomIntensity?: number;
}

/**
 * Отключает стандартный wheel у экземпляра и подписывает нативный `wheel` на `svg`.
 * Верните `destroy` до вызова `instance.destroy()`.
 */
export function attachSvgPanZoomTrackpadWheel(
  svg: SVGSVGElement,
  instance: SvgPanZoomWheelInstance,
  options: SvgPanZoomTrackpadWheelOptions = {},
): () => void {
  const zoomScaleSensitivity = options.zoomScaleSensitivity ?? 0.1;
  const pinchZoomIntensity = options.pinchZoomIntensity ?? 0.012;

  instance.disableMouseWheelZoom();

  let lastMouseWheelEventTime = Date.now();

  const pointForZoom = (evt: WheelEvent) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  /**
   * Pinch на тачпаде: серия мелких deltaY (иногда 0). Старая формула svg-pan-zoom
   * с `deltaY || 1` даёт рывки и почти нулевой зум на малых значениях.
   */
  const zoomFromPinchWheel = (evt: WheelEvent) => {
    const dy = evt.deltaY;
    if (dy === 0) return;
    const relative = pointForZoom(evt);
    if (!relative) return;
    const factor = Math.exp(-dy * pinchZoomIntensity);
    instance.zoomAtPointBy(factor, relative);
  };

  /** Колёсико мыши и не-пиксельные wheel — логика как в svg-pan-zoom. */
  const zoomFromMouseWheel = (evt: WheelEvent) => {
    let delta = evt.deltaY;
    if (delta === 0) return;

    const timeDelta = Date.now() - lastMouseWheelEventTime;
    const divider = 3 + Math.max(0, 30 - timeDelta);
    lastMouseWheelEventTime = Date.now();

    const legacyWd = (evt as WheelEvent & { wheelDelta?: number }).wheelDelta;
    if ("deltaMode" in evt && evt.deltaMode === 0 && legacyWd) {
      delta = evt.deltaY === 0 ? 0 : Math.abs(legacyWd) / evt.deltaY;
    }

    delta =
      delta > -0.3 && delta < 0.3
        ? delta
        : ((delta > 0 ? 1 : -1) * Math.log(Math.abs(delta) + 10)) / divider;

    const relative = pointForZoom(evt);
    if (!relative) return;
    const zoom = Math.pow(1 + zoomScaleSensitivity, -1 * delta);
    instance.zoomAtPointBy(zoom, relative);
  };

  const onWheel = (evt: WheelEvent) => {
    const panOk = instance.isPanEnabled();
    const zoomOk = instance.isZoomEnabled();

    const pinchOrZoomWheel = evt.ctrlKey || evt.metaKey;
    const pixelScroll = evt.deltaMode === WheelEvent.DOM_DELTA_PIXEL;

    if (pixelScroll && !pinchOrZoomWheel && panOk) {
      evt.preventDefault();
      instance.panBy({ x: -evt.deltaX, y: -evt.deltaY });
      return;
    }

    if (!zoomOk) return;

    if (pinchOrZoomWheel && pixelScroll) {
      evt.preventDefault();
      zoomFromPinchWheel(evt);
      return;
    }

    if (pinchOrZoomWheel || !pixelScroll) {
      evt.preventDefault();
      zoomFromMouseWheel(evt);
    }
  };

  svg.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    svg.removeEventListener("wheel", onWheel);
  };
}
