// Game constants and initial state

export const enemyNames = [
  "Gloomrat",
  "Taxidermied Goblin",
  "Wall-Crawling Auditor",
  "Spite Wisp",
  "Mildew Knight",
  "Angry Barrel",
  "Coffin Intern",
  "Mope Drake",
  "Bureaucrat of Doom",
  "Bone Clerk",
];

export const bossNames = [
  "HR Lich",
  "The Unpaid Internity",
  "Quartermaster of Shadows",
  "King Bureaucrad IV",
  "Siren of Scope Creep",
  "The Compliance Hydra",
];

export const BASE_ITEMS = [
  { id: "dagger", name: "Rusty Shiv of Regret", desc: "+1 DPS per level. Smells like mistakes.", baseCost: { bones: 10 }, costScale: 1.35, max: 100, effect: (lvl) => ({ dpsFlat: lvl * 1 }) },
  { id: "helm", name: "Spiked Helm of Overthinking", desc: "+5 Max HP per level. Mind the spikes.", baseCost: { bones: 20, gloom: 5 }, costScale: 1.4, max: 100, effect: (lvl) => ({ hpFlat: lvl * 5 }) },
  { id: "armor", name: "Graveplate Armour", desc: "-1 damage taken per level.", baseCost: { bones: 50, gloom: 10 }, costScale: 1.45, max: 100, effect: (lvl) => ({ drFlat: lvl * 1 }) },
  { id: "metronome", name: "Metronome of Malice", desc: "+0.2 Attacks/sec per level.", baseCost: { souls: 100, gloom: 30 }, costScale: 1.5, max: 25, effect: (lvl) => ({ apsFlat: lvl * 0.2 }) },
  { id: "totem", name: "Pocket Necromancer", desc: "+0.5 Souls/s per level. He invoices monthly.", baseCost: { souls: 50, gloom: 20 }, costScale: 1.5, max: 50, effect: (lvl) => ({ soulsPerSec: lvl * 0.5 }) },
  { id: "ink", name: "Bottle of Bureaucratic Ink", desc: "+5% loot per level. Now in Eternal Black.", baseCost: { bones: 100, gloom: 80 }, costScale: 1.55, max: 50, effect: (lvl) => ({ lootMult: 1 + lvl * 0.05 }) },
  { id: "grimoire", name: "Grimoire Bookmark", desc: "+10% DPS per level. Never lose your place again.", baseCost: { souls: 150, crystal: 5 }, costScale: 1.6, max: 50, effect: (lvl) => ({ dpsMult: 1 + lvl * 0.1 }) },
  { id: "banner", name: "Tattered War Banner", desc: "+10% Max HP per level. Inspires mild dread.", baseCost: { bones: 300, souls: 200 }, costScale: 1.6, max: 50, effect: (lvl) => ({ hpMult: 1 + lvl * 0.1 }) },
];

export const defaultState = {
  version: 7,
  stage: 1,
  killsThisStage: 0,
  totalKills: 0,
  hero: { baseMaxHP: 30, baseDPS: 2, hp: 30 },
  resources: { souls: 0, bones: 0, gloom: 0, crystal: 0 },
  items: BASE_ITEMS.map((i) => ({ id: i.id, level: 0 })),
  enemy: null,
  log: ["You awake in a damp corridor. HR requests your immediate demise—purely procedural."],
  settings: { healCostSouls: 10 },
};
