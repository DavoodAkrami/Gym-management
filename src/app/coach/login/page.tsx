"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthPageShell } from "@/components/AuthPageShell";
import { LoginForm } from "@/app/login/LoginForm";
import { getTranslation } from "@/lib/i18n/translations";
import { useAppSelector } from "@/lib/store/hooks";

function CoachLoginContent() {
  const searchParams = useSearchParams();
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const pending = searchParams.get("pending") === "1";

  return (
    <div className="w-full max-w-xl space-y-4">
      {pending ? (
        <p className="panel-alert border-glass-border bg-glass/60 px-4 py-3 text-sm font-bold text-foreground">
          {t("coachLoginPending")}
        </p>
      ) : null}
      <LoginForm />
      <p className="text-center text-sm font-bold text-muted-foreground">
        <Link href="/login" className="text-foreground no-underline hover:underline">
          {t("coachLoginOwnerLink")}
        </Link>
      </p>
    </div>
  );
}

export default function CoachLoginPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <CoachLoginContent />
      </Suspense>
    </AuthPageShell>
  );
}
