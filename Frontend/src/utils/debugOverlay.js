// TEMP DEBUG OVERLAY — persists across sleep/lock since it's just DOM state,
// so it survives even when a live DevTools connection would drop.
let el = null;

const getOverlay = () => {
  if (!el) {
    el = document.createElement('div');
    el.id = 'debug-overlay';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;max-height:50vh;overflow-y:auto;background:rgba(0,0,0,0.92);color:#0f0;font-size:10px;padding:6px;z-index:999999;white-space:pre-wrap;font-family:monospace;pointer-events:auto;';
    document.body.appendChild(el);

    // Tap the overlay to collapse/expand it, so it doesn't block the whole UI
    let collapsed = false;
    el.addEventListener('click', () => {
      collapsed = !collapsed;
      el.style.maxHeight = collapsed ? '30px' : '50vh';
      el.style.overflow = collapsed ? 'hidden' : 'auto';
    });
  }
  return el;
};

export const debugLog = (tag, ...args) => {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
  console.log(`%c[${tag}]`, 'color:#0af;font-weight:bold', ...args);
  const overlay = getOverlay();
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()} [${tag}] ${msg}`;
  overlay.insertBefore(line, overlay.firstChild);
  // Keep only the most recent ~200 lines so it doesn't grow unbounded over a long test
  while (overlay.children.length > 200) {
    overlay.removeChild(overlay.lastChild);
  }
};