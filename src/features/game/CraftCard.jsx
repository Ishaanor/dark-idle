import React from "react";

export default function CraftCard({ item, level, price, canBuy, fmt, onClick }) {
  const isMaxed = level >= item.max;
  const isAffordable = canBuy && !isMaxed;

  const costText = Object.entries(price)
    .map(([k, v]) => `${k}:${fmt(v)}`)
    .join(" • ");

  const base = [
    "group p-4 sm:p-5 rounded-2xl border transition shadow-sm",
    // Light mode base / hover
    isAffordable
      ? "bg-emerald-50/80 hover:bg-emerald-50 border-emerald-200 hover:shadow-md"
      : "bg-white hover:bg-white border-slate-200 hover:shadow-md",
    // Dark mode base / hover
    "dark:border-white/10",
    isAffordable
      ? "dark:bg-gradient-to-r dark:from-emerald-700 dark:to-emerald-800"
      : "dark:bg-black/40",
    // Interactivity
    isAffordable ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50" : "cursor-not-allowed",
  ].join(" ");

  const titleClass = [
    "font-semibold",
    "text-slate-800",
    "dark:text-white",
  ].join(" ");

  const descClass = [
    "text-sm",
    "text-slate-600",
    "dark:text-gray-300",
  ].join(" ");

  const metaClass = [
    "mt-1 text-xs",
    isAffordable ? "text-emerald-700 dark:text-emerald-200" : "text-slate-500 dark:text-gray-400",
  ].join(" ");

  const statusTagClass = [
    "text-xs font-semibold px-2 py-0.5 rounded-md select-none",
    isAffordable
      ? "text-emerald-800 bg-emerald-100 border border-emerald-200 dark:text-white dark:bg-white/10 dark:border-white/15"
      : isMaxed
      ? "text-slate-500 bg-slate-100 border border-slate-200 dark:text-gray-400 dark:bg-white/5 dark:border-white/10"
      : "text-slate-600 bg-slate-100 border border-slate-200 dark:text-gray-400 dark:bg-white/5 dark:border-white/10",
  ].join(" ");

  return (
    <div
      className={base}
      onClick={isAffordable ? onClick : undefined}
      aria-disabled={!isAffordable}
      role={isAffordable ? "button" : undefined}
      tabIndex={isAffordable ? 0 : -1}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={titleClass}>
            {item.name}{" "}
            <span className="text-xs text-slate-500 dark:text-gray-400 align-middle">
              Lv.{level}/{item.max}
            </span>
          </div>

          <div className={descClass}>{item.desc}</div>

          <div className={metaClass}>Cost: {costText}</div>
        </div>

        <div className="shrink-0">
          <span className={statusTagClass}>
            {isMaxed ? "Maxed" : isAffordable ? "Ready" : "Locked"}
          </span>
        </div>
      </div>
    </div>
  );
}
