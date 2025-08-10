// src/features/game/PlayerArt.jsx
import React, { useEffect, useMemo } from "react";

// Bundle from src/assets so Vite always resolves them
import idleBundled from "../../assets/player.gif";
import attackBundled from "../../assets/player_attack.gif";

/**
 * Renders the player's sprite; swaps GIF while `attacking` is true.
 * Purely visual — does not touch game state or cloud saves.
 * Falls back to /public paths if bundled assets are missing.
 */
export default function PlayerArt({
  attacking = false,
  // Optional overrides
  idleSrcProp,
  attackSrcProp,
}) {
  // Resolve final sources with graceful fallbacks
  const idleSrc = useMemo(
    () => idleSrcProp || idleBundled || "/player.gif",
    [idleSrcProp]
  );
  const attackSrc = useMemo(
    () => attackSrcProp || attackBundled || "/player_attack.gif",
    [attackSrcProp]
  );

  // Preload both to avoid first-swap flicker
  useEffect(() => {
    const i1 = new Image(); i1.src = idleSrc;
    const i2 = new Image(); i2.src = attackSrc;
  }, [idleSrc, attackSrc]);

  const src = attacking ? attackSrc : idleSrc;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        src={src}
        alt="You"
        className="w-[88%] h-[88%] object-contain pointer-events-none select-none transition-opacity duration-75"
        onError={(e) => {
          // If attack GIF fails, fall back to idle; if idle fails, hide gracefully
          if (src !== idleSrc) e.currentTarget.src = idleSrc;
          else e.currentTarget.style.display = "none";
          // Optional: console.warn("PlayerArt: image failed", src);
        }}
      />
    </div>
  );
}
