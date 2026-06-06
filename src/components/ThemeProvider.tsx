"use client";

import { useEffect } from "react";
import { COLOR_THEME_STORAGE_KEY, isColorTheme } from "@/lib/theme";
import { uiActions, type ColorTheme } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const colorTheme = useAppSelector((state) => state.ui.colorTheme);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    if (isColorTheme(stored)) {
      dispatch(uiActions.setColorTheme(stored));
    }
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.dataset.colorTheme = colorTheme;
    window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, colorTheme);
  }, [colorTheme]);

  return children;
}
