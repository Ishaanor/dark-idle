import React, { useEffect, useState } from "react";
import { slug } from "./logic";

// Name -> atlas sprite fallback
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

export default function EnemyArt({ enemy, atlas }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const base = slug(enemy.name);
  const exts = ["gif", "webp", "png", "jpg", "jpeg"];
  const candidates = [
    ...exts.map((ext) => `/sprites/${base}.${ext}`),
    ...(enemy.isBoss ? exts.map((ext) => `/sprites/boss.${ext}`) : []),
  ];

  useEffect(() => setSrcIdx(0), [enemy.name]);
  const src = candidates[srcIdx] || null;

  if (src) {
    return (
      <img
        src={src}
        alt={enemy.name}
        className="absolute inset-0 w-full h-full object-cover rounded-full"
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
        backgroundImage: `url(${atlas.imagePath})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `-${sub.x}px -${sub.y}px`,
        backgroundSize: `${atlas.width}px ${atlas.height}px`,
        imageRendering: "pixelated",
      };
      return <div className="absolute inset-0 rounded-full" style={style} aria-label={enemy.name} />;
    }
  }
  return <EnemySVG boss={enemy.isBoss} />;
}

export function PlayerArt() {
  const [srcIdx, setSrcIdx] = useState(0);
  const exts = ["gif", "webp", "png", "jpg", "jpeg"];
  const candidates = exts.map((ext) => `/sprites/player.${ext}`);
  const src = candidates[srcIdx] || null;

  if (src) {
    return (
      <img
        src={src}
        alt="Player"
        className="absolute inset-0 w-full h-full object-cover rounded-full"
        style={{ imageRendering: "pixelated" }}
        onError={() => setSrcIdx((i) => i + 1)}
      />
    );
  }
  return <PlayerSVG />;
}

/* --- SVG fallbacks --- */
export function PlayerSVG() {
  return (
    <svg viewBox="0 0 120 140" className="absolute inset-0 w-full h-full">
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

export function EnemySVG({ boss }) {
  return boss ? (
    <BossSVG />
  ) : (
    <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full">
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
    </svg>
  );
}

export function BossSVG() {
  return (
    <svg viewBox="0 0 140 140" className="absolute inset-0 w-full h-full">
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
    </svg>
  );
}
