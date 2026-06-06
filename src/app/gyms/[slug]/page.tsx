"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiPhone,
  FiMapPin,
  FiClock,
  FiDollarSign,
} from "react-icons/fi";
import { getTranslation } from "@/lib/i18n/translations";
import { fetchPublicGym } from "@/lib/supabase/public-signup";
import type { PublicGymDetail } from "@/lib/supabase/public-signup";
import { useAppSelector } from "@/lib/store/hooks";

export default function GymDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const locale = useAppSelector((state) => state.ui.locale);
  const authUser = useAppSelector((state) => state.auth.user);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [detail, setDetail] = useState<PublicGymDetail | null | "loading">("loading");
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchPublicGym(slug);
        setDetail(result ?? null);
      } catch {
        setError(true);
        setDetail(null);
      }
    })();
  }, [slug]);

  if (detail === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
        <h1 className="text-2xl font-black">
          {locale === "fa" ? "باشگاه یافت نشد" : "Gym not found"}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          {locale === "fa"
            ? "باشگاهی با این مشخصات وجود ندارد."
            : "No gym matches this address."}
        </p>
        <Link
          href="/gyms"
          className="btn-primary rounded-2xl px-6 py-3 text-sm font-black no-underline shadow-soft"
        >
          {locale === "fa" ? "بازگشت به لیست باشگاه‌ها" : "Back to gyms"}
        </Link>
      </main>
    );
  }

  const { gym, plans, signup_token } = detail;
  const gymName = gym.name;

  return (
    <main className="min-h-screen px-5 py-5 text-foreground sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        <div className="surface-panel flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <Link
            href="/gyms"
            className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground no-underline hover:bg-surface"
            aria-label={locale === "fa" ? "بازگشت" : "Back"}
          >
            {locale === "fa" ? <FiArrowRight aria-hidden="true" /> : <FiArrowLeft aria-hidden="true" />}
          </Link>
          <span className="truncate text-sm font-black">{gymName}</span>
        </div>

        <div className="mt-10 text-center sm:mt-14">
          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-primary-soft text-3xl font-black text-on-primary sm:size-24 sm:text-4xl">
            {gymName.charAt(0).toUpperCase()}
          </div>
          <h1 className="mt-6 text-3xl font-black sm:text-4xl">{gymName}</h1>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-6">
            <h2 className="text-lg font-black">
              {locale === "fa" ? "اطلاعات باشگاه" : "Gym info"}
            </h2>
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3 text-sm font-medium leading-7 text-muted-foreground">
                <FiMapPin className="mt-1 shrink-0" aria-hidden="true" />
                <span>{gym.address || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium leading-7 text-muted-foreground">
                <FiPhone className="shrink-0" aria-hidden="true" />
                <span dir="ltr">{gym.phone || "—"}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href={`tel:${gym.phone}`}
                className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black no-underline shadow-soft"
              >
                <FiPhone aria-hidden="true" />
                {locale === "fa" ? "تماس با باشگاه" : "Call gym"}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-6">
            <h2 className="text-lg font-black">
              {locale === "fa" ? "نوع عضویت" : "Membership plans"}
            </h2>
            {plans.length === 0 ? (
              <p className="mt-5 text-sm font-medium text-muted-foreground">
                {locale === "fa"
                  ? "هنوز پلنی ثبت نشده است."
                  : "No plans available yet."}
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black">{plan.name}</span>
                      <span className="text-sm font-black text-primary">
                        {plan.price.toLocaleString()} {locale === "fa" ? "تومان" : t("currencyToman")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <FiClock aria-hidden="true" />
                      {plan.duration_days} {locale === "fa" ? "روز" : "days"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border p-6 text-center">
          <h2 className="text-lg font-black">
            {locale === "fa" ? "چگونه عضو شویم؟" : "How to join"}
          </h2>
          <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">
            {locale === "fa"
              ? "برای عضویت در این باشگاه می‌توانید با شماره تماس بگیرید یا به آدرس مراجعه کنید. اگر از قبل در این باشگاه عضو هستید، وارد شوید."
              : "Contact the gym at the number above or visit their address to sign up. If you are already a member, sign in."}
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-3 text-sm font-black text-foreground no-underline hover:bg-surface"
            >
              {t("footerLogin")}
            </Link>
          </div>
          {gym.public_signup_enabled && signup_token ? (
            <div className="mt-5">
              <Link
                href={`/join/${signup_token}`}
                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black no-underline shadow-soft"
              >
                {t("gymSignupCta")}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/gyms"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground no-underline hover:text-foreground"
          >
            {locale === "fa" ? <FiArrowRight aria-hidden="true" /> : <FiArrowLeft aria-hidden="true" />}
            {locale === "fa" ? "بازگشت به لیست باشگاه‌ها" : "Back to all gyms"}
          </Link>
        </div>
      </div>
    </main>
  );
}
