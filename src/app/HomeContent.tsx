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

          <section className="hero-section">
            <div className="hero-watermark" aria-hidden="true">GM</div>
            <div className="hero-pulse-ring" aria-hidden="true" />
            <div className="hero-pulse-ring" aria-hidden="true" />
            <div className="hero-pulse-ring" aria-hidden="true" />

            <div className="hero-inner">
              <div className="hero-fade-in">
                <span className="hero-eyebrow">{t("heroAudienceOwners")}</span>
              </div>

              <div className="hero-fade-in">
                <div className="hero-accent-bar" />
              </div>

              <h1 className="hero-fade-in hero-headline">{t("heroTitle")}</h1>

              <p className="hero-fade-in hero-sub">{t("heroSubtitle")}</p>

              <div className="hero-fade-in hero-actions">
                <Link
                  href="/signup"
                  className="cta-super"
                >
                  {t("navStart")}
                  <EndIcon aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-8 py-4 text-sm font-black text-foreground no-underline hover:bg-surface"
                >
                  {t("footerLogin")}
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-8 py-4 text-sm font-black text-foreground no-underline hover:bg-surface"
                >
                  {t("heroCtaFeatures")}
                </a>
              </div>

              <div className="hero-fade-in" style={{ marginTop: "2rem" }}>
                <Link
                  href="/gyms"
                  className="inline-flex items-center gap-3 rounded-2xl border-2 border-primary px-8 py-4 text-base font-black text-primary no-underline shadow-soft hover:bg-primary-soft/30"
                >
                  <FiSearch className="shrink-0" aria-hidden="true" />
                  {t("discoverTitle")}
                </Link>
              </div>
            </div>
          </section>

          <section id="features" className="features-section scroll-mt-20">
            <div className="features-header">
              <div className="features-accent-bar" />
              <h2 className="features-title">{t("featuresTitle")}</h2>
              <p className="features-sub">
                {locale === "fa"
                  ? "ابزارهایی که برای مدیریت روزانه باشگاه نیاز دارید."
                  : "The tools you need to run your gym day-to-day."}
              </p>
            </div>

            <div className="features-grid">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                const num = String(i + 1).padStart(2, "0");
                return (
                  <article key={feature.title} className="feature-card card-fade-in">
                    <div className="feature-card-top">
                      <span className="feature-card-num">{num}</span>
                      <Icon className="feature-card-icon" aria-hidden="true" />
                    </div>
                    <h3 className="feature-card-title">{feature.title}</h3>
                    <p className="feature-card-desc">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <footer className="landing-footer">
            <div className="footer-accent-bar" />
            <div className="footer-inner">
              <p className="footer-copy">
                &copy; {new Date().getFullYear()} {t("brandName")}. {t("footerRights")}
              </p>
              <div className="footer-links">
                <a href="#features" className="footer-link">{t("footerFeatures")}</a>
                <Link href="/gyms" className="footer-link">{t("discoverTitle")}</Link>
                <Link href="/signup" className="footer-link">{t("footerSignup")}</Link>
                <Link href="/login" className="footer-link">
                  {t("footerLogin")}
                  <EndIcon aria-hidden="true" className="inline-block ms-1" />
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </HomeAuthRedirect>
  );
}
