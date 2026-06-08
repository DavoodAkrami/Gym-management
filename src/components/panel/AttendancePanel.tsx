"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/date/format";
import { getTranslation } from "@/lib/i18n/translations";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchAttendance, createCheckIn, type AttendanceRecord } from "@/lib/supabase/attendance";
import type { Locale } from "@/lib/store/slices";

type AttendanceDateRange = "today" | "week" | "month";

type AttendancePanelProps = {
  gymId: string;
  locale: Locale;
};

type CheckInModalState = {
  open: boolean;
  memberSearch: string;
  selectedMemberId: string | null;
  selectedMemberName: string;
  checkInDate: string;
  checkInTime: string;
  searchResults: { id: string; first_name: string; last_name: string; phone: string }[];
  searching: boolean;
  saving: boolean;
};

function initialModalState(): CheckInModalState {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);

  return {
    open: false,
    memberSearch: "",
    selectedMemberId: null,
    selectedMemberName: "",
    checkInDate: date,
    checkInTime: time,
    searchResults: [],
    searching: false,
    saving: false,
  };
}

const ranges: { value: AttendanceDateRange; labelKey: "attendanceToday" | "attendanceWeek" | "attendanceMonth" }[] = [
  { value: "today", labelKey: "attendanceToday" },
  { value: "week", labelKey: "attendanceWeek" },
  { value: "month", labelKey: "attendanceMonth" },
];

function getSince(range: AttendanceDateRange): string {
  const now = new Date();
  switch (range) {
    case "today": {
      return now.toISOString().slice(0, 10);
    }
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo.toISOString();
    }
    case "month": {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo.toISOString();
    }
  }
}

export function AttendancePanel({ gymId, locale }: AttendancePanelProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<AttendanceDateRange>("month");
  const [fetchKey, setFetchKey] = useState(0);
  const [modal, setModal] = useState<CheckInModalState>(initialModalState());

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const since = getSince(range);
      const data = await fetchAttendance(gymId, since);
      setRecords(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [gymId, range, t]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, fetchKey]);

  const handleSearchMember = useCallback(async (query: string) => {
    if (!query.trim()) {
      setModal((prev) => ({ ...prev, memberSearch: query, searchResults: [], selectedMemberId: null, selectedMemberName: "" }));
      return;
    }

    setModal((prev) => ({ ...prev, memberSearch: query, searching: true }));

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: searchError } = await supabase
        .from("members")
        .select("id, first_name, last_name, phone")
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`,
        )
        .limit(10);

      if (searchError) throw searchError;

      setModal((prev) => ({
        ...prev,
        searchResults: (data ?? []) as { id: string; first_name: string; last_name: string; phone: string }[],
        searching: false,
      }));
    } catch {
      setModal((prev) => ({ ...prev, searching: false }));
    }
  }, []);

  const handleSelectMember = (memberId: string, memberName: string) => {
    setModal((prev) => ({
      ...prev,
      selectedMemberId: memberId,
      selectedMemberName: memberName,
      memberSearch: memberName,
      searchResults: [],
    }));
  };

  const handleCheckInSubmit = async () => {
    if (!modal.selectedMemberId) return;

    setModal((prev) => ({ ...prev, saving: true }));

    try {
      const checkIn = `${modal.checkInDate}T${modal.checkInTime}:00`;
      await createCheckIn(gymId, modal.selectedMemberId, checkIn);
      setModal(initialModalState());
      setFetchKey((k) => k + 1);
    } catch (caught) {
      setModal((prev) => ({ ...prev, saving: false }));
      /* error handled by caller */
    }
  };

  const renderDate = (iso: string) => {
    const date = new Date(iso);
    const time = date.toLocaleTimeString(locale === "fa" ? "fa-IR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formatDate(date, locale)} ${time}`;
  };

  if (loading) {
    return (
      <div className="panel-section-fill flex items-center justify-center rounded-2xl bg-glass/40">
        <Spinner label={t("uiLoading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-section-fill flex items-center justify-center rounded-2xl bg-glass/40">
        <p className="text-sm font-semibold text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="panel-section-fill space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
                range === r.value
                  ? "border-glass-border bg-glass text-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-glass-border hover:bg-glass/60"
              }`}
            >
              {t(r.labelKey)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModal({ ...initialModalState(), open: true })}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black"
        >
          {t("attendanceCheckIn")}
        </button>
      </div>

      {records.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-glass-border bg-glass/40 px-6 py-12 text-center">
          <p className="max-w-md text-sm font-bold text-muted-foreground">{t("attendanceNoRecords")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between rounded-xl border border-glass-border bg-glass/60 px-4 py-3"
            >
              <span className="text-sm font-bold">
                {record.members
                  ? `${record.members.first_name} ${record.members.last_name}`
                  : t("attendanceUnknownMember")}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {renderDate(record.check_in)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal.open}
        onClose={() => setModal(initialModalState())}
        title={t("attendanceCheckIn")}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={() => setModal(initialModalState())}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleCheckInSubmit()}
              disabled={!modal.selectedMemberId || modal.saving}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
            >
              {modal.saving ? <Spinner label={t("uiSaving")} /> : t("attendanceConfirmCheckIn")}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("attendanceSearchMember")}</span>
            <input
              value={modal.memberSearch}
              onChange={(e) => void handleSearchMember(e.target.value)}
              className="w-full px-3"
              placeholder={t("attendanceSearchPlaceholder")}
            />
          </label>

          {modal.searching ? (
            <div className="flex justify-center py-2">
              <Spinner label={t("uiSearching")} />
            </div>
          ) : modal.searchResults.length > 0 ? (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-glass-border p-1">
              {modal.searchResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMember(m.id, `${m.first_name} ${m.last_name}`)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    modal.selectedMemberId === m.id
                      ? "bg-glass text-foreground"
                      : "hover:bg-glass/60 text-muted-foreground"
                  }`}
                >
                  {m.first_name} {m.last_name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{m.phone}</span>
                </button>
              ))}
            </div>
          ) : modal.memberSearch && !modal.selectedMemberId ? (
            <p className="text-xs font-medium text-muted-foreground">{t("attendanceNoResults")}</p>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("attendanceDate")}</span>
            <input
              type="date"
              value={modal.checkInDate}
              onChange={(e) => setModal((prev) => ({ ...prev, checkInDate: e.target.value }))}
              className="w-full px-3"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("attendanceTime")}</span>
            <input
              type="time"
              value={modal.checkInTime}
              onChange={(e) => setModal((prev) => ({ ...prev, checkInTime: e.target.value }))}
              className="w-full px-3"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
