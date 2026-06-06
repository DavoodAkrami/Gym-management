"use client";

import { useEffect, useState } from "react";
import { LanguageSelect } from "./LanguageSelect";
import { ThemeSelect } from "./ThemeSelect";

function useMobilePreferences() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function PreferencesBar({
  className = "",
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const isMobile = useMobilePreferences();
  const isCompact = compact ?? isMobile;

  return (
    <div className={`preferences-bar flex shrink-0 items-center gap-1.5 sm:gap-2 ${className}`}>
      <ThemeSelect compact={isCompact} />
      <LanguageSelect compact={isCompact} />
    </div>
  );
}
