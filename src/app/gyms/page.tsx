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
} from "react-icons/fi";
import { getTranslation } from "@/lib/i18n/translations";
import { searchPublicGyms } from "@/lib/supabase/public-signup";
import type { PublicGymInfo } from "@/lib/supabase/public-signup";
import { useAppSelector } from "@/lib/store/hooks";
import { PreferencesBar } from "@/components/PreferencesBar";

const PAGE_SIZE = 10;

export default function GymsPage() {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [query, setQuery] = useState("");
  const [gyms, setGyms] = useState<PublicGymInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
    } catch (e) {
      setError(true);
      setErrorMessage(e instanceof Error ? e.message : "Unknown error");
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

  return (
    <main className="min-h-screen px-5 py-5 text-foreground sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
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

        <div className="py-10 text-center sm:py-14">
          <h1 className="text-3xl font-black sm:text-4xl">{t("gymsPageTitle")}</h1>
          <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-7 text-muted-foreground">
            {t("gymsPageDesc")}
          </p>
        </div>

        <div className="relative mx-auto mb-10 w-full max-w-md">
          <FiSearch
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("discoverSearchPlaceholder")}
            className="w-full rounded-2xl border border-border bg-surface py-3.5 pl-12 pr-5 text-sm font-semibold text-foreground outline-none placeholder:text-placeholder focus:border-input-focus-border"
            dir={locale === "fa" ? "rtl" : "ltr"}
          />
        </div>

        {loading && gyms.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-4 border-border border-t-primary" />
          </div>
        ) : error && gyms.length === 0 && query.length > 0 ? (
          <p className="py-16 text-center text-sm font-semibold text-muted-foreground">
            {t("discoverNoResults")}
          </p>
        ) : error && gyms.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              {locale === "fa"
                ? "امکان بارگذاری باشگاه‌ها وجود ندارد. لطفاً مطمئن شوید که تابع search_public_gyms در Supabase ایجاد شده است."
                : "Could not load gyms. Make sure the search_public_gyms function exists in your Supabase instance."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground/60">{errorMessage}</p>
          </div>
        ) : gyms.length === 0 ? (
          <p className="py-16 text-center text-sm font-semibold text-muted-foreground">
            {locale === "fa"
              ? "هنوز باشگاهی ثبت نشده است."
              : "No gyms registered yet."}
          </p>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {gyms.map((gym) => (
                <Link
                  key={gym.id}
                  href={`/gyms/${gym.slug}`}
                  className="group rounded-2xl border border-border p-5 no-underline transition-colors hover:border-interactive-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-lg font-black text-on-primary">
                      {gym.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-black text-foreground">
                        {gym.name}
                      </h3>
                      <p className="truncate text-sm font-medium text-muted-foreground">
                        {gym.address || "—"}
                      </p>
                    </div>
                    {locale === "fa" ? (
                      <FiChevronLeft className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                    ) : (
                      <FiChevronRight className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <FiMapPin className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{gym.address || "—"}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <FiPhone className="shrink-0" aria-hidden="true" />
                    <span dir="ltr">{gym.phone || "—"}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              {hasMore && (
                <button
                  type="button"
                  onClick={() => fetchPage(query, offset, true)}
                  disabled={loading}
                  className="btn-primary inline-flex items-center gap-2 rounded-2xl px-8 py-3 text-sm font-black shadow-soft disabled:opacity-50"
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
