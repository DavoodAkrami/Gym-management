"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import {
  fetchCoachProgramsForMember,
  memberJoinCoachProgram,
  type CoachProgramOffer,
} from "@/lib/supabase/member-portal";
import type { Locale } from "@/lib/store/slices";

type MemberProgramsSectionProps = {
  locale: Locale;
  coachId: string | null | undefined;
  currency: string;
  onJoined: () => void;
};

export function MemberProgramsSection({
  locale,
  coachId,
  currency,
  onJoined,
}: MemberProgramsSectionProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const [programs, setPrograms] = useState<CoachProgramOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!coachId) {
      setPrograms([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPrograms(await fetchCoachProgramsForMember(coachId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [coachId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleJoin = async (programId: string) => {
    setJoiningId(programId);
    setError(null);
    try {
      await memberJoinCoachProgram(programId);
      onJoined();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setJoiningId(null);
    }
  };

  if (!coachId) {
    return (
      <p className="text-sm font-bold text-muted-foreground">{t("memberProgramsPickCoachFirst")}</p>
    );
  }

  if (loading) {
    return <p className="text-sm font-bold text-muted-foreground">{t("uiLoading")}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium leading-7 text-muted-foreground">{t("memberProgramsSectionDesc")}</p>
      {error ? <p className="panel-alert border-danger/30 bg-danger/10 text-danger">{error}</p> : null}
      {programs.length === 0 ? (
        <p className="text-sm font-bold text-muted-foreground">{t("memberProgramsEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {programs.map((program) => (
            <li key={program.id} className="panel-card p-4">
              <p className="font-black text-foreground">{program.name}</p>
              {program.description ? (
                <p className="mt-1 text-sm font-medium text-muted-foreground">{program.description}</p>
              ) : null}
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                {program.price} {currency} · {program.duration_days} {t("profilePlanDays")}
              </p>
              <button
                type="button"
                disabled={Boolean(joiningId)}
                className="btn-primary inline-flex items-center justify-center mt-3 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
                onClick={() => void handleJoin(program.id)}
              >
                {joiningId === program.id ? <Spinner size="sm" label={t("uiSaving")} /> : t("memberProgramJoin")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
