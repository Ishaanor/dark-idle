import EnemyArt from "./EnemyArt.jsx";
import PlayerArt from "./PlayerArt.jsx";

export default function FightPanel({ state, stats, atlas, onHit, onHeal, attacking }) {
  const enemy = state.enemy;
  if (!enemy) return null;

  const enemyPct = Math.max(0, Math.floor((enemy.hp / (enemy.maxHP || 1)) * 100));
  const hpPct = Math.max(0, Math.floor((state.hero.hp / (stats.maxHP || 1)) * 100));

  const hpColor =
    hpPct > 50 ? "from-green-600 to-green-700" : hpPct > 25 ? "from-amber-500 to-amber-600" : "from-red-600 to-red-700";
  const enemyColor =
    enemyPct > 50 ? "from-green-600 to-green-700" : enemyPct > 25 ? "from-amber-500 to-amber-600" : "from-red-600 to-red-700";

  return (
    <div className="mt-2 rounded-xl p-4 sm:p-6 bg-white/80 dark:bg-black/60 border border-slate-300/60 dark:border-white/10 overflow-hidden backdrop-blur-sm">
      {/* Titles */}
      <div className="grid grid-cols-2 justify-items-center gap-2 sm:gap-6">
        <div className="w-full flex flex-col items-center">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-300 mb-1 sm:mb-2">Enemy</div>
          <div className="text-xl sm:text-2xl font-bold leading-tight text-center break-words">
            {enemy.name}
            {enemy.isBoss && (
              <span className="ml-2 text-[#b11e2f] text-[10px] sm:text-xs font-bold bg-[#b11e2f]/10 px-2 py-0.5 rounded-full border border-[#b11e2f]/30 align-middle">
                BOSS
              </span>
            )}
          </div>
        </div>
        <div className="w-full flex flex-col items-center">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-300 mb-1 sm:mb-2">You</div>
          <div className="text-xl sm:text-2xl font-bold leading-tight text-center">The Protagonist</div>
        </div>
      </div>

      {/* Avatars + centred VS (side-by-side even on mobile) */}
      <div className="relative mt-3 grid grid-cols-2 items-center justify-items-center gap-3 sm:gap-8">
        <div className="relative w-36 h-36 xs:w-44 xs:h-44 sm:w-56 sm:h-56 md:w-64 md:h-64">
          <div className="absolute inset-0 rounded-full overflow-hidden bg-black/40 border border-white/10">
            <EnemyArt enemy={enemy} atlas={atlas} />
          </div>
          <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-black/90 border border-slate-300/60 dark:border-white/10 flex flex-col items-center justify-center shadow">
            <div className="text-[9px] sm:text-[10px] uppercase opacity-70 leading-none">DPS</div>
            <div className="text-base sm:text-xl font-bold leading-tight">{Math.floor(enemy.dps)}</div>
          </div>
        </div>

        <div className="relative w-36 h-36 xs:w-44 xs:h-44 sm:w-56 sm:h-56 md:w-64 md:h-64">
          <div className="absolute inset-0 rounded-full overflow-hidden bg-black/40 border border-white/10">
            <PlayerArt attacking={attacking} />
          </div>
          <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-black/90 border border-slate-300/60 dark:border-white/10 flex flex-col items-center justify-center shadow">
            <div className="text-[9px] sm:text-[10px] uppercase opacity-70 leading-none">DPS</div>
            <div className="text-base sm:text-xl font-bold leading-tight">{Math.floor(stats.dps)}</div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-2xl sm:text-4xl font-black opacity-70">VS</div>
        </div>
      </div>

      {/* Bars & stats */}
      <div className="mt-4 grid grid-cols-2 justify-items-center gap-3 sm:gap-8">
        <div className="w-full max-w-xs sm:max-w-sm">
          <div className="h-3 sm:h-4 bg-slate-200/60 dark:bg-black/70 rounded-full overflow-hidden shadow-inner">
            <div className={`h-full bg-gradient-to-r ${enemyColor}`} style={{ width: `${enemyPct}%` }} />
          </div>
          <div className="mt-1 text-xs sm:text-sm opacity-90 text-center">
            HP {Math.floor(enemy.hp)} / {enemy.maxHP}
          </div>
        </div>

        <div className="w-full max-w-xs sm:max-w-sm">
          <div className="h-3 sm:h-4 bg-slate-200/60 dark:bg-black/70 rounded-full overflow-hidden shadow-inner">
            <div className={`h-full bg-gradient-to-r ${hpColor}`} style={{ width: `${hpPct}%` }} />
          </div>
          <div className="mt-1 text-xs sm:text-sm opacity-90 text-center">
            HP {Math.floor(state.hero.hp)} / {stats.maxHP}
          </div>
          <div className="mt-2 text-xs sm:text-sm opacity-90 flex items-center justify-center gap-4 sm:gap-6">
            <div>APS {stats.aps.toFixed(1)}</div>
            <div className="h-3 sm:h-4 w-px bg-white/20" />
            <div>DR {stats.dr}</div>
            <div className="h-3 sm:h-4 w-px bg-white/20" />
            <div>SG {stats.soulsPerSec.toFixed(1)}/s</div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <button
          onClick={onHit}
          className="w-full text-center px-5 py-5 sm:py-6 rounded-xl font-extrabold text-xl sm:text-2xl tracking-wide text-white bg-gradient-to-r from-[#6b0f1a] to-[#3a1d5d] hover:opacity-95 shadow-lg"
        >
          STRIKE
          <div className="mt-1 text-[11px] sm:text-xs font-normal opacity-80">(Space Bar)</div>
        </button>
        <button
          onClick={onHeal}
          disabled={(state.resources.souls || 0) < state.settings.healCostSouls || state.hero.hp === stats.maxHP}
          className="w-full text-center px-5 py-5 sm:py-6 rounded-xl font-extrabold text-xl sm:text-2xl tracking-wide text-white bg-gradient-to-r from-[#3a1d5d] to-[#6b0f1a] disabled:opacity-50 hover:opacity-95 shadow-lg"
        >
          HEAL
          <div className="mt-1 text-[11px] sm:text-xs font-normal opacity-80">
            (Shift) (cost: {state.settings.healCostSouls} souls)
          </div>
        </button>
      </div>
    </div>
  );
}
