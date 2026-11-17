// Emberwatch world: the whole simulation — waves, towers, enemies,
// projectiles, gold and lives. No drawing and no input here, so the same
// state can be stepped by the live loop or by the screenshot autopilot.
import {
  BOARD, ENEMIES, LANTERN_CELL, LEAK_PENALTY, MAX_LEVEL, MAX_WAVE, PATH,
  SELL_RATE, SPAWN_INTERVAL, START_GOLD, START_LIVES, TOWERS,
  UPGRADE_COST_RATE, UPGRADE_DAMAGE, UPGRADE_RANGE, WAVES, WAVE_GOLD_BONUS,
  WAVE_HP_GROWTH,
} from './config.js';
import { shuffle } from './random.js';

export const EVENT_KILL = 1;
export const EVENT_LEAK = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;

let nextId = 1;

export function cellCenter(col, row) {
  return {
    x: BOARD.x0 + col * BOARD.cell + BOARD.cell / 2,
    y: BOARD.y0 + row * BOARD.cell + BOARD.cell / 2,
  };
}

export function isPathCell(col, row) {
  return PATH.some(([c, r]) => c === col && r === row);
}

export function pathWaypoints() {
  return PATH.map(([c, r]) => cellCenter(c, r));
}

function towerStats(type, level) {
  const base = TOWERS[type];
  return {
    damage: Math.round(base.damage * (UPGRADE_DAMAGE ** (level - 1))),
    range: Math.round(base.range * (UPGRADE_RANGE ** (level - 1))),
    rate: base.rate,
  };
}

export function upgradeCost(type, level) {
  return Math.round(TOWERS[type].cost * UPGRADE_COST_RATE * level);
}

