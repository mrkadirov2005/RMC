import { useEffect, useRef, useState } from 'react';

/** Tracks an element's rendered content width so SVG charts can size themselves to fill
 * their container (genuinely `w-full`) instead of a fixed pixel width computed from data
 * point count alone. */
export const useContainerWidth = (fallback = 280) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    // ResizeObserver fires its callback once immediately on observe(), so this also covers
    // the initial measurement - no need to read clientWidth synchronously here too.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fallback]);

  return { ref, width };
};
