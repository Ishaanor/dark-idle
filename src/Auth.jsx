import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

function timeAgo(iso) {
  if (!iso) return "unknown";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Auth({ lastSyncAt }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [session, setSession] = useState(null);

  // Keep session in sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data?.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const user = session?.user ?? null;
  const syncText = useMemo(() => (lastSyncAt ? `Last sync ${timeAgo(lastSyncAt)}` : "Last sync unknown"), [lastSyncAt]);

  async function sendMagicLink(e) {
    e?.preventDefault?.();
    if (!email || sending) return;
    try {
      setSending(true);
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Logged in pill — compact on mobile, fuller on larger screens
  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 pl-2 pr-2 sm:pr-3 py-1.5 rounded-xl bg-white/60 dark:bg-black/50 border border-slate-300/60 dark:border-white/10 shadow-sm max-w-full">
        {/* Accent dot */}
        <span
          aria-hidden
          className="h-3.5 w-3.5 rounded-full"
          style={{
            background:
              "radial-gradient(65% 65% at 30% 30%, #f70d61 0%, #1721e5 100%)",
          }}
        />
        <div className="min-w-0 leading-tight">
          <div className="text-xs sm:text-sm font-medium truncate">{user.email}</div>
          <div className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-300 truncate">{syncText}</div>
        </div>
        <button
          onClick={signOut}
          className="ml-1 shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#f70d61] to-[#1721e5] hover:opacity-95"
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Logged out form — input + button on ONE line, sized to avoid header bloat
  return (
    <form
      onSubmit={sendMagicLink}
      className="flex items-center gap-2 pl-2 pr-2 sm:pr-3 py-1.5 rounded-xl bg-white/60 dark:bg-black/50 border border-slate-300/60 dark:border-white/10 shadow-sm max-w-[92vw] sm:max-w-none"
    >
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-9 w-[46vw] xs:w-48 sm:w-64 lg:w-72 px-3 rounded-lg bg-white/70 dark:bg-black/60 border border-slate-300/60 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-[#546bf7]/40 dark:focus:ring-[#546bf7]/40 placeholder:text-slate-500 dark:placeholder:text-gray-400"
      />
      <button
        type="submit"
        disabled={sending || !email}
        className="shrink-0 h-9 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#f70d61] to-[#1721e5] disabled:opacity-50 hover:opacity-95 whitespace-nowrap"
        title="Send magic link"
      >
        Send<span className="hidden sm:inline"> magic link</span>
      </button>
    </form>
  );
}
