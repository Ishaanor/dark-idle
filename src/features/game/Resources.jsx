import React from "react";

export default function Resources({ resources, fmt }) {
  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      <Res label="Souls" icon="🕯️" value={fmt(resources.souls)} />
      <Res label="Bones" icon="🦴" value={fmt(resources.bones)} />
      <Res label="Gloom" icon="🌑" value={fmt(resources.gloom)} />
      <Res label="Crystal" icon="💎" value={fmt(resources.crystal)} />
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
