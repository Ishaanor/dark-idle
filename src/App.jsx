import React, { useCallback, useMemo, useState } from "react";
import Auth from "./Auth";

// Game data/logic
import { BASE_ITEMS, defaultState } from "./features/game/constants.js";
import {
  clamp,
  fmt,
  calcStats,
  scaleEnemy,
  costFor,
  canAfford,
  pay,
  addLog,
} from "./features/game/logic.js";

// Sprites & UI bits
import useAtlas from "./features/sprites/useAtlas.js";
import LootLog from "./features/game/LootLog.jsx";
import CraftCard from "./features/game/CraftCard.jsx";
import Resources from "./features/game/Resources.jsx";
import FightPanel from "./features/game/FightPanel.jsx";

// Hooks
import useGameLoop from "./hooks/useGameLoop.js";
import useCloudSync from "./features/sync/useCloudSync.js";

/* ---------- main component ---------- */
export default function DarkIdle() {
  // Make ensureItems stable so useCloudSync deps don't thrash
  const ensureItems = useCallback((items) => {
    const map = Object.fromEntries((items || []).map((i) => [i.id, i]));
    return BASE_ITEMS.map((b) => map[b.id] || { id: b.id, level: 0 });
  }, []);

  // initial state from local
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

  /* ---------- cloud sync (hook) ---------- */
  const { userId, syncReady, lastSyncAt, upsertNow } = useCloudSync({
    state,
    setState,
    defaultState,
    ensureItems,
  });
  // (userId/syncReady/upsertNow are available if you want UI for them later)

  /* ---------- actions (clicks) ---------- */
  const hit = useCallback(() => {
    setState((s) => {
      if (!s.enemy) return s;
      const st = calcStats(s);
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

  /* ---------- game loop (spawns, 1s tick, hotkeys) ---------- */
  useGameLoop({
    state,
    setState,
    calcStats,
    scaleEnemy,
    addLog,
    clamp,
    onHit: hit,
    onHeal: heal,
  });

  /* ---------- UI state ---------- */
  const [showInfo, setShowInfo] = useState(false);
  const progressPct = ((state.killsThisStage % 10) / 10) * 100;

  /* ---------- render ---------- */
  return (
   <div
  className="min-h-screen relative text-slate-900 dark:text-gray-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200 dark:from-[#0b0c10] dark:via-[#08090c] dark:to-black"
  style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
>

      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Dark Idle</h1>
          <div className="shrink-0">
            {/* Pass lastSyncAt so Auth can show “Last sync …” */}
            <Auth lastSyncAt={lastSyncAt} />
          </div>
        </header>

        {/* Stage progress */}
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
          {/* Fight panel card */}
          <section>
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/60 border border-slate-300/60 dark:border-white/10 shadow-2xl backdrop-blur-sm">
              <FightPanel state={state} stats={stats} atlas={atlas} onHit={hit} onHeal={heal} />
              <LootLog log={state.log} />
            </div>
          </section>

          {/* Resources */}
          <section className="mt-6">
            <h3 className="text-lg font-semibold">Resources</h3>
            <Resources resources={state.resources} fmt={fmt} />
          </section>

          {/* Crafting */}
          <section className="mt-6">
            <h3 className="text-lg font-semibold">Crafting</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {BASE_ITEMS.map((it) => {
                const owned = state.items.find((i) => i.id === it.id)?.level || 0;
                const price = costFor(it.id, owned);
                const afford = canAfford(state.resources, price) && owned < it.max;

                return (
                  <CraftCard
                    key={it.id}
                    item={it}
                    level={owned}
                    price={price}
                    canBuy={afford}
                    fmt={fmt}
                    onClick={() =>
                      setState((s) => {
                        const def = BASE_ITEMS.find((x) => x.id === it.id);
                        const cur = s.items.find((x) => x.id === it.id) || { id: it.id, level: 0 };
                        if (!def || cur.level >= def.max) return s;
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
                  />
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
              <span className="text-xs text-slate-500 dark:text-gray-400">Auto-saves every few seconds</span>
            </div>
          </section>

          {/* Collapsible info */}
          <section className="mt-6">
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-[#3a1d5d] to-[#6b0f1a] border border-white/10"
              aria-expanded={showInfo}
              aria-controls="game-info"
            >
              {showInfo ? "Hide Info" : "Show Info"}
            </button>

            {showInfo && (
              <div id="game-info" className="mt-3 space-y-3">
                {/* (Optional info content) */}
              </div>
            )}
          </section>
        </main>

        {/* Controls & tip */}
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
