import React from "react";

export default function LootLog({ log, className = "" }) {
  return (
    <div
      className={
        "mt-4 h-40 overflow-y-auto text-sm space-y-1 pr-2 rounded-lg bg-white/70 dark:bg-black/80 border border-slate-300/60 dark:border-white/10 p-2 " +
        className
      }
    >
      {log.map((line, i) => (
        <div key={i} className="text-slate-800 dark:text-gray-100">
          • {line}
        </div>
      ))}
    </div>
  );
}
