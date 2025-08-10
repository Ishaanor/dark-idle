import React from "react";

export default function CraftCard({ item, level, price, canBuy, fmt = (n) => n, onClick }) {
  const classes = canBuy
    ? "cursor-pointer text-white bg-gradient-to-r from-emerald-700 to-emerald-800 hover:opacity-95 border-white/20"
    : "cursor-not-allowed bg-white/60 dark:bg-black/40 text-slate-600 dark:text-gray-400 border-slate-300/60 dark:border-white/10";

  return (
    <div
      role="button"
      tabIndex={canBuy ? 0 : -1}
      aria-disabled={!canBuy}
      onClick={canBuy ? onClick : undefined}
      onKeyDown={(e) => {
        if (!canBuy) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`p-4 rounded-xl border transition ${classes}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">
            {item.name}{" "}
            <span className="text-xs text-slate-500 dark:text-gray-400">Lv.{level}/{item.max}</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-gray-300">{item.desc}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Cost: {Object.entries(price).map(([k, v]) => `${k}:${fmt(v)}`).join(" • ")}
          </div>
        </div>
        <div className="text-xs font-semibold opacity-80">{canBuy ? "Ready" : "Locked"}</div>
      </div>
    </div>
  );
}
