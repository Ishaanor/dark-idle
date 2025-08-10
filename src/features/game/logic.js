// Pure helper functions (no UI)

import { BASE_ITEMS, bossNames, enemyNames } from "./constants.js";

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const fmt = (n) => {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return Math.floor(n).toString();
};

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const rollName = (list) => list[Math.floor(Math.random() * list.length)];

export function scaleEnemy(stage, isBoss) {
  const base = Math.floor(15 * Math.pow(stage, 1.6) + 10);
  const hp = Math.floor(base * (isBoss ? 6 : 1));
  const dps = Math.max(1, Math.floor(stage * 0.7 + (isBoss ? 2 : 0)));
  return { name: isBoss ? rollName(bossNames) : rollName(enemyNames), maxHP: hp, hp, dps, isBoss };
}

export function calcStats(state) {
  const itemsById = Object.fromEntries(BASE_ITEMS.map((i) => [i.id, i]));
  let dpsFlat = 0, dpsMult = 1, hpFlat = 0, hpMult = 1, lootMult = 1, soulsPerSec = 0, drFlat = 0, apsFlat = 0;

  for (const it of state.items || []) {
    const base = itemsById[it.id];
    const lv = it.level || 0;
    if (!base || lv <= 0) continue;
    const eff = base.effect(lv) || {};
    dpsFlat += eff.dpsFlat || 0;
    dpsMult *= eff.dpsMult || 1;
    hpFlat += eff.hpFlat || 0;
    hpMult *= eff.hpMult || 1;
    lootMult *= eff.lootMult || 1;
    soulsPerSec += eff.soulsPerSec || 0;
    drFlat += eff.drFlat || 0;
    apsFlat += eff.apsFlat || 0;
  }

  const maxHP = Math.ceil((state.hero.baseMaxHP + hpFlat) * hpMult);
  const dps = Math.max(0, (state.hero.baseDPS + dpsFlat) * dpsMult);
  const dr = Math.max(0, Math.floor(drFlat));
  const aps = Math.min(5, 1 + apsFlat);
  return { maxHP, dps, lootMult, soulsPerSec, dr, aps };
}

export function costFor(itemId, level) {
  const base = BASE_ITEMS.find((i) => i.id === itemId);
  if (!base) return {};
  const scale = Math.pow(base.costScale, level);
  const out = {};
  for (const [k, v] of Object.entries(base.baseCost)) out[k] = Math.ceil(v * scale);
  return out;
}

export const canAfford = (resources, cost) =>
  Object.entries(cost).every(([k, v]) => (resources[k] || 0) >= v);

export function pay(resources, cost) {
  const next = { ...resources };
  for (const [k, v] of Object.entries(cost)) next[k] = (next[k] || 0) - v;
  return next;
}

export const addLog = (state, msg) =>
  ({ ...state, log: [msg, ...state.log].slice(0, 50) });
