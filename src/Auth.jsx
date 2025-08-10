// src/Auth.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Compact auth widget designed for header use.
 * - Minimal height; inline email + button
 * - Dark/light friendly
 * - Shows "Last sync …" after login using dark_idle_saves.updated_at
 *   (Realtime updates if table broadcast is enabled; otherwise shows the last known value.)
 */
export default function Auth() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // small, single-line status under the control
  const [user, setUser] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  // --- helpers ---
  const formatAgo = (d) => {
    if (!d) return "unknown";
    const now = Date.now();
    const diff = Math.floor((now - new Date(d).getTime()) / 1000);
    if (diff < 30) return "just now";
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
  };

  const loadLastSync = async (uid) => {
  try {
    const { data, error } = await supabase
      .from("dark_idle_saves")
      .select("updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(1); // resilient even if duplicates exist

    if (error) {
      console.warn("loadLastSync error:", error);
      return; // keep previous lastSyncAt
    }
    if (Array.isArray(data) && data.length && data[0]?.updated_at) {
      setLastSyncAt(data[0].updated_at);
    }
    // if zero rows, do nothing (keep previous value)
  } catch (e) {
    console.warn("loadLastSync exception:", e);
    // keep previous value
  }
};

  // Session + auth change handling (unchanged behaviour)
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const u = data?.session?.user ?? null;
      setUser(u);
      if (u) {
        setStatus("");
        loadLastSync(u.id);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setStatus("");
        loadLastSync(u.id);
      } else {
        setLastSyncAt(null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Realtime updates to "last sync" (optional but harmless if Realtime off)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("dark_idle_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dark_idle_saves",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Prefer row timestamp; fall back to commit timestamp
          const ts =
            payload?.new?.updated_at ||
            payload?.commit_timestamp ||
            new Date().toISOString();
          setLastSyncAt(ts);
        }
      )
      .subscribe((status) => {
        // If realtime isn't enabled, do nothing special.
        // (Supabase will keep working; you'll just see the initial timestamp.)
        return status;
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [user?.id]);

  const signInWithEmail = async (e) => {
    e.preventDefault();
    if (!email) {
      setStatus("Please enter a valid email.");
      return;
    }
    setBusy(true);
    setStatus("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    setStatus(error ? `Error: ${error.message}` : "Magic link sent.");
  };

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setStatus("Signed out.");
  };

  // ----- UI -----

  // Logged in: tiny inline chip with email + last sync + sign out
  if (user) {
    const titleTime = lastSyncAt
      ? new Date(lastSyncAt).toLocaleString()
      : "No sync record";
    return (
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2 rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/80 dark:bg-black/40 px-2.5 py-1.5 shadow-sm">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[#f70d61] to-[#1721e5]" />
          <div className="min-w-0 max-w-[12rem] text-xs sm:text-sm">
            <div className="truncate text-slate-800 dark:text-gray-100">
              {user.email ?? user.user_metadata?.name ?? "Player"}
            </div>
            <div
              className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400"
              title={titleTime}
            >
              Last sync {lastSyncAt ? formatAgo(lastSyncAt) : "unknown"}
            </div>
          </div>
          <button
            onClick={signOut}
            disabled={busy}
            className="ml-1 h-7 whitespace-nowrap rounded-lg border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-black/30 px-2 text-xs font-medium text-slate-800 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-black/50 disabled:opacity-50"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
        {status ? (
          <div
            className="mt-1 text-[11px] text-slate-600 dark:text-gray-300"
            aria-live="polite"
          >
            {status}
          </div>
        ) : null}
      </div>
    );
  }

  // Logged out: single-row inline form (email + button)
  return (
    <form onSubmit={signInWithEmail} className="flex flex-col items-end">
      <div className="flex items-center gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 w-56 md:w-64 rounded-lg border border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-black/40 px-3 text-sm text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#546bf7]/60"
          aria-label="Email"
        />
        <button
          type="submit"
          disabled={!email || busy}
          className="h-9 rounded-lg px-3 text-sm font-semibold text-white shadow bg-gradient-to-r from-[#f70d61] to-[#1721e5] hover:opacity-95 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send magic link"}
        </button>
      </div>
      {status ? (
        <div
          className="mt-1 text-[11px] text-slate-600 dark:text-gray-300"
          aria-live="polite"
        >
          {status}
        </div>
      ) : null}
    </form>
  );
}
