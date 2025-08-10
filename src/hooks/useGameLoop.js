import { useEffect } from "react";

/**
 * Enemy spawn, 1s tick, hotkeys.
 * Guards:
 *  - Player damage resolves first; if enemy dies, it does NOT hit back.
 *  - Monotonic enemy HP: for the same enemy, HP can never increase.
 *  - If enemy DPS <= DR, we skip hero-damage updates altogether.
 */
export default function useGameLoop({ state, setState, calcStats, scaleEnemy, addLog, clamp, onHit, onHeal }) {
  // Spawn if missing
  useEffect(() => {
    if (!state.enemy) {
      const isBoss = state.killsThisStage > 0 && state.killsThisStage % 10 === 0;
      // tag each enemy so we can reason about "same enemy"
      setState((s) => ({ ...s, enemy: { ...scaleEnemy(s.stage, isBoss), _uid: cryptoRandom() } }));
    }
  }, [state.enemy, state.killsThisStage, state.stage, setState, scaleEnemy]);

  // Main loop (1s)
  useEffect(() => {
    const timer = setInterval(() => {
      setState((s) => {
        let next = { ...s };
        const st = calcStats(next);

        // Passive souls
        next.resources = { ...next.resources, souls: (next.resources.souls || 0) + st.soulsPerSec };

        const enemy = next.enemy;
        if (!enemy) return next;

        // 1) You hit first
        const dmg = Math.max(0, Math.floor(st.dps * st.aps));
        let hpAfterYourHit = Math.max(0, (enemy.hp || 0) - dmg);

        // Monotonic guard: never increase HP for the same enemy
        if (hpAfterYourHit > enemy.hp) hpAfterYourHit = enemy.hp;

        next.enemy = { ...enemy, hp: hpAfterYourHit };

        // If enemy died from your hit, resolve and return early
        if (hpAfterYourHit <= 0) {
          const lootMult = st.lootMult;
          const isBoss = enemy.isBoss;
          const bonesGain = Math.ceil((3 + Math.random() * 3) * lootMult * (isBoss ? 5 : 1));
          const gloomChance = isBoss ? 0.45 : 0.35;
          const gloomGain = Math.random() < gloomChance ? Math.ceil((1 + Math.random() * 2) * lootMult * (isBoss ? 3 : 1)) : 0;
          const soulGain = Math.ceil((2 + Math.random() * 4) * lootMult * (isBoss ? 4 : 1));
          const crystalGain = isBoss && Math.random() < 0.35 ? 1 : 0;

          next.resources = {
            ...next.resources,
            bones: (next.resources.bones || 0) + bonesGain,
            gloom: (next.resources.gloom || 0) + gloomGain,
            souls: (next.resources.souls || 0) + soulGain,
            crystal: (next.resources.crystal || 0) + crystalGain,
          };
          next.totalKills += 1;
          next.killsThisStage += 1;

          const parts = [];
          if (bonesGain) parts.push(`🦴 +${bonesGain} Bones`);
          if (gloomGain) parts.push(`🌑 +${gloomGain} Gloom`);
          if (soulGain) parts.push(`🕯️ +${soulGain} Souls`);
          if (crystalGain) parts.push(`💎 +${crystalGain} Crystal${crystalGain > 1 ? "s" : ""}`);
          const lootMsg = parts.join(" • ");

          if (isBoss) {
            next = addLog(next, `Boss down: ${enemy.name}! ${lootMsg}`);
            next.enemy = null;
            next.killsThisStage = 0;
            next.stage += 1;
            next.hero = { ...next.hero, hp: st.maxHP };
          } else {
            const isBossNext = next.killsThisStage > 0 && next.killsThisStage % 10 === 0;
            next = addLog(next, `Defeated ${enemy.name}. ${lootMsg}`);
            next.enemy = { ...scaleEnemy(next.stage, isBossNext), _uid: cryptoRandom() };
          }
          return next; // early return: no counter-hit on death tick
        }

        // 2) Enemy survived → only hit the hero if it can actually deal damage
        const rawHit = Math.floor((enemy.dps || 0) - st.dr);
        if (rawHit > 0) {
          const newHP = clamp(Math.floor((next.hero.hp ?? st.maxHP) - rawHit), 0, st.maxHP);
          next.hero = { ...next.hero, hp: newHP };

          if (newHP <= 0) {
            const soulsLost = Math.floor((next.resources.souls || 0) * 0.2);
            const bonesLost = Math.floor((next.resources.bones || 0) * 0.1);
            const gloomLost = Math.random() < 0.5 ? Math.floor((next.resources.gloom || 0) * 0.05) : 0;

            next.resources = {
              souls: Math.max(0, (next.resources.souls || 0) - soulsLost),
              bones: Math.max(0, (next.resources.bones || 0) - bonesLost),
              gloom: Math.max(0, (next.resources.gloom || 0) - gloomLost),
              crystal: next.resources.crystal || 0,
            };
            next.stage = Math.max(1, next.stage - 1);
            next.killsThisStage = 0;
            next.hero = { ...next.hero, hp: st.maxHP };
            next.enemy = { ...scaleEnemy(next.stage, false), _uid: cryptoRandom() };
            next = addLog(
              next,
              `You died. Demoted to Stage ${next.stage}. Lost 🕯️-${soulsLost} • 🦴-${bonesLost} • 🌑-${gloomLost}. HR reminds you: diamonds are forever.`
            );
          }
        }

        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [setState, calcStats, scaleEnemy, addLog, clamp]);

  // Hotkeys
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        onHit?.();
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        e.preventDefault();
        onHeal?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHit, onHeal]);
}

// Small helper (no crypto API assumptions)
function cryptoRandom() {
  try {
    const a = new Uint32Array(1);
    (self.crypto || window.crypto).getRandomValues(a);
    return `${Date.now()}-${a[0]}`;
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}
