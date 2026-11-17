// Emberwatch — every tuning number, colour and level shape in one place.
// The playfield is a fixed 1280x480 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 480 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Board geometry: 11 columns x 5 rows of 80px cells, top HUD is 48px tall. */
export const BOARD = { cols: 11, rows: 5, cell: 80, x0: 0, y0: 48 };
export const SIDEBAR = { x: 880, width: 400 };

/** The ember path snakes across the board, cell by cell, to the lantern. */
export const PATH = [
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
  [8, 2],
  [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3],
  [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],
];
export const LANTERN_CELL = [10, 4];

export const START_GOLD = 180;
export const START_LIVES = 12;
export const MAX_WAVE = 10;
export const LEAK_PENALTY = { wisp: 1, flutter: 1, brute: 2 };

export const TOWERS = {
  spark: {
    key: '1', name: 'Spark Lantern', cost: 50, range: 118, damage: 11,
    rate: 2.0, colour: '#ffc857', glow: '#ff9f1c', blurb: 'Fast, cheap, steady burn.',
  },
  frost: {
    key: '2', name: 'Frost Rune', cost: 75, range: 104, damage: 5,
    rate: 1.1, slow: 0.45, slowTime: 1.6, colour: '#7fe7f2', glow: '#3ec6d8',
    blurb: 'Chills wisps so others can hit.',
  },
  cannon: {
    key: '3', name: 'Cannon Bloom', cost: 120, range: 148, damage: 30,
    rate: 0.62, splash: 46, colour: '#ff7b9c', glow: '#e5484d',
    blurb: 'Slow lobbed blooms, splash damage.',
  },
};
export const TOWER_ORDER = ['spark', 'frost', 'cannon'];
export const UPGRADE_COST_RATE = 0.85;
export const UPGRADE_DAMAGE = 1.5;
export const UPGRADE_RANGE = 1.12;
export const MAX_LEVEL = 3;
export const SELL_RATE = 0.7;

export const ENEMIES = {
  wisp: { hp: 30, speed: 74, bounty: 6, radius: 11, colour: '#ffb703', core: '#fff3b0' },
  flutter: { hp: 55, speed: 54, bounty: 10, radius: 13, colour: '#b5179e', core: '#f72585' },
  brute: { hp: 210, speed: 32, bounty: 18, radius: 17, colour: '#e5383b', core: '#ffba08' },
};

/** Wave composition: [wisps, flutters, brutes] per wave, hp grows with wave. */
export const WAVES = [
  [6, 0, 0], [9, 2, 0], [11, 4, 0], [12, 6, 1], [14, 7, 2],
  [15, 9, 3], [16, 11, 4], [18, 12, 5], [20, 14, 6], [22, 16, 8],
];
// Balance, verified by headless sim (17/11): a strong autopilot that keeps
// spending between waves wins with 6–8 of 12 lives left; a weak two-tower
// start loses on wave 2. Late waves must feel dangerous, not free.
export const WAVE_HP_GROWTH = 0.45;
export const WAVE_GOLD_BONUS = 25;
export const SPAWN_INTERVAL = 0.85;

export const PALETTE = {
  backdrop: '#0b1020', board: '#101a2e', boardAlt: '#0e1626', path: '#2a2118',
  pathEdge: '#4a3520', grid: '#1c2942', lantern: '#ffd166', lanternGlow: '#ff9f1c',
  text: '#f4efe6', muted: '#9aa7bd', panel: '#141d33', panelEdge: '#24344f',
  gold: '#ffc857', lives: '#ff6b6b', good: '#7bed9f', danger: '#ff6b6b',
  wave: '#7fe7f2', button: '#1e3a5f', buttonHot: '#2b5a8a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberwatch.best';
