import React, { useCallback, useEffect, useMemo, useState } from "react";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const fmt = (n) => {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return Math.floor(n).toString();
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const enemyNames = [
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
const bossNames = [
  "HR Lich",
  "The Unpaid Internity",
  "Quartermaster of Shadows",
  "King Bureaucrad IV",
  "Siren of Scope Creep",
  "The Compliance Hydra",
];

const BASE_ITEMS = [
  { id: "dagger", name: "Rusty Shiv of Regret", desc: "+1 DPS per level. Smells like mistakes.", baseCost: { bones: 10 }, costScale: 1.35, max: 100, effect: (lvl) => ({ dpsFlat: lvl * 1 }) },
  { id: "helm", name: "Spiked Helm of Overthinking", desc: "+5 Max HP per level. Mind the spikes.", baseCost: { bones: 20, gloom: 5 }, costScale: 1.4, max: 100, effect: (lvl) => ({ hpFlat: lvl * 5 }) },
  { id: "armor", name: "Graveplate Armour", desc: "-1 damage taken per level.", baseCost: { bones: 50, gloom: 10 }, costScale: 1.45, max: 100, effect: (lvl) => ({ drFlat: lvl * 1 }) },
  { id: "metronome", name: "Metronome of Malice", desc: "+0.2 Attacks/sec per level.", baseCost: { souls: 100, gloom: 30 }, costScale: 1.5, max: 25, effect: (lvl) => ({ apsFlat: lvl * 0.2 }) },
  { id: "totem", name: "Pocket Necromancer", desc: "+0.5 Souls/s per level. He invoices monthly.", baseCost: { souls: 50, gloom: 20 }, costScale: 1.5, max: 50, effect: (lvl) => ({ soulsPerSec: lvl * 0.5 }) },
  { id: "ink", name: "Bottle of Bureaucratic Ink", desc: "+5% loot per level. Now in Eternal Black.", baseCost: { bones: 100, gloom: 80 }, costScale: 1.55, max: 50, effect: (lvl) => ({ lootMult: 1 + lvl * 0.05 }) },
  { id: "grimoire", name: "Grimoire Bookmark", desc: "+10% DPS per level. Never lose your place again.", baseCost: { souls: 150, crystal: 5 }, costScale: 1.6, max: 50, effect: (lvl) => ({ dpsMult: 1 + lvl * 0.1 }) },
  { id: "banner", name: "Tattered War Banner", desc: "+10% Max HP per level. Inspires mild dread.", baseCost: { bones: 300, souls: 200 }, costScale: 1.6, max: 50, effect: (lvl) => ({ hpMult: 1 + lvl * 0.1 }) },
];

const defaultState = {
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

function rollName(list) {
  return list[Math.floor(Math.random() * list.length)];
}
function scaleEnemy(stage, isBoss) {
  const base = Math.floor(15 * Math.pow(stage, 1.6) + 10);
  const hp = Math.floor(base * (isBoss ? 6 : 1));
  const dps = Math.max(1, Math.floor(stage * 0.7 + (isBoss ? 2 : 0)));
  return { name: isBoss ? rollName(bossNames) : rollName(enemyNames), maxHP: hp, hp, dps, isBoss };
}

function calcStats(state) {
  const itemsById = Object.fromEntries(BASE_ITEMS.map((i) => [i.id, i]));
  let dpsFlat = 0,
    dpsMult = 1,
    hpFlat = 0,
    hpMult = 1,
    lootMult = 1,
    soulsPerSec = 0,
    drFlat = 0,
    apsFlat = 0;
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

function costFor(itemId, level) {
  const base = BASE_ITEMS.find((i) => i.id === itemId);
  if (!base) return {};
  const scale = Math.pow(base.costScale, level);
  const out = {};
  for (const [k, v] of Object.entries(base.baseCost)) out[k] = Math.ceil(v * scale);
  return out;
}
function canAfford(resources, cost) {
  return Object.entries(cost).every(([k, v]) => (resources[k] || 0) >= v);
}
function pay(resources, cost) {
  const next = { ...resources };
  for (const [k, v] of Object.entries(cost)) next[k] = (next[k] || 0) - v;
  return next;
}
function addLog(state, msg) {
  return { ...state, log: [msg, ...state.log].slice(0, 50) };
}

function useAtlas(xmlPath) {
  const [atlas, setAtlas] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const xmlText = await fetch(xmlPath).then((r) => r.text());
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "application/xml");
        const tex = xml.querySelector("TextureAtlas");
        if (!tex) return;
        const imagePath = tex.getAttribute("imagePath");
        const img = new Image();
        img.src = imagePath;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });
        const subs = {};
        tex.querySelectorAll("SubTexture").forEach((st) => {
          const name = st.getAttribute("name");
          subs[name] = {
            x: +st.getAttribute("x"),
            y: +st.getAttribute("y"),
            width: +st.getAttribute("width"),
            height: +st.getAttribute("height"),
          };
        });
        if (!cancelled) setAtlas({ imagePath, width: img.naturalWidth, height: img.naturalHeight, subs });
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [xmlPath]);
  return atlas;
}

