"use client";

// Shows a scene that was designed at a fixed size, scaled down to fit narrower screens.
// It never grows past `max` (1 means the design size).

import { useEffect, useRef, useState } from "react";

type Props = { width: number; height: number; max?: number; children: React.ReactNode };

export default function Fit({ width, height, max = 1, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(max);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // The observer also fires once right away, so this covers the first measure too.
    const watch = new ResizeObserver(() => setScale(Math.min(max, el.clientWidth / width)));
    watch.observe(el);
    return () => watch.disconnect();
  }, [width, max]);

  return (
    <div ref={box} style={{ position: "relative", width: "100%", maxWidth: width * max, height: height * scale, margin: "0 auto" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width, height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {children}
      </div>
    </div>
  );
}
