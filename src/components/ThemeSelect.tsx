"use client";

import { useMemo } from "react";
import { FiDroplet } from "react-icons/fi";
import { usePrefersDark } from "@/lib/hooks/usePrefersDark";
import { getTranslation } from "@/lib/i18n/translations";
import { uiActions } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { SelectBar } from "./SelectBar";

export function ThemeSelect({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const colorTheme = useAppSelector((state) => state.ui.colorTheme);
  const prefersDark = usePrefersDark();
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const themeOptions = useMemo(() => {
    const altTheme = prefersDark
      ? { label: t("themeDark"), hint: t("themeDarkHint") }
      : { label: t("themeNeutral"), hint: t("themeNeutralHint") };

    return [
      { value: "ocean" as const, label: t("themeBlue"), hint: t("themeBlueHint") },
      { value: "midnight" as const, label: altTheme.label, hint: altTheme.hint },
    ];
  }, [locale, prefersDark]);

  return (
    <SelectBar
      className={className}
      label={t("themeLabel")}
      value={colorTheme}
      options={themeOptions}
      icon={<FiDroplet aria-hidden="true" />}
      onChange={(nextTheme) => dispatch(uiActions.setColorTheme(nextTheme))}
      compact={compact}
    />
  );
}
