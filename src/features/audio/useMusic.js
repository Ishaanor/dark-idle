import { useEffect, useMemo, useRef, useState } from "react";

export default function useMusic({
  src,
  initialVolume = 0.5,
  // Mobile should *not* start playing; user must opt-in
  initialMutedMobile = true,
  initialMutedDesktop = false,
} = {}) {
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const [muted, setMuted] = useState(() => {
    const saved = localStorage.getItem("bgmMuted");
    if (saved != null) return saved === "true";
    return isMobile ? initialMutedMobile : initialMutedDesktop;
  });

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("bgmVolume");
    return saved != null ? Number(saved) : initialVolume;
  });

  const audioRef = useRef(null);

  // Create <audio> once
  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.preload = "auto";
    a.playsInline = true; // iOS
    a.volume = volume;
    audioRef.current = a;

    // If user already opted in (desktop defaults), attempt play after first interaction
    const tryPlay = () => {
      if (!audioRef.current) return;
      if (!muted) audioRef.current.play().catch(() => {});
      window.removeEventListener("pointerdown", tryPlay, { capture: true });
      window.removeEventListener("keydown", tryPlay, { capture: true });
    };
    window.addEventListener("pointerdown", tryPlay, { capture: true });
    window.addEventListener("keydown", tryPlay, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", tryPlay, { capture: true });
      window.removeEventListener("keydown", tryPlay, { capture: true });
      a.pause();
      audioRef.current = null;
    };
  }, [src]); // create once per src

  // Apply volume
  useEffect(() => {
    localStorage.setItem("bgmVolume", String(volume));
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Apply mute state
  useEffect(() => {
    localStorage.setItem("bgmMuted", String(muted));
    const a = audioRef.current;
    if (!a) return;
    if (muted) a.pause();
    else a.play().catch(() => {}); // will succeed when triggered by a gesture
  }, [muted]);

  const toggleMuted = () => setMuted((m) => !m);

  return { muted, setMuted, toggleMuted, volume, setVolume, audio: audioRef.current };
}
