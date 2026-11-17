// Mouse + keyboard input. The canvas reports logical 1280x480 coordinates
// no matter how it is scaled on screen, so a click always maps to a cell.
import { BOARD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

export function createInput(canvas, audio) {
  let actions = 0;
  let click = null;
  let hover = null;
  let keys = new Set();

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 480,
    };
  }

  function cellAt(x, y) {
    const col = Math.floor((x - BOARD.x0) / BOARD.cell);
    const row = Math.floor((y - BOARD.y0) / BOARD.cell);
    if (col < 0 || col >= BOARD.cols || row < 0 || row >= BOARD.rows) return null;
    return { col, row };
  }

  canvas.addEventListener('pointerdown', (event) => {
    audio.unlock();
    const p = toLogical(event);
    click = { ...p, cell: cellAt(p.x, p.y) };
  });
  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event);
    hover = { ...p, cell: cellAt(p.x, p.y) };
  });
  canvas.addEventListener('pointerleave', () => { hover = null; });

  window.addEventListener('keydown', (event) => {
    audio.unlock();
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    else if (event.key.toLowerCase() === 'p' || event.key === 'Escape') actions |= ACTION_PAUSE;
    else if (event.key.toLowerCase() === 'r') actions |= ACTION_RESTART;
    else if (event.key.toLowerCase() === 'm') audio.toggleMute();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

  return {
    takeActions() { const a = actions; actions = 0; return a; },
    takeClick() { const c = click; click = null; return c; },
    hover() { return hover; },
    pressed(key) { return keys.has(key.toLowerCase()); },
    consumeKey(key) {
      const hit = keys.has(key.toLowerCase());
      if (hit) keys.delete(key.toLowerCase());
      return hit;
    },
  };
}
