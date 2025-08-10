import React from "react";

export default function MusicToggle({ muted, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? "Unmute music" : "Mute music"}
      title={muted ? "Unmute music" : "Mute music"}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-300/60 dark:border-white/10 bg-white/60 dark:bg-black/50 hover:opacity-95 shadow-sm"
    >
      {/* simple inline SVG to avoid extra deps */}
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" className="fill-current text-slate-700 dark:text-gray-200">
          <path d="M11 5.001 6.5 9H3v6h3.5L11 19v-6.586l-2 2V15l2-2v-1.414l-2 2V11l2-2V5.001zM17.586 12l2.707-2.707-1.414-1.414L16.172 10.586 13.464 7.88l-1.414 1.415L14.757 12l-2.707 2.707 1.414 1.414 2.707-2.707 2.707 2.707 1.414-1.414L19 12l2.121-2.121-1.414-1.414L17.586 12z"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" className="fill-current text-slate-700 dark:text-gray-200">
          <path d="M11 5.001 6.5 9H3v6h3.5L11 19V5.001zM15 9v6a3 3 0 0 0 0-6zM15 5v2a7 7 0 0 1 0 10v2a9 9 0 0 0 0-14z"/>
        </svg>
      )}
      <span className="text-xs font-medium text-slate-700 dark:text-gray-100">
        {muted ? "Off" : "On"}
      </span>
    </button>
  );
}
