"use client";

import Link from "next/link";
import {
  FiActivity,
  FiArrowLeft,
  FiArrowRight,
  FiBarChart2,
  FiCreditCard,
  FiGrid,
  FiShield,
  FiSmartphone,
  FiTrendingUp,
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
  const CtaIcon = locale === "fa" ? FiArrowLeft : FiArrowRight;

  const stats = [
    { label: t("statActiveMembers"), value: locale === "fa" ? "۱٬۲۴۸" : "1,248" },
    { label: t("statMonthlyRevenue"), value: locale === "fa" ? "$۴۲.۸k" : "$42.8k" },
    { label: t("statCheckinsToday"), value: locale === "fa" ? "۳۱۶" : "316" },
  ];

  const features = [
    { title: t("featureMemberCrmTitle"), description: t("featureMemberCrmDesc"), icon: FiUsers },
    { title: t("featureMembershipsTitle"), description: t("featureMembershipsDesc"), icon: FiShield },
    { title: t("featurePaymentsTitle"), description: t("featurePaymentsDesc"), icon: FiCreditCard },
    { title: t("featureCoachesTitle"), description: t("featureCoachesDesc"), icon: FiUserCheck },
    { title: t("featureQrSignupTitle"), description: t("featureQrSignupDesc"), icon: FiSmartphone },
    { title: t("featureAttendanceTitle"), description: t("featureAttendanceDesc"), icon: FiActivity },
  ];

  const timeline = [t("flowStep1"), t("flowStep2"), t("flowStep3"), t("flowStep4")];
  const members = locale === "fa" ? ["نیکا رحیمی", "آرمان اسمیت", "سارا میلر"] : ["Nika Rahimi", "Arman Smith", "Sara Miller"];

  return (
    <HomeAuthRedirect>
    <main className="min-h-screen overflow-hidden px-5 py-5 text-foreground sm:px-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col">
        <SiteHeader />

        <div className="grid items-center gap-10 py-12 lg:grid-cols-[1fr_0.92fr] lg:py-14">
          <div className="max-w-3xl animate-fade-in">
            <span className="glass-card inline-flex rounded-full px-4 py-2 text-sm font-black text-muted-foreground">
              {t("heroBadge")}
            </span>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] text-foreground sm:text-6xl lg:text-7xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-muted-foreground sm:text-xl">
              {t("heroSubtitle")}
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="#features"
                className="interactive-lift btn-primary inline-flex items-center justify-center gap-2 rounded-3xl px-7 py-4 text-center text-base font-black no-underline shadow-lift"
              >
                {t("heroCtaFeatures")}
                <FiGrid aria-hidden="true" />
              </a>
              <a
                href="#data"
                className="interactive-lift inline-flex items-center justify-center gap-2 rounded-3xl border border-glass-border bg-glass px-7 py-4 text-center text-base font-black text-muted-foreground no-underline shadow-soft backdrop-blur-xl"
              >
                {t("heroCtaData")}
                <FiBarChart2 aria-hidden="true" />
              </a>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="glass-card px-5 py-4">
                  <span className="block text-2xl font-black text-foreground">{stat.value}</span>
                  <span className="mt-1 block text-sm font-bold text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-in lg:justify-self-end">
            <div className="absolute -left-8 top-10 size-32 rounded-full bg-accent/25 blur-3xl" />
            <div className="absolute -right-10 bottom-10 size-44 rounded-full bg-primary/25 blur-3xl" />

            <div className="glass-panel relative overflow-hidden p-4 sm:p-5">
              <div className="rounded-[2rem] border border-glass-border bg-surface-strong/70 p-4 shadow-soft backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">{t("dashboardToday")}</p>
                    <h2 className="mt-1 text-2xl font-black">{t("dashboardTitle")}</h2>
                  </div>
                  <div className="grid size-16 place-items-center rounded-3xl bg-surface-muted text-lg font-black text-foreground">
                    92%
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="btn-primary rounded-3xl p-5 shadow-lift">
                    <p className="flex items-center gap-2 text-sm font-bold text-on-primary/85">
                      <FiTrendingUp aria-hidden="true" />
                      {t("dashboardRevenue")}
                    </p>
                    <p className="mt-4 text-4xl font-black">{locale === "fa" ? "$۸٬۴۲۰" : "$8,420"}</p>
                    <p className="mt-2 text-sm font-semibold text-on-primary/85">{t("dashboardRevenueDelta")}</p>
                  </div>
                  <div className="rounded-3xl border border-glass-border bg-glass p-5 backdrop-blur-xl">
                    <p className="text-sm font-bold text-muted-foreground">{t("dashboardExpiring")}</p>
                    <p className="mt-4 text-4xl font-black">{locale === "fa" ? "۲۷" : "27"}</p>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">{t("dashboardExpiringHint")}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {members.map((member, index) => (
                    <div
                      key={member}
                      className="flex items-center justify-between rounded-3xl border border-glass-border bg-glass px-4 py-3 backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-sm font-black text-foreground">
                          {index + 1}
                        </span>
                        <span>
                          <span className="block font-black">{member}</span>
                          <span className="text-sm font-semibold text-muted-foreground">{t("dashboardPlanMonthly")}</span>
                        </span>
                      </div>
                      <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-black text-success">
                        {t("dashboardStatusActive")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl py-14">
        <div className="mb-8 max-w-3xl">
          <p className="text-eyebrow">{t("featuresEyebrow")}</p>
          <h2 className="mt-3 text-4xl font-black sm:text-5xl">{t("featuresTitle")}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="glass-card p-6">
                <Icon className="mb-7 text-4xl text-muted-foreground" aria-hidden="true" />
                <h3 className="text-2xl font-black">{feature.title}</h3>
                <p className="mt-4 text-base font-medium leading-7 text-muted-foreground">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="signup" className="mx-auto grid max-w-7xl gap-5 py-14 lg:grid-cols-[0.85fr_1fr]">
        <div className="glass-panel p-7 sm:p-9">
          <p className="text-eyebrow">{t("signupEyebrow")}</p>
          <h2 className="mt-3 text-4xl font-black">{t("signupTitle")}</h2>
          <p className="mt-5 text-lg font-medium leading-8 text-muted-foreground">{t("signupDesc")}</p>
        </div>

        <div className="glass-panel grid gap-4 p-5 sm:grid-cols-[13rem_1fr]">
          <div className="grid aspect-square place-items-center rounded-[2rem] border border-glass-border bg-surface-strong/80 p-5 shadow-soft">
            <div className="grid size-full grid-cols-5 gap-2">
              {Array.from({ length: 25 }, (_, index) => (
                <span
                  key={index}
                  className={`rounded-md ${[0, 1, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 23, 24].includes(index) ? "bg-primary" : "bg-surface-muted"}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4 p-2">
            <div className="rounded-3xl border border-glass-border bg-glass p-5 backdrop-blur-xl">
              <p className="text-sm font-black text-muted-foreground">{t("signupEnglish")}</p>
              <p className="mt-2 text-2xl font-black">{t("signupEnglishFields")}</p>
            </div>
            <div className="rounded-3xl border border-glass-border bg-glass p-5 backdrop-blur-xl">
              <p className="text-sm font-black text-muted-foreground">{t("signupPersian")}</p>
              <p className="mt-2 text-2xl font-black">{t("signupPersianFields")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="data" className="mx-auto grid max-w-7xl gap-5 py-14 lg:grid-cols-[1fr_0.8fr]">
        <div className="glass-panel p-7 sm:p-9">
          <p className="text-eyebrow">{t("dataEyebrow")}</p>
          <h2 className="mt-3 text-4xl font-black">{t("dataTitle")}</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {["auth", "gyms", "gymPlans", "members", "memberships", "payments", "coaches", "attendance", "signup", "ui", "ai"].map(
              (slice) => (
                <span key={slice} className="rounded-2xl border border-glass-border bg-glass px-4 py-3 font-black backdrop-blur-xl">
                  {slice}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="glass-panel p-7 sm:p-9">
          <p className="text-eyebrow">{t("flowEyebrow")}</p>
          <ol className="mt-5 space-y-4">
            {timeline.map((item, index) => (
              <li key={item} className="flex gap-4">
                <span className="btn-primary grid size-10 shrink-0 place-items-center rounded-2xl text-sm font-black">
                  {index + 1}
                </span>
                <span className="pt-2 text-base font-bold text-muted-foreground">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl py-8">
        <div className="glass-panel flex flex-col items-center justify-between gap-4 px-6 py-5 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-bold text-muted-foreground">
            © {new Date().getFullYear()} {t("brandName")}. {t("footerRights")}
          </p>
          <div className="flex items-center gap-4 text-sm font-black text-muted-foreground">
            <a href="#features">{t("footerFeatures")}</a>
            <a href="#signup">{t("footerSignup")}</a>
            <Link href="/login" className="inline-flex items-center gap-1 no-underline">
              {t("footerLogin")}
              <CtaIcon aria-hidden="true" />
            </Link>
          </div>
        </div>
      </footer>
    </main>
    </HomeAuthRedirect>
  );
}
