import { createContourField, normalizeOptions } from './contour-field.mjs';

/** Mount a passive contour layer. Host content should have position:relative;z-index:1. */
export function mountContourBackground(container, options = {}) {
  if (!(container instanceof Element)) throw new TypeError('A container element is required');
  const previous = { position: container.style.position, isolation: container.style.isolation };
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.style.isolation = 'isolate';
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position:'absolute', inset:'0', width:'100%', height:'100%', zIndex:'0', pointerEvents:'none', display:'block' });
  container.prepend(canvas);
  const { onStateChange, ...settings } = options;
  const field = createContourField({ canvas, onStateChange, ...normalizeOptions(settings) });
  let destroyed = false;
  return { canvas, field,
    setOptions: patch => field.setOptions(patch), renderAt: seconds => field.renderAt(seconds),
    start: () => { field.setOptions({ motion:true }); field.start(); }, stop: () => field.stop(),
    exportPNG: settings => field.exportPNG(settings), exportSVG: settings => field.exportSVG(settings),
    getOptions: () => field.getOptions(), getState: () => field.getState(),
    destroy: () => { if (destroyed) return; destroyed = true; field.destroy(); canvas.remove(); container.style.position = previous.position; container.style.isolation = previous.isolation; },
  };
}
