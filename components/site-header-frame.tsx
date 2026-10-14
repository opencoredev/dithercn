"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

/** The landing hero's id; the header blends into it while it is under the header. */
export const HERO_ID = "hero";

/**
 * True while the landing hero is still behind the header, so the header can
 * sit inside it rather than as a separate bar.
 */
const useOverHero = (enabled: boolean) => {
  const [overHero, setOverHero] = useState(enabled);

  useEffect(() => {
    const hero = enabled ? document.querySelector(`#${HERO_ID}`) : null;
    const header = hero ? document.querySelector("header") : null;
    if (!hero || !header) {
      setOverHero(false);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      setOverHero(
        hero.getBoundingClientRect().bottom >
          header.getBoundingClientRect().bottom
      );
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled]);

  return enabled && overHero;
};

/**
 * The header's outer element. On the landing page it takes on the hero's
 * dark plate and drops its bar while the hero is behind it, then becomes
 * the usual bar once the hero scrolls away.
 */
export const SiteHeaderFrame = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const overHero = useOverHero(usePathname() === ROUTES.HOME);

  return (
    <header
      data-over-hero={overHero || undefined}
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-[background-color,border-color] duration-200 ease-(--ease-out) motion-reduce:transition-none",
        overHero
          ? "dark text-foreground border-transparent bg-transparent"
          : "bg-background/90 backdrop-blur-sm"
      )}
      style={{ viewTransitionName: "site-header" }}
    >
      {children}
    </header>
  );
};
