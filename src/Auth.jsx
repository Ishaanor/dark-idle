// src/Auth.jsx
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUser(data?.session?.user ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setStatus("");
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const signInWithEmail = async (e) => {
    e.preventDefault();
    if (!email) return setStatus("Please enter a valid email address.");
    setBusy(true);
    setStatus("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    setStatus(error ? `Error: ${error.message}` : "Check your email for the sign-in link.");
  };

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setStatus("Signed out.");
  };

  // When logged in: compact profile + sign out (login is hidden)
  if (user) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl p-[1px] bg-gradient-to-r from-[#f70d61] to-[#1721e5]">
          <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#101827] shadow">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-[#f70d61] to-[#1721e5]" />
              <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {user.email ?? user.user_metadata?.name ?? "Player"}
                </p>
              </div>
              <button
                onClick={signOut}
                disabled={busy}
                className="ml-auto inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium shadow
                           bg-gray-900 text-white hover:opacity-90 disabled:opacity-50 transition
                           dark:bg-white dark:text-gray-900"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
            {status ? (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300" aria-live="polite">
                {status}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Logged out: Tailwind-styled sign-in card (magic link + Google)
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-[#f70d61] to-[#1721e5]">
        <div className="rounded-2xl p-5 bg-white dark:bg-[#101827] shadow">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Save your progress to the cloud
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Sign in to sync DarkIdle across devices.
            </p>
          </div>

          <form onSubmit={signInWithEmail} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Email address
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700
                           bg-white dark:bg-[#0b1220] text-gray-900 dark:text-gray-100
                           px-3 py-2 focus:outline-none focus:ring-2
                           focus:ring-[#546bf7]/60 focus:border-[#546bf7]/60"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl px-4 py-2 font-medium shadow
                         bg-gradient-to-r from-[#f70d61] to-[#1721e5] text-white
                         hover:opacity-95 disabled:opacity-50 transition"
            >
              {busy ? "Working…" : "Send magic link"}
            </button>
          </form>
          
          {status ? (
            <p className="mt-4 text-sm text-gray-700 dark:text-gray-300" aria-live="polite">
              {status}
            </p>
          ) : null}

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            You’ll receive a secure sign-in link by email. No passwords to remember.
          </p>
        </div>
      </div>
    </div>
  );
}
