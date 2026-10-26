"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useMetaColor } from "@/hooks/use-meta-color";
import { trackEvent } from "@/lib/events";

export const useThemeToggle = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const { setMetaColor, metaColor } = useMetaColor();

  useEffect(() => {
    setMetaColor(metaColor);
  }, [metaColor, setMetaColor]);

  const toggleTheme = useCallback(() => {
    const theme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(theme);
    trackEvent({ name: "theme_toggled", properties: { theme } });
  }, [resolvedTheme, setTheme]);

  useHotkeys("d", () => toggleTheme(), { preventDefault: true });

  return { toggleTheme };
};
