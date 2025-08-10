export default function AvatarCircle({ children, dps }) {
  return (
    <div className="relative w-36 h-36 xs:w-44 xs:h-44 sm:w-56 sm:h-56 md:w-64 md:h-64">
      <div className="absolute inset-0 rounded-full overflow-hidden bg-black/40 border border-white/10">
        {children}
      </div>

      {/* Compact DPS badge on mobile, larger on ≥sm */}
      <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-black/90 border border-slate-300/60 dark:border-white/10 flex flex-col items-center justify-center shadow">
        <div className="text-[9px] sm:text-[10px] uppercase opacity-70 leading-none">DPS</div>
        <div className="text-base sm:text-xl font-bold leading-tight">{Math.floor(dps)}</div>
      </div>
    </div>
  );
}
