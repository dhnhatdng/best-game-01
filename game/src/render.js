// Every pixel of Emberwatch: board, path, lantern, towers, enemies,
// sidebar shop and all four screens. Pure drawing — no game rules here.
import {
  BOARD, ENEMIES, FIELD, FONT, LANTERN_CELL, MAX_LEVEL, MAX_WAVE, PALETTE,
  SIDEBAR, TOWERS, TOWER_ORDER, UPGRADE_COST_RATE,
} from './config.js';
import { cellCenter, isPathCell, upgradeCost } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTowerShape(ctx, tower, time) {
  const { x, y } = tower;
  const base = TOWERS[tower.type];
  const flash = tower.flash > 0 ? 1.6 : 1;
  ctx.save();
  ctx.translate(x, y);
  if (tower.type === 'spark') {
    ctx.fillStyle = '#3a2c12';
    ctx.fillRect(-5, -6, 10, 22);
    ctx.fillStyle = base.colour;
    ctx.beginPath();
    ctx.arc(0, -12, 11 * flash, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(0, -12, 5 * flash, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'frost') {
    ctx.rotate(Math.PI / 4 + Math.sin(time * 2 + tower.id) * 0.08);
    ctx.fillStyle = base.colour;
    ctx.fillRect(-11, -11, 22, 22);
    ctx.fillStyle = '#e8fbff';
    ctx.fillRect(-5, -5, 10, 10);
  } else {
    ctx.fillStyle = '#40202c';
    ctx.beginPath();
    ctx.arc(0, 4, 14, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + time * 0.4;
      ctx.fillStyle = i % 2 ? base.colour : '#ffb3c1';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 13, -2 + Math.sin(a) * 13, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff0f3';
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (tower.level > 1) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('★'.repeat(tower.level), x, y + 34);
  }
}

function drawEnemyShape(ctx, enemy, time) {
  const def = ENEMIES[enemy.kind];
  const bob = Math.sin(time * 6 + enemy.id * 1.7) * 2;
  ctx.save();
  ctx.translate(enemy.x, enemy.y + bob);
  ctx.fillStyle = def.colour;
  if (enemy.kind === 'wisp') {
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.core;
    ctx.beginPath();
    ctx.arc(0, -2, enemy.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'flutter') {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
    ctx.fillStyle = def.core;
    ctx.fillRect(-5, -5, 10, 10);
  } else {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * enemy.radius, Math.sin(a) * enemy.radius);
      ctx.lineTo(Math.cos(a + 0.9) * enemy.radius, Math.sin(a + 0.9) * enemy.radius);
      ctx.lineTo(0, 0);
      ctx.fill();
    }
    ctx.fillStyle = def.core;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (enemy.hp < enemy.maxHp) {
    const w = 30;
    ctx.fillStyle = '#00000088';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 10, w, 5);
    ctx.fillStyle = enemy.hp / enemy.maxHp > 0.4 ? PALETTE.good : PALETTE.danger;
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 10, w * (enemy.hp / enemy.maxHp), 5);
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function drawBoard(state, time, hover, selectedType) {
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(0, BOARD.y0, BOARD.x0 + BOARD.cols * BOARD.cell, BOARD.rows * BOARD.cell);
    for (let r = 0; r < BOARD.rows; r += 1) {
      for (let c = 0; c < BOARD.cols; c += 1) {
        const x = BOARD.x0 + c * BOARD.cell;
        const y = BOARD.y0 + r * BOARD.cell;
        if (isPathCell(c, r)) {
          ctx.fillStyle = PALETTE.path;
          ctx.fillRect(x, y, BOARD.cell, BOARD.cell);
          ctx.fillStyle = PALETTE.pathEdge;
          ctx.fillRect(x, y, BOARD.cell, 3);
          ctx.fillRect(x, y + BOARD.cell - 3, BOARD.cell, 3);
        } else {
          ctx.fillStyle = (c + r) % 2 ? PALETTE.board : PALETTE.boardAlt;
          ctx.fillRect(x, y, BOARD.cell, BOARD.cell);
          ctx.strokeStyle = PALETTE.grid;
          ctx.strokeRect(x + 0.5, y + 0.5, BOARD.cell - 1, BOARD.cell - 1);
        }
      }
    }
    // The lantern the wisps are marching toward.
    const lantern = cellCenter(LANTERN_CELL[0], LANTERN_CELL[1]);
    const glow = ctx.createRadialGradient(lantern.x, lantern.y, 4, lantern.x, lantern.y, 52);
    glow.addColorStop(0, '#ffd166cc');
    glow.addColorStop(1, '#ffd16600');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lantern;
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y - 4, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8e1';
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y - 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('LANTERN', lantern.x, lantern.y + 30);
    // Hover ghost: where the next tower would go.
    if (hover && hover.cell) {
      const { col, row } = hover.cell;
      const p = cellCenter(col, row);
      ctx.fillStyle = '#ffffff22';
      ctx.fillRect(p.x - 36, p.y - 36, 72, 72);
      ctx.strokeStyle = TOWERS[selectedType].colour;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 36, p.y - 36, 72, 72);
      ctx.lineWidth = 1;
    }
    // Range ring for the selected tower.
    if (state.selected) {
      const t = state.selected;
      const range = TOWERS[t.type].range * (1.12 ** (t.level - 1));
      ctx.strokeStyle = '#ffffff44';
      ctx.beginPath();
      ctx.arc(t.x, t.y, range, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const tower of state.towers) drawTowerShape(ctx, tower, time);
    for (const enemy of state.enemies) drawEnemyShape(ctx, enemy, time);
    for (const p of state.projectiles) {
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.type === 'cannon' ? 7 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffffcc';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.colour;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawHud(state, best) {
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, FIELD.width, BOARD.y0);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('🔥 EMBERWATCH', 14, 31);
    ctx.font = '15px ' + FONT;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`Gold ${state.gold}`, 230, 30);
    ctx.fillStyle = PALETTE.lives;
    ctx.fillText(`♥ Lives ${state.lives}`, 350, 30);
    ctx.fillStyle = PALETTE.wave;
    ctx.fillText(`Wave ${Math.min(state.wave + 1, MAX_WAVE)}/${MAX_WAVE}`, 480, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Score ${state.score}   Kills ${state.kills}   Best ${best}`, 610, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(state.waveActive ? 'Wave running…' : 'SPACE — start wave', FIELD.width - 14, 30);
    ctx.textAlign = 'left';
  }

  function drawSidebar(state) {
    const x = SIDEBAR.x;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, BOARD.y0, SIDEBAR.width, FIELD.height - BOARD.y0);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(x + 0.5, BOARD.y0 + 0.5, SIDEBAR.width - 1, FIELD.height - BOARD.y0 - 1);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText('BUILD  —  click a card, then a cell  [1/2/3]', x + 16, BOARD.y0 + 26);
    let y = BOARD.y0 + 40;
    for (const type of TOWER_ORDER) {
      const t = TOWERS[type];
      const hot = state.selectedType === type;
      ctx.fillStyle = hot ? PALETTE.buttonHot : PALETTE.button;
      roundRect(ctx, x + 14, y, SIDEBAR.width - 28, 62, 8);
      ctx.fill();
      ctx.fillStyle = t.colour;
      ctx.beginPath();
      ctx.arc(x + 42, y + 31, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 14px ' + FONT;
      ctx.fillText(`${t.key} · ${t.name}  —  ${t.cost}g`, x + 64, y + 24);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '12px ' + FONT;
      ctx.fillText(`${t.blurb}  DMG ${t.damage} · RNG ${t.range}`, x + 64, y + 44);
      y += 72;
    }
    const sel = state.selected;
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px ' + FONT;
    if (sel) {
      const t = TOWERS[sel.type];
      ctx.fillText(`Selected: ${t.name}  Lv ${sel.level}`, x + 16, y + 18);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '12px ' + FONT;
      ctx.fillText(`Invested ${sel.invested}g · Sell for ${Math.round(sel.invested * 0.7)}g  [X]`, x + 16, y + 38);
      if (sel.level < MAX_LEVEL) {
        ctx.fillStyle = PALETTE.good;
        ctx.fillText(`Upgrade ${upgradeCost(sel.type, sel.level)}g  [U]  → DMG ${Math.round(t.damage * (1.5 ** sel.level))}`, x + 16, y + 58);
      } else {
        ctx.fillStyle = PALETTE.gold;
        ctx.fillText('Max level — this tower burns at full power.', x + 16, y + 58);
      }
    } else {
      ctx.fillText('No tower selected.', x + 16, y + 18);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '12px ' + FONT;
      ctx.fillText('Click a tower on the board to upgrade or sell it.', x + 16, y + 38);
      ctx.fillText('Frost slows wisps — pair it with Spark.', x + 16, y + 58);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.fillText('P pause · R restart · M sound · 10 waves to win', x + 16, FIELD.height - 16);
  }

  function overlay(title, lines, accent) {
    // A centred panel, not a full-screen veil: the board, HUD and shop
    // stay visible around it, so the screenshot still shows the game.
    ctx.fillStyle = '#05080f99';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const px = 240, py = 96, pw = FIELD.width - 480, ph = 288;
    ctx.fillStyle = '#101a2ef2';
    roundRect(ctx, px, py, pw, ph, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = accent || PALETTE.text;
    ctx.font = 'bold 40px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, py + 62);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px ' + FONT;
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, py + 112 + i * 28));
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '14px ' + FONT;
    ctx.fillText('Press SPACE or click to play again  ·  R restarts', FIELD.width / 2, py + 112 + lines.length * 28 + 22);
    ctx.textAlign = 'left';
  }

  return {
    draw(state, screen, best, ui) {
      const time = state.time;
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawHud(state, best);
      drawBoard(state, time, screen === SCREEN_PLAY ? ui.hover : null, state.selectedType);
      drawSidebar(state);
      if (screen === SCREEN_TITLE) {
        overlay('🔥 EMBERWATCH', [
          'The last lantern is lit. The ember wisps are coming for it.',
          'Build lanterns, runes and blooms along their path — hold all 10 waves.',
          'Click a card, click a cell. SPACE starts a wave. 1 / 2 / 3 pick a tower.',
        ], PALETTE.lantern);
      } else if (screen === SCREEN_PAUSED) {
        overlay('PAUSED', ['The embers wait. The lantern still burns.'], PALETTE.wave);
      } else if (screen === SCREEN_WIN) {
        overlay('🏆 THE LANTERN HOLDS!', [
          `All ${MAX_WAVE} waves broken · Score ${state.score} · ${state.kills} wisps banished · Best ${best}`,
          'No ember reached the flame. You are the Emberwatch.',
        ], PALETTE.good);
      } else if (screen === SCREEN_OVER) {
        overlay('THE LIGHT WENT OUT', [
          `The wisps reached the lantern on wave ${Math.min(state.wave + 1, MAX_WAVE)} · Score ${state.score} · Best ${best}`,
          'Rebuild smarter: frost first, then spark behind it.',
        ], PALETTE.danger);
      }
    },
  };
}
