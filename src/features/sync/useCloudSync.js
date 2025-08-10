// src/features/sync/useCloudSync.js
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";

/**
 * Cloud sync: prefer cloud on login, autosave every 5s when dirty,
 * flush on tab hide. Returns { userId, syncReady, lastSyncAt, upsertNow }.
 */
export default function useCloudSync({ state, setState, defaultState, ensureItems }) {
  const [userId, setUserId] = useState(null);
  const [syncReady, setSyncReady] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const stateRef = useRef(state);
  const dirtyRef = useRef(false);

  // Persist latest state locally + mark dirty for autosave
  useEffect(() => {
    stateRef.current = state;
    try {
      localStorage.setItem("dark-idle-save", JSON.stringify(state));
    } catch {}
    dirtyRef.current = true;
  }, [state]);

  const saveToCloud = useCallback(
    async (uid, snapshot) => {
      const payload = { ...snapshot, _updatedAt: new Date().toISOString() };
      const { error } = await supabase
        .from("dark_idle_saves")
        .upsert(
          { user_id: uid, data: payload, version: payload.version ?? defaultState.version },
          { onConflict: "user_id" }
        );
      if (error) {
        console.error("saveToCloud error", error);
      } else {
        setLastSyncAt(new Date().toISOString());
      }
    },
    [defaultState.version]
  );

  // Manual save (if you need to force-flush)
  const upsertNow = useCallback(async () => {
    if (!userId) return;
    dirtyRef.current = false;
    await saveToCloud(userId, stateRef.current);
  }, [userId, saveToCloud]);

  const reconcileFromCloud = useCallback(
    async (uid) => {
      setSyncReady(false);
      try {
        const { data, error } = await supabase
          .from("dark_idle_saves")
          .select("data, updated_at")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        const row = data?.[0] || null;
        const cloud = row?.data ?? null;
        const updatedAt = row?.updated_at ?? null;

        if (cloud) {
          const merged = { ...defaultState, ...cloud };
          merged.items = ensureItems(merged.items);
          merged.version = defaultState.version;

          setState(merged);
          try {
            localStorage.setItem("dark-idle-save", JSON.stringify(merged));
          } catch {}
          setLastSyncAt(updatedAt || new Date().toISOString());
          dirtyRef.current = false;
        } else {
          // Seed from local (if present) or defaults, then push to cloud
          let local = null;
          try {
            local = JSON.parse(localStorage.getItem("dark-idle-save") || "null");
          } catch {}
          const seed = local
            ? { ...defaultState, ...local, items: ensureItems(local.items) }
            : { ...defaultState, items: ensureItems(defaultState.items) };
          await saveToCloud(uid, seed);
          setState(seed);
          dirtyRef.current = false;
        }
      } catch (e) {
        console.warn("Reconciliation failed:", e);
      } finally {
        setSyncReady(true);
      }
    },
    [defaultState, ensureItems, saveToCloud, setState]
  );

  // Keep latest reconcile in a ref so auth effect can be mount-only
  const reconcileFromCloudRef = useRef(reconcileFromCloud);
  useEffect(() => {
    reconcileFromCloudRef.current = reconcileFromCloud;
  }, [reconcileFromCloud]);

  // Auth wiring (mount-only) with safe cleanup
  useEffect(() => {
    let subscriptionWrapper;
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user ?? null;
      setUserId(u?.id ?? null);
      if (u) reconcileFromCloudRef.current(u.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      if (u) reconcileFromCloudRef.current(u.id);
      else setSyncReady(false);
    });
    subscriptionWrapper = sub;

    return () => {
      // Optional chaining prevents cleanup crashes if sub is undefined in dev/StrictMode
      subscriptionWrapper?.subscription?.unsubscribe?.();
    };
  }, []);

  // Autosave (every 5s when dirty)
  useEffect(() => {
    if (!userId || !syncReady) return;
    const id = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      saveToCloud(userId, stateRef.current);
    }, 5000);
    return () => clearInterval(id);
  }, [userId, syncReady, saveToCloud]);

  // Flush on tab hide/unload
  useEffect(() => {
    const onHide = () => {
      if (userId && syncReady && dirtyRef.current) {
        dirtyRef.current = false;
        saveToCloud(userId, stateRef.current);
      }
    };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [userId, syncReady, saveToCloud]);

  return { userId, syncReady, lastSyncAt, upsertNow };
}
