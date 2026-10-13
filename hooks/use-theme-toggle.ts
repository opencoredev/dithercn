"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useMetaColor } from "@/hooks/use-meta-color";

export const useThemeToggle = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const { setMetaColor, metaColor } = useMetaColor();

  useEffect(() => {
    setMetaColor(metaColor);
  }, [metaColor, setMetaColor]);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  useHotkeys("d", () => toggleTheme(), { preventDefault: true });

  return { toggleTheme };
};