export function createWorld(rng) {
  const waypoints = pathWaypoints();
  const state = {
    gold: START_GOLD, lives: START_LIVES, wave: 0, score: 0, kills: 0,
    leaks: 0, time: 0, towers: [], enemies: [], projectiles: [], particles: [],
    spawnQueue: [], spawnTimer: 0, waveActive: false, waveCleared: true,
    selected: null, selectedType: 'spark', over: false, won: false,
  };

  function burst(x, y, colour, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = rng() * Math.PI * 2;
      const v = speed * (0.4 + rng() * 0.8);
      state.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.45, maxLife: 0.45, colour, size: 2 + rng() * 3,
      });
    }
  }

  function buildSpawnQueue(waveIndex) {
    const [wisps, flutters, brutes] = WAVES[waveIndex];
    const queue = [];
    for (let i = 0; i < wisps; i += 1) queue.push('wisp');
    for (let i = 0; i < flutters; i += 1) queue.push('flutter');
    for (let i = 0; i < brutes; i += 1) queue.push('brute');
    // Brutes lead the pack so the wave reads as a siege, the rest shuffled.
    const brutesOnly = queue.filter((k) => k === 'brute');
    const rest = shuffle(rng, queue.filter((k) => k !== 'brute'));
    return [...brutesOnly, ...rest];
  }

  function spawnEnemy(kind) {
    const def = ENEMIES[kind];
    const hp = Math.round(def.hp * (1 + WAVE_HP_GROWTH * state.wave));
    state.enemies.push({
      id: nextId, kind, x: waypoints[0].x - 40, y: waypoints[0].y,
      wp: 1, dist: 0, hp, maxHp: hp, speed: def.speed,
      slowUntil: 0, radius: def.radius, bounty: def.bounty,
    });
    nextId += 1;
  }

  function damageEnemy(enemy, amount, events) {
    enemy.hp -= amount;
    if (enemy.hp > 0) return events;
    state.enemies = state.enemies.filter((e) => e.id !== enemy.id);
    state.gold += enemy.bounty;
    state.score += 10;
    state.kills += 1;
    burst(enemy.x, enemy.y, ENEMIES[enemy.kind].colour, 10, 90);
    return events | EVENT_KILL;
  }

  function stepEnemies(dt, events) {
    for (const enemy of [...state.enemies]) {
      const slowed = state.time < enemy.slowUntil;
      const speed = enemy.speed * (slowed ? 0.55 : 1);
      let left = speed * dt;
      while (left > 0 && enemy.wp < waypoints.length) {
        const target = waypoints[enemy.wp];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const d = Math.hypot(dx, dy);
        const move = Math.min(d, left);
        if (d > 0) { enemy.x += (dx / d) * move; enemy.y += (dy / d) * move; }
        enemy.dist += move;
        left -= move;
        if (move >= d - 0.001) enemy.wp += 1;
      }
      if (enemy.wp >= waypoints.length) {
        state.enemies = state.enemies.filter((e) => e.id !== enemy.id);
        state.lives -= LEAK_PENALTY[enemy.kind];
        state.leaks += 1;
        burst(enemy.x, enemy.y, '#ff6b6b', 12, 110);
        events |= EVENT_LEAK;
        if (state.lives <= 0) {
          state.lives = 0;
          state.over = true;
          events |= EVENT_OVER;
        }
      }
    }
    return events;
  }

  function stepTowers(dt, events) {
    for (const tower of state.towers) {
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;
      const stats = towerStats(tower.type, tower.level);
      let best = null;
      for (const enemy of state.enemies) {
        const d = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
        if (d <= stats.range && (best === null || enemy.dist > best.dist)) best = enemy;
      }
      if (!best) continue;
      tower.cooldown = 1 / stats.rate;
      tower.flash = 0.12;
      state.projectiles.push({
        x: tower.x, y: tower.y - 14, target: best, speed: 420,
        damage: stats.damage, type: tower.type,
        splash: TOWERS[tower.type].splash || 0,
        slow: TOWERS[tower.type].slow || 0,
        slowTime: TOWERS[tower.type].slowTime || 0,
        colour: TOWERS[tower.type].colour, dead: false,
      });
    }
    return events;
  }

  function stepProjectiles(dt, events) {
    for (const p of [...state.projectiles]) {
      const target = p.target;
      if (!target || !state.enemies.some((e) => e.id === target.id)) {
        state.projectiles = state.projectiles.filter((q) => q !== p);
        continue;
      }
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy);
      const move = p.speed * dt;
      if (d <= move + target.radius) {
        state.projectiles = state.projectiles.filter((q) => q !== p);
        if (p.splash > 0) {
          burst(target.x, target.y, p.colour, 8, 70);
          for (const enemy of [...state.enemies]) {
            if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= p.splash) {
              events = damageEnemy(enemy, p.damage, events);
            }
          }
        } else {
          if (p.slow > 0) {
            target.slowUntil = state.time + p.slowTime;
          }
          events = damageEnemy(target, p.damage, events);
        }
      } else {
        p.x += (dx / d) * move;
        p.y += (dy / d) * move;
      }
    }
    return events;
  }

  function stepParticles(dt) {
    for (const pt of [...state.particles]) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life <= 0) state.particles = state.particles.filter((q) => q !== pt);
    }
  }

  const world = {
    state,
    reset() {
      state.gold = START_GOLD; state.lives = START_LIVES; state.wave = 0;
      state.score = 0; state.kills = 0; state.leaks = 0; state.time = 0;
      state.towers = []; state.enemies = []; state.projectiles = [];
      state.particles = []; state.spawnQueue = []; state.spawnTimer = 0;
      state.waveActive = false; state.waveCleared = true; state.selected = null;
      state.selectedType = 'spark'; state.over = false; state.won = false;
      nextId = 1;
    },
    canPlace(col, row) {
      if (col < 0 || col >= BOARD.cols || row < 0 || row >= BOARD.rows) return false;
      if (isPathCell(col, row)) return false;
      if (col === LANTERN_CELL[0] && row === LANTERN_CELL[1]) return false;
      return !state.towers.some((t) => t.col === col && t.row === row);
    },
    towerAt(col, row) {
      return state.towers.find((t) => t.col === col && t.row === row) || null;
    },
    place(type, col, row) {
      if (!world.canPlace(col, row)) return false;
      const cost = TOWERS[type].cost;
      if (state.gold < cost) return false;
      const { x, y } = cellCenter(col, row);
      state.gold -= cost;
      state.towers.push({
        id: nextId, type, col, row, x, y, level: 1, invested: cost,
        cooldown: 0, flash: 0,
      });
      nextId += 1;
      burst(x, y, TOWERS[type].colour, 8, 60);
      return true;
    },
    upgradeSelected() {
      const tower = state.selected;
      if (!tower || tower.level >= MAX_LEVEL) return false;
      const cost = upgradeCost(tower.type, tower.level);
      if (state.gold < cost) return false;
      state.gold -= cost;
      tower.invested += cost;
      tower.level += 1;
      burst(tower.x, tower.y, '#7bed9f', 12, 80);
      return true;
    },
    sellSelected() {
      const tower = state.selected;
      if (!tower) return false;
      state.gold += Math.round(tower.invested * SELL_RATE);
      state.towers = state.towers.filter((t) => t.id !== tower.id);
      state.selected = null;
      return true;
    },
    startWave() {
      if (state.waveActive || state.over || state.won) return false;
      if (state.wave >= MAX_WAVE) return false;
      state.spawnQueue = buildSpawnQueue(state.wave);
      state.spawnTimer = 0.4;
      state.waveActive = true;
      state.waveCleared = false;
      return true;
    },
    step(dt) {
      let events = 0;
      if (state.over || state.won) return events;
      state.time += dt;
      for (const tower of state.towers) tower.flash = Math.max(0, (tower.flash || 0) - dt);
      if (state.waveActive && state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnEnemy(state.spawnQueue.shift());
          state.spawnTimer = SPAWN_INTERVAL;
        }
      }
      events = stepEnemies(dt, events);
      events = stepTowers(dt, events);
      events = stepProjectiles(dt, events);
      stepParticles(dt);
      if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
        state.waveActive = false;
        state.waveCleared = true;
        const bonus = WAVE_GOLD_BONUS + state.wave * 5;
        state.gold += bonus;
        state.score += 100 * (state.wave + 1);
        state.wave += 1;
        events |= EVENT_WAVE_CLEAR;
        if (state.wave >= MAX_WAVE) {
          state.won = true;
          events |= EVENT_WIN;
        }
      }
      return events;
    },
  };
  return world;
}
