"use client";

import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { readAvatarFile } from "@/lib/staff/avatar";
import type { TranslationKey } from "@/lib/i18n/translations";

type OwnerProfileSectionProps = {
  ownerName: string;
  onChangeName: (name: string) => void;
  ownerAvatar: string;
  onChangeAvatar: (url: string) => void;
  t: (key: TranslationKey) => string;
};

export function OwnerProfileSection({
  ownerName,
  onChangeName,
  ownerAvatar,
  onChangeAvatar,
  t,
}: OwnerProfileSectionProps) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4">
        <StaffAvatar
          firstName={ownerName.split(" ")[0] ?? ""}
          lastName={ownerName.split(" ").slice(1).join(" ") ?? ""}
          avatarUrl={ownerAvatar}
          size="lg"
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-glass-border bg-glass/40 px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-glass/60">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void readAvatarFile(file).then(onChangeAvatar).catch(() => {});
            }}
          />
          {t("staffPhoto")}
        </label>
      </div>
      <label className="block sm:max-w-xs">
        <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("authFullName")}</span>
        <input
          required
          value={ownerName}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full px-3"
        />
      </label>
    </section>
  );
}
