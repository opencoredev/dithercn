"use client";

import { useEffect, useRef, useState } from "react";

/** True once the element comes within 200px of the viewport, and stays true. */
export const useNearViewport = <T extends Element = HTMLDivElement>() => {
  const ref = useRef<T>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isNear) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNear(true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isNear]);

  return { isNear, ref };
};
