import { useEffect, useState } from "react";

/** Load a Starling-style XML spritesheet (TextureAtlas). */
export default function useAtlas(xmlPath) {
  const [atlas, setAtlas] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const xmlText = await fetch(xmlPath).then((r) => r.text());
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "application/xml");
        const tex = xml.querySelector("TextureAtlas");
        if (!tex) return;

        const imagePath = tex.getAttribute("imagePath");
        const img = new Image();
        img.src = imagePath;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });

        const subs = {};
        tex.querySelectorAll("SubTexture").forEach((st) => {
          const name = st.getAttribute("name");
          subs[name] = {
            x: +st.getAttribute("x"),
            y: +st.getAttribute("y"),
            width: +st.getAttribute("width"),
            height: +st.getAttribute("height"),
          };
        });

        if (!cancelled) {
          setAtlas({ imagePath, width: img.naturalWidth, height: img.naturalHeight, subs });
        }
      } catch (e) {
        console.error("useAtlas:", e);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [xmlPath]);

  return atlas;
}
