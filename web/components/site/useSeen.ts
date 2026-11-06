"use client";

import { useCallback, useState } from "react";

// True once the element has scrolled at least 20% into view. Used to start each page's
// animations when the reader gets there, once. Browsers without IntersectionObserver just
// show everything.
export function useSeen(): [(el: Element | null) => void, boolean] {
  const [seen, setSeen] = useState(false);

  const ref = useCallback((el: Element | null) => {
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(el);
  }, []);

  return [ref, seen];
}
