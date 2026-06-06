"use client";

import Link from "next/link";
import {
  FiActivity,
  FiArrowLeft,
  FiArrowRight,
  FiCreditCard,
  FiSearch,
  FiShield,
  FiSmartphone,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { HomeAuthRedirect } from "@/components/HomeAuthRedirect";
import { SiteHeader } from "@/components/SiteHeader";
import { getTranslation } from "@/lib/i18n/translations";
import { useAppSelector } from "@/lib/store/hooks";

export function HomeContent() {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const StartIcon = locale === "fa" ? FiArrowLeft : FiArrowRight;
  const EndIcon = locale === "fa" ? FiArrowLeft : FiArrowRight;

  const features = [
    { title: t("featureMemberCrmTitle"), description: t("featureMemberCrmDesc"), icon: FiUsers },
    { title: t("featureMembershipsTitle"), description: t("featureMembershipsDesc"), icon: FiShield },
    { title: t("featurePaymentsTitle"), description: t("featurePaymentsDesc"), icon: FiCreditCard },
    { title: t("featureCoachesTitle"), description: t("featureCoachesDesc"), icon: FiUserCheck },
    { title: t("featureQrSignupTitle"), description: t("featureQrSignupDesc"), icon: FiSmartphone },
    { title: t("featureAttendanceTitle"), description: t("featureAttendanceDesc"), icon: FiActivity },
  ];

  return (
    <HomeAuthRedirect>
      <main className="min-h-screen px-5 py-5 text-foreground sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col">
          <SiteHeader showNavLinks={false} />

          <section className="py-16 text-center sm:py-24">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2 text-sm font-bold">
              <span className="rounded-full border border-border px-4 py-1.5 text-muted-foreground">
                {t("heroAudienceOwners")}
              </span>
              <span className="text-muted-foreground">&middot;</span>
              <span className="rounded-full border border-border px-4 py-1.5 text-muted-foreground">
                {t("heroAudienceSeekers")}
              </span>
            </div>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-8 text-muted-foreground sm:text-xl">
              {t("heroSubtitle")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#features"
                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black no-underline shadow-soft"
              >
                {t("heroCtaFeatures")}
              </a>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-3 text-sm font-black text-foreground no-underline hover:bg-surface"
              >
                {t("navStart")}
                <StartIcon aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-3 text-sm font-black text-foreground no-underline hover:bg-surface"
              >
                {t("footerLogin")}
              </Link>
            </div>

            <Link
              href="/gyms"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl border-2 border-primary px-6 py-3 text-sm font-black text-primary no-underline hover:bg-primary-soft/30"
            >
              <FiSearch className="shrink-0" aria-hidden="true" />
              {t("discoverTitle")}
            </Link>
          </section>

          <section id="features" className="scroll-mt-20 py-16">
            <h2 className="text-center text-3xl font-black sm:text-4xl">{t("featuresTitle")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-base font-medium leading-7 text-muted-foreground">
              {locale === "fa"
                ? "ابزارهایی که برای مدیریت روزانه باشگاه نیاز دارید."
                : "The tools you need to run your gym day-to-day."}
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="rounded-2xl border border-border p-6 transition-colors hover:border-interactive-border"
                  >
                    <Icon className="mb-5 text-3xl text-muted-foreground" aria-hidden="true" />
                    <h3 className="text-xl font-black">{feature.title}</h3>
                    <p className="mt-3 text-base font-medium leading-7 text-muted-foreground">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <footer className="border-t border-border py-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm font-bold text-muted-foreground">
                &copy; {new Date().getFullYear()} {t("brandName")}. {t("footerRights")}
              </p>
              <div className="flex items-center gap-5 text-sm font-bold text-muted-foreground">
                <a href="#features">{t("footerFeatures")}</a>
                <Link href="/gyms" className="no-underline">
                  {t("discoverTitle")}
                </Link>
                <Link href="/signup" className="no-underline">
                  {t("footerSignup")}
                </Link>
                <Link href="/login" className="inline-flex items-center gap-1 no-underline">
                  {t("footerLogin")}
                  <EndIcon aria-hidden="true" />
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </HomeAuthRedirect>
  );
}