const NAME_TO_SPRITE = {
  Gloomrat: "body_greenB.png",
  "Taxidermied Goblin": "body_darkB.png",
  "Wall-Crawling Auditor": "body_whiteB.png",
  "Spite Wisp": "body_blueC.png",
  "Mildew Knight": "body_yellowD.png",
  "Angry Barrel": "body_redE.png",
  "Coffin Intern": "body_whiteE.png",
  "Mope Drake": "body_blueD.png",
  "Bureaucrat of Doom": "body_darkF.png",
  "Bone Clerk": "body_redB.png",
  _boss: "body_redF.png",
};

function EnemyArt({ enemy, atlas, size = 112 }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const base = slug(enemy.name);
  const prefix = "/";
  const exts = ["webp", "png", "gif", "jpg", "jpeg"];
  const candidates = [
    ...exts.map((ext) => `${prefix}sprites/${base}.${ext}`),
    ...(enemy.isBoss ? ["webp", "png", "jpg", "jpeg"].map((ext) => `${prefix}sprites/boss.${ext}`) : []),
  ];
  useEffect(() => {
    setSrcIdx(0);
  }, [enemy.name]);
  const src = candidates[srcIdx] || null;
  if (src) {
    return (
      <img
        src={src}
        alt={enemy.name}
        width={size}
        height={size}
        className="w-28 h-28 flex-none object-contain rounded-full shadow-inner"
        style={{ imageRendering: "pixelated" }}
        onError={() => setSrcIdx((i) => i + 1)}
      />
    );
  }
  if (atlas) {
    const key = NAME_TO_SPRITE[enemy.name] || (enemy.isBoss ? NAME_TO_SPRITE._boss : null);
    const sub = key ? atlas.subs[key] : null;
    if (sub) {
      const style = {
        width: size,
        height: size,
        backgroundImage: `url(${atlas.imagePath})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `-${sub.x}px -${sub.y}px`,
        backgroundSize: `${atlas.width}px ${atlas.height}px`,
        imageRendering: "pixelated",
        borderRadius: "9999px",
      };
      return <div style={style} className="flex-none shadow-inner" aria-label={enemy.name} />;
    }
  }
  return <EnemySVG boss={enemy.isBoss} />;
}

function PlayerArt({ size = 168 }) {
  return (
    <img
      src="/sprites/player.gif"
      alt="Player"
      width={size}
      height={size}
      className="w-28 h-28 flex-none object-contain rounded-full shadow-inner"
      style={{ imageRendering: "pixelated" }}
    />
  );
}


export default function DarkIdle() {
  const ensureItems = (items) => {
    const map = Object.fromEntries((items || []).map((i) => [i.id, i]));
    return BASE_ITEMS.map((b) => map[b.id] || { id: b.id, level: 0 });
  };
  const [state, setState] = useState(() => {
    const raw = localStorage.getItem("dark-idle-save");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const merged = { ...defaultState, ...parsed };
        merged.items = ensureItems(merged.items);
        merged.version = defaultState.version;
        return merged;
      } catch {}
    }
    const fresh = { ...defaultState };
    fresh.items = ensureItems(fresh.items);
    return fresh;
  });
  const stats = useMemo(() => calcStats(state), [state]);
  const atlas = useAtlas("/spritesheet_default.xml");

  useEffect(() => {
    if (!state.enemy) {
      const isBoss = state.killsThisStage > 0 && state.killsThisStage % 10 === 0;
      setState((s) => ({ ...s, enemy: scaleEnemy(s.stage, isBoss) }));
    }
  }, [state.enemy, state.killsThisStage, state.stage]);
  useEffect(() => {
    localStorage.setItem("dark-idle-save", JSON.stringify(state));
  }, [state]);

  const hit = useCallback(() => {
    setState((s) => {
      const st = calcStats(s);
      if (!s.enemy) return s;
      const clickDmg = Math.max(1, Math.floor(st.dps * 0.5));
      return { ...s, enemy: { ...s.enemy, hp: Math.max(0, s.enemy.hp - clickDmg) } };
    });
  }, []);
  const heal = useCallback(() => {
    setState((s) => {
      const st = calcStats(s);
      const cost = s.settings?.healCostSouls ?? 10;
      if ((s.resources.souls || 0) < cost || s.hero.hp >= st.maxHP) return s;
      return {
        ...s,
        hero: { ...s.hero, hp: st.maxHP },
        resources: { ...s.resources, souls: s.resources.souls - cost },
        log: [`Bandaged wounds (-${cost} souls).`, ...s.log].slice(0, 50),
      };
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        hit();
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        e.preventDefault();
        heal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hit, heal]);

  useEffect(() => {
    const tick = setInterval(() => {
      setState((s) => {
        let next = { ...s };
        const st = calcStats(next);
        next.resources = { ...next.resources, souls: (next.resources.souls || 0) + st.soulsPerSec };
        if (next.enemy) {
          const dmg = Math.max(0, Math.floor(st.dps * st.aps));
          next.enemy = { ...next.enemy, hp: Math.max(0, next.enemy.hp - dmg) };
          const enemyDmg = next.enemy.dps;
          const damageTaken = Math.max(0, Math.floor(enemyDmg - st.dr));
          const newHP = clamp(Math.floor((next.hero.hp ?? st.maxHP) - damageTaken), 0, st.maxHP);
          next.hero = { ...next.hero, hp: newHP };
          if (next.enemy.hp <= 0) {
            const bonesGain = Math.ceil((3 + Math.random() * 3) * st.lootMult * (next.enemy.isBoss ? 5 : 1));
            const gloomChance = next.enemy.isBoss ? 0.45 : 0.35;
            const gloomGain =
              Math.random() < gloomChance
                ? Math.ceil((1 + Math.random() * 2) * st.lootMult * (next.enemy.isBoss ? 3 : 1))
                : 0;
            const soulGain = Math.ceil((2 + Math.random() * 4) * st.lootMult * (next.enemy.isBoss ? 4 : 1));
            const crystalGain = next.enemy.isBoss && Math.random() < 0.35 ? 1 : 0;
            next.resources = {
              ...next.resources,
              bones: (next.resources.bones || 0) + bonesGain,
              gloom: (next.resources.gloom || 0) + gloomGain,
              souls: (next.resources.souls || 0) + soulGain,
              crystal: (next.resources.crystal || 0) + crystalGain,
            };
            next.totalKills += 1;
            next.killsThisStage += 1;
            const isBossNow = next.killsThisStage > 0 && next.killsThisStage % 10 === 0;
            const parts = [];
            if (bonesGain) parts.push(`🦴 +${bonesGain} Bones`);
            if (gloomGain) parts.push(`🌑 +${gloomGain} Gloom`);
            if (soulGain) parts.push(`🕯️ +${soulGain} Souls`);
            if (crystalGain) parts.push(`💎 +${crystalGain} Crystal${crystalGain > 1 ? "s" : ""}`);
            const lootMsg = parts.join(" • ");
            if (next.enemy.isBoss) {
              next = addLog(next, `Boss down: ${next.enemy.name}! ${lootMsg}`);
              next.enemy = null;
              next.killsThisStage = 0;
              next.stage += 1;
              next.hero = { ...next.hero, hp: st.maxHP };
            } else {
              next = addLog(next, `Defeated ${next.enemy.name}. ${lootMsg}`);
              next.enemy = scaleEnemy(next.stage, isBossNow);
            }
          } else if (newHP <= 0) {
            const soulsLost = Math.floor((next.resources.souls || 0) * 0.2);
            const bonesLost = Math.floor((next.resources.bones || 0) * 0.1);
            const gloomLost = Math.random() < 0.5 ? Math.floor((next.resources.gloom || 0) * 0.05) : 0;
            const crystalLost = 0;
            next.resources = {
              souls: Math.max(0, (next.resources.souls || 0) - soulsLost),
              bones: Math.max(0, (next.resources.bones || 0) - bonesLost),
              gloom: Math.max(0, (next.resources.gloom || 0) - gloomLost),
              crystal: next.resources.crystal || 0,
            };
            next.stage = Math.max(1, next.stage - 1);
            next.killsThisStage = 0;
            next.hero = { ...next.hero, hp: st.maxHP };
            next.enemy = scaleEnemy(next.stage, false);
            next = addLog(
              next,
              `You died. Demoted to Stage ${next.stage}. Lost 🕯️-${soulsLost} • 🦴-${bonesLost} • 🌑-${gloomLost} • 💎-${crystalLost}. HR reminds you: diamonds are forever.`
            );
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const progressPct = ((state.killsThisStage % 10) / 10) * 100;
  const hpPct = Math.max(0, Math.floor((state.hero.hp / stats.maxHP) * 100));
  const hpColor =
    hpPct > 50 ? "from-green-600 to-green-700" : hpPct > 25 ? "from-amber-500 to-amber-600" : "from-red-600 to-red-700";
  const enemy = state.enemy;
  const enemyPct = enemy ? Math.max(0, Math.floor((enemy.hp / enemy.maxHP) * 100)) : 100;
  const enemyColor =
    enemyPct > 50 ? "from-green-600 to-green-700" : enemyPct > 25 ? "from-amber-500 to-amber-600" : "from-red-600 to-red-700";
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="min-h-screen relative text-slate-900 dark:text-gray-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200 dark:from-[#0b0c10] dark:via-[#08090c] dark:to-black">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <header className="flex flex-col gap-2 md:gap-3">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Dark Idle</h1>
        </header>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1">Stage Progress</div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-slate-600 dark:text-gray-300">
            <span className="rounded-2xl px-4 py-2 bg-gradient-to-r from-[#6b0f1a] to-[#3a1d5d] text-white text-sm font-black shadow">
              Stage {state.stage}
            </span>
            <div className="flex-1 h-3 bg-slate-200 dark:bg-black/70 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#6b0f1a] to-[#3a1d5d]" style={{ width: `${progressPct}%` }} />
            </div>
            <span>{state.killsThisStage % 10}/10</span>
          </div>
        </div>

        <main className="mt-6 w-full">
          <section>
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/60 border border-slate-300/60 dark:border-white/10 shadow-2xl backdrop-blur-sm">
              {enemy && (
  <div className="mt-3 rounded-xl p-6 bg-white/80 dark:bg-black/60 border border-slate-300/60 dark:border-white/10 overflow-hidden backdrop-blur-sm">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
      {/* Enemy column */}
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-gray-300 mb-2">Enemy</div>
        <div className="text-2xl font-bold mb-4">
          {enemy.name}
          {enemy.isBoss && (
            <span className="ml-2 text-[#b11e2f] text-xs font-bold bg-[#b11e2f]/10 px-2 py-0.5 rounded-full border border-[#b11e2f]/30 align-middle">
              BOSS
            </span>
          )}
        </div>

        <div className="relative mx-auto w-56 h-56 rounded-full flex items-center justify-center bg-black/40 border border-white/10">
          {atlas ? <EnemyArt enemy={enemy} atlas={atlas} size={192} /> : <EnemySVG boss={enemy.isBoss} />}
          <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/95 dark:bg-black/90 border border-slate-300/60 dark:border-white/10 flex flex-col items-center justify-center shadow">
            <div className="text-[10px] uppercase opacity-70 leading-none">DPS</div>
            <div className="text-xl font-bold leading-tight">{Math.floor(enemy.dps)}</div>
          </div>
        </div>

        <div className="mt-5 max-w-sm mx-auto">
          <div className="h-4 bg-slate-200/60 dark:bg-black/70 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${enemyColor}`}
              style={{ width: `${enemyPct}%` }}
            />
          </div>
          <div className="mt-1 text-sm opacity-90">HP {Math.floor(enemy.hp)} / {enemy.maxHP}</div>
        </div>
      </div>

      {/* VS */}
      <div className="hidden lg:flex items-center justify-center">
        <div className="text-4xl font-black opacity-70 select-none">VS</div>
      </div>

      {/* Player column */}
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-gray-300 mb-2">You</div>
        <div className="text-2xl font-bold mb-4">The Protagonist</div>

        <div className="relative mx-auto w-56 h-56 rounded-full flex items-center justify-center bg-black/40 border border-white/10">
          <PlayerSVG />
          <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/95 dark:bg-black/90 border border-slate-300/60 dark:border-white/10 flex flex-col items-center justify-center shadow">
            <div className="text-[10px] uppercase opacity-70 leading-none">DPS</div>
            <div className="text-xl font-bold leading-tight">{Math.floor(stats.dps)}</div>
          </div>
        </div>

        <div className="mt-5 max-w-sm mx-auto">
          <div className="h-4 bg-slate-200/60 dark:bg-black/70 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${hpColor}`}
              style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
            />
          </div>
          <div className="mt-1 text-sm opacity-90">HP {Math.floor(state.hero.hp)} / {stats.maxHP}</div>
        </div>

        <div className="mt-4 text-sm opacity-90 flex items-center justify-center gap-6">
          <div>APS {stats.aps.toFixed(1)}</div>
          <div className="h-4 w-px bg-white/20" />
          <div>DR {stats.dr}</div>
          <div className="h-4 w-px bg-white/20" />
          <div>SG {stats.soulsPerSec.toFixed(1)}/s</div>
        </div>
      </div>
    </div>

    {/* Big bottom buttons */}
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <button
        onClick={hit}
        className="w-full text-center px-6 py-6 rounded-xl font-extrabold text-2xl tracking-wide text-white bg-gradient-to-r from-[#6b0f1a] to-[#3a1d5d] hover:opacity-95 shadow-lg"
      >
        STRIKE
        <div className="mt-1 text-xs font-normal opacity-80">(Space Bar)</div>
      </button>
      <button
        onClick={heal}
        disabled={(state.resources.souls || 0) < state.settings.healCostSouls || state.hero.hp === stats.maxHP}
        className="w-full text-center px-6 py-6 rounded-xl font-extrabold text-2xl tracking-wide text-white bg-gradient-to-r from-[#3a1d5d] to-[#6b0f1a] disabled:opacity-50 hover:opacity-95 shadow-lg"
      >
        HEAL
        <div className="mt-1 text-xs font-normal opacity-80">(Shift) (cost: {state.settings.healCostSouls} souls)</div>
      </button>
    </div>
  </div>
)}

            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-semibold">Resources</h3>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Res label="Souls" icon="🕯️" value={fmt(state.resources.souls)} />
              <Res label="Bones" icon="🦴" value={fmt(state.resources.bones)} />
              <Res label="Gloom" icon="🌑" value={fmt(state.resources.gloom)} />
              <Res label="Crystal" icon="💎" value={fmt(state.resources.crystal)} />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-semibold">Crafting</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {BASE_ITEMS.map((it) => {
                const owned = state.items.find((i) => i.id === it.id)?.level || 0;
                const price = costFor(it.id, owned);
                const afford = canAfford(state.resources, price) && owned < it.max;
                return (
                  <div
                    key={it.id}
                    onClick={() =>
                      setState((s) => {
                        const def = BASE_ITEMS.find((x) => x.id === it.id);
                        const cur = s.items.find((x) => x.id === it.id) || { id: it.id, level: 0 };
                        if (!def) return s;
                        if (cur.level >= def.max) return s;
                        const p = costFor(it.id, cur.level);
                        if (!canAfford(s.resources, p)) return s;
                        const nextItems = s.items.map((x) => (x.id === it.id ? { ...x, level: x.level + 1 } : x));
                        const nextResources = pay(s.resources, p);
                        return addLog(
                          { ...s, items: nextItems, resources: nextResources },
                          `Crafted ${def.name} (Lv.${cur.level + 1}). The smell of victory and rust.`
                        );
                      })
                    }
                    className={`p-4 rounded-xl border transition ${
                      afford
                        ? "cursor-pointer text-white bg-gradient-to-r from-emerald-700 to-emerald-800 hover:opacity-95 border-white/20"
                        : "cursor-not-allowed bg-white/60 dark:bg-black/40 text-slate-600 dark:text-gray-400 border-slate-300/60 dark:border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {it.name} <span className="text-xs text-slate-500 dark:text-gray-400">Lv.{owned}/{it.max}</span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-gray-300">{it.desc}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                          Cost: {Object.entries(price).map(([k, v]) => `${k}:${fmt(v)}`).join(" • ")}
                        </div>
                      </div>
                      <div className="text-xs font-semibold opacity-80">{afford ? "Ready" : "Locked"}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => {
                  if (!confirm("Reset all progress?")) return;
                  localStorage.removeItem("dark-idle-save");
                  window.location.reload();
                }}
                className="text-xs px-3 py-2 rounded bg-white/70 dark:bg-black/40 text-slate-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-black/50 border border-slate-300/60 dark:border-white/10"
              >
                Reset
              </button>
              <span className="text-xs text-slate-500 dark:text-gray-400">Auto-saves every tick</span>
            </div>
          </section>
        </main>

        <div className="mt-6 rounded-xl bg-white/80 dark:bg-black/60 border border-slate-300/60 dark:border-white/10 p-3 text-xs text-slate-600 dark:text-gray-300 flex items-center gap-4">
          <span>Controls:</span>
          <span className="px-2 py-1 rounded bg-white/70 dark:bg-black/40 border border-slate-300/60 dark:border-white/10">Space</span>
          <span>Strike</span>
          <span className="px-2 py-1 rounded bg-white/70 dark:bg-black/40 border border-slate-300/60 dark:border-white/10">Shift</span>
          <span>Bandage (-{state.settings.healCostSouls} souls)</span>
        </div>

        <footer className="mt-6 text-xs text-slate-500 dark:text-gray-400">
          <p>Tip: Every 10th kill is a boss.</p>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/80 dark:bg-black/60 border border-slate-300/60 dark:border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function Res({ label, value, icon }) {
  return (
    <div className="rounded-lg bg-white/70 dark:bg-black/40 border border-slate-300/60 dark:border-white/10 px-3 py-2 flex items-center justify-between">
      <span className="text-slate-700 dark:text-gray-300">
        {icon} {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function EnemySVG({ boss }) {
  return boss ? (
    <BossSVG />
  ) : (
    <svg viewBox="0 0 120 120" className="w-28 h-28 flex-none">
      <defs>
        <radialGradient id="g1" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#6b4a8e" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#221436" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="48" fill="url(#g1)" stroke="#5b2a86" strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="45" cy="55" r="6" fill="#fff" />
      <circle cx="75" cy="55" r="6" fill="#fff" />
      <path d="M40,80 Q60,65 80,80" stroke="#b11e2f" strokeWidth="4" fill="none" />
      <path d="M28 40 L92 40" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
      <text x="60" y="110" textAnchor="middle" fontSize="10" fill="#8f5da2">
        gloomblob
      </text>
    </svg>
  );
}

function BossSVG() {
  return (
    <svg viewBox="0 0 140 140" className="w-32 h-32 flex-none">
      <defs>
        <radialGradient id="g2" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#b11e2f" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3a1d5d" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <rect x="10" y="25" width="120" height="90" rx="18" fill="url(#g2)" stroke="#b11e2f" strokeOpacity="0.6" strokeWidth="2" />
      <circle cx="50" cy="60" r="8" fill="#fff" />
      <circle cx="90" cy="60" r="8" fill="#fff" />
      <path d="M45,90 C60,75 80,75 95,90" stroke="#3a1d5d" strokeWidth="5" fill="none" />
      <path d="M30 35 L110 35" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
      <polygon points="65,22 75,22 70,10" fill="#b08d57" />
      <text x="70" y="120" textAnchor="middle" fontSize="10" fill="#b08d57">
        middle-management demon
      </text>
    </svg>
  );
}

function PlayerSVG() {
  return (
    <svg viewBox="0 0 120 140" className="w-28 h-32 flex-none">
      <defs>
        <linearGradient id="pg" x1="0" x2="1">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="45" r="28" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="3" />
      <rect x="28" y="78" width="64" height="44" rx="10" fill="url(#pg)" stroke="#475569" strokeWidth="3" />
      <circle cx="48" cy="42" r="5" fill="#0f172a" />
      <circle cx="72" cy="42" r="5" fill="#0f172a" />
      <path d="M45,58 Q60,52 75,58" stroke="#0f172a" strokeWidth="4" fill="none" />
    </svg>
  );
}
