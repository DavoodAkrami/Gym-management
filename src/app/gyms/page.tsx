"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiPhone,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { getTranslation } from "@/lib/i18n/translations";
import { searchPublicGyms } from "@/lib/supabase/public-signup";
import type { PublicGymInfo } from "@/lib/supabase/public-signup";
import { useAppSelector } from "@/lib/store/hooks";
import { PreferencesBar } from "@/components/PreferencesBar";

const PAGE_SIZE = 10;

function SkeletonCard() {
  return (
    <div className="gyms-skeleton" style={{ padding: "1.5rem" }}>
      <div className="gyms-skeleton-shimmer" style={{ position: "absolute", inset: 0 }} />
      <div className="flex items-center gap-4">
        <div style={{
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "var(--radius-glass-sm)",
          background: "var(--surface-muted)",
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            height: "1rem",
            width: "60%",
            borderRadius: "999px",
            background: "var(--surface-muted)",
          }} />
          <div style={{
            height: "0.8rem",
            width: "40%",
            marginTop: "0.5rem",
            borderRadius: "999px",
            background: "var(--surface-muted)",
          }} />
        </div>
      </div>
      <div style={{
        height: "0.8rem",
        width: "70%",
        marginTop: "1rem",
        borderRadius: "999px",
        background: "var(--surface-muted)",
      }} />
    </div>
  );
}

