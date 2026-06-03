"use client";

import { useEffect } from "react";
import { uiActions, type Locale } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

const LOCALE_STORAGE_KEY = "gymmanager-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "fa") {
      dispatch(uiActions.setLocale(stored));
    }
  }, [dispatch]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "fa" ? "rtl" : "ltr";
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  return children;
}
