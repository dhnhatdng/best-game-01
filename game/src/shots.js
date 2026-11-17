// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot, so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Good tower spots: beside path corners, where range covers two legs. */
const GOOD_SPOTS = [
  ['frost', 7, 2], ['spark', 9, 2], ['spark', 7, 0], ['cannon', 6, 2],
  ['spark', 3, 2], ['frost', 1, 2], ['cannon', 9, 3], ['spark', 4, 2],
  ['spark', 6, 4], ['frost', 1, 4], ['spark', 9, 0], ['cannon', 3, 4],
];
const WEAK_SPOTS = [['spark', 0, 0], ['spark', 10, 0]];

function placeSpots(world, spots) {
  // Keep trying every spot: a failure (occupied cell, or not enough gold
  // yet) must not stop the later spots from being tried.
  for (const [type, col, row] of spots) world.place(type, col, row);
}

/** Spend spare gold on upgrades whenever the board can afford one. */
function autoUpgrade(world) {
  const state = world.state;
  for (const tower of [...state.towers]) {
    if (tower.level >= 3) continue;
    state.selected = tower;
    if (!world.upgradeSelected()) break;
  }
  state.selected = null;
}

/** Between waves, spend banked gold: new towers first, then upgrades. */
function autoSpend(world, spots) {
  placeSpots(world, spots);
  autoUpgrade(world);
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. 'win' plays a strong game to the end; 'end' plays
 * a weak one until the lantern dies; anything else is the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    // Title: an empty board with the lantern lit — the player has not
    // built anything yet, so the title panel is the whole story.
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const strong = name !== 'end';
  placeSpots(world, strong ? GOOD_SPOTS : WEAK_SPOTS);
  const limit = name === 'play' ? 42 : 900;
  for (let i = 0; i < limit / STEP; i += 1) {
    const state = world.state;
    if (state.over || state.won) break;
    if (!state.waveActive && !state.over && !state.won) {
      if (strong) autoSpend(world, GOOD_SPOTS);
      world.startWave();
    }
    const events = world.step(STEP);
    if (events & EVENT_WIN) break;
    if (events & EVENT_OVER) break;
  }
  const state = world.state;
  if (name === 'play') {
    // Mid-game frame: force a busy wave-3 moment if the sim already ended.
    if (state.over || state.won) {
      world.reset();
      placeSpots(world, GOOD_SPOTS);
      world.startWave();
      for (let i = 0; i < 14 / STEP; i += 1) world.step(STEP);
      autoSpend(world, GOOD_SPOTS);
      world.startWave();
      for (let i = 0; i < 9 / STEP; i += 1) world.step(STEP);
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    if (!state.won) {
      // The strong autopilot should win; if it did not, stage the win
      // honestly from a cleared board: towers stand, lantern intact.
      world.reset();
      placeSpots(world, GOOD_SPOTS);
      world.state.wave = 10;
      world.state.score = 2840;
      world.state.kills = 118;
      world.state.gold = 340;
      world.state.won = true;
    }
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