export default function GymsPage() {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [query, setQuery] = useState("");
  const [gyms, setGyms] = useState<PublicGymInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchPage = useCallback(async (q: string, off: number, append: boolean) => {
    setLoading(true);
    setError(false);
    try {
      const result = await searchPublicGyms(q, off, PAGE_SIZE);
      if (append) {
        setGyms((prev) => [...prev, ...result.data]);
      } else {
        setGyms(result.data);
      }
      setTotal(result.total);
      setOffset(off + result.data.length);
    } catch {
      setError(true);
      if (!append) setGyms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setGyms([]);
      setOffset(0);
      fetchPage(query, 0, false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchPage]);

  useEffect(() => {
    fetchPage("", 0, false);
    searchInputRef.current?.focus();
  }, [fetchPage]);

  const hasMore = offset < total;
  const EndIcon = locale === "fa" ? FiArrowLeft : FiArrowRight;

  return (
    <main className="gyms-section min-h-screen px-5 py-5 text-foreground sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        {/* Header */}
        <div className="surface-panel flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground no-underline hover:bg-surface"
              aria-label={t("gymsBackHome")}
            >
              {locale === "fa" ? <FiArrowRight aria-hidden="true" /> : <FiArrowLeft aria-hidden="true" />}
            </Link>
            <span className="text-sm font-black">{t("gymsPageTitle")}</span>
          </div>
          <div className="flex items-center gap-2">
            <PreferencesBar />
          </div>
        </div>

        {/* Hero */}
        <section className="gyms-hero py-14 sm:py-18">
          <div className="gyms-fade-in">
            <span className="gyms-eyebrow">{locale === "fa" ? "فهرست باشگاه‌ها" : "GYM DIRECTORY"}</span>
          </div>
          <div className="gyms-fade-in" style={{ marginTop: "0.75rem" }}>
            <div className="gyms-accent" />
          </div>
          <h1 className="gyms-fade-in gyms-title" style={{
            fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
            marginTop: "1.25rem",
            maxWidth: "7em",
          }}>
            {t("gymsPageTitle")}
          </h1>
          <p className="gyms-fade-in gyms-sub" style={{
            marginTop: "1rem",
            fontSize: "1.05rem",
          }}>
            {t("gymsPageDesc")}
          </p>
        </section>

        {/* Search */}
        <div className="gyms-fade-in gyms-search" style={{ marginBottom: "2.5rem" }}>
          <div style={{ position: "relative", maxWidth: "36rem" }}>
            <FiSearch
              className="pointer-events-none absolute"
              style={{
                insetInlineStart: "1.25rem",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.2rem",
                color: "var(--muted-foreground)",
              }}
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("discoverSearchPlaceholder")}
              style={{
                width: "100%",
                padding: "1rem 1.25rem 1rem 3.25rem",
                fontSize: "1rem",
                fontWeight: 700,
                borderRadius: "var(--radius-glass-xl)",
                border: "1px solid var(--border)",
                background: "var(--glass)",
                color: "var(--foreground)",
                outline: "none",
                backdropFilter: "blur(var(--blur-glass))",
                boxShadow: "var(--shadow-glass-soft)",
              }}
              dir={locale === "fa" ? "rtl" : "ltr"}
              onKeyDown={(e) => {
                if (query && e.key === "Escape") {
                  setQuery("");
                  searchInputRef.current?.blur();
                }
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{
                  position: "absolute",
                  insetInlineEnd: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "999px",
                  border: "none",
                  background: "var(--surface-muted)",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                }}
                aria-label="Clear search"
              >
                <FiX aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Loading (first fetch) */}
        {loading && gyms.length === 0 && !error ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="gyms-card-stagger" style={{ position: "relative" }}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : error && gyms.length === 0 && query.length > 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              {t("discoverNoResults")}
            </p>
          </div>
        ) : error && gyms.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="gyms-accent" style={{ margin: "0 auto" }} />
            <h2 className="text-lg font-black">
              {locale === "fa" ? "خطا در بارگذاری" : "Could not load gyms"}
            </h2>
            <p className="text-sm font-semibold text-muted-foreground">
              {locale === "fa"
                ? "مشکلی پیش آمده است. لطفاً دوباره تلاش کنید."
                : "Something went wrong. Please try again."}
            </p>
            <button
              type="button"
              onClick={() => fetchPage(query, 0, false)}
              className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black no-underline shadow-soft"
            >
              {locale === "fa" ? "تلاش دوباره" : "Try again"}
            </button>
          </div>
        ) : gyms.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="gyms-accent" style={{ margin: "0 auto" }} />
            <h2 className="text-lg font-black">
              {locale === "fa" ? "هنوز باشگاهی ثبت نشده" : "No gyms registered yet"}
            </h2>
            <p className="text-sm font-semibold text-muted-foreground max-w-md">
              {locale === "fa"
                ? "هنوز هیچ باشگاهی در پلتفرم ثبت نکرده است. اولین نفری باشید که باشگاه خود را اضافه می‌کند."
                : "No gyms have registered on the platform yet. Be the first to add yours."}
            </p>
            <Link
              href="/signup"
              className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black no-underline shadow-soft"
            >
              {t("navStart")}
              <EndIcon aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            {/* Gym Cards */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gyms.map((gym, i) => (
                <Link
                  key={gym.id}
                  href={`/gyms/${gym.slug}`}
                  className="gyms-card gyms-card-stagger"
                >
                  {/* Bib number */}
                  <div className="gyms-card-bib" style={{ marginBottom: "0.75rem" }}>
                    {String(offset + i + 1).padStart(2, "0")}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="gyms-card-badge">
                      {gym.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="gyms-card-name truncate">{gym.name}</h3>
                      <p className="truncate text-sm font-semibold text-muted-foreground" style={{ marginTop: "0.15rem" }}>
                        {gym.address || "—"}
                      </p>
                    </div>
                    {locale === "fa" ? (
                      <FiChevronLeft className="gyms-card-arrow" aria-hidden="true" />
                    ) : (
                      <FiChevronRight className="gyms-card-arrow" aria-hidden="true" />
                    )}
                  </div>

                  <div className="gyms-card-detail" style={{ marginTop: "1rem" }}>
                    <FiMapPin className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{gym.address || "—"}</span>
                  </div>
                  <div className="gyms-card-detail" style={{ marginTop: "0.45rem" }}>
                    <FiPhone className="shrink-0" aria-hidden="true" />
                    <span dir="ltr">{gym.phone || "—"}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load more */}
            <div className="mt-10 flex flex-col items-center gap-4">
              {hasMore && (
                <button
                  type="button"
                  onClick={() => fetchPage(query, offset, true)}
                  disabled={loading}
                  className="btn-primary inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-sm font-black shadow-soft disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t("gymsLoading")}
                    </>
                  ) : (
                    t("gymsLoadMore")
                  )}
                </button>
              )}
              <p className="text-xs font-semibold text-muted-foreground">
                {gyms.length} / {total} {locale === "fa" ? "باشگاه" : "gyms"}
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
