"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiLogOut, FiPlus, FiTrash2 } from "react-icons/fi";
import { CurrencySelect } from "@/components/CurrencySelect";
import { Modal } from "@/components/Modal";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { StaffAvatar } from "@/components/ui/StaffAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { readAvatarFile } from "@/lib/staff/avatar";
import { getTranslation } from "@/lib/i18n/translations";
import {
  createGymPlan,
  deleteGymPlan,
  fetchGymProfile,
  updateGymPlan,
  updateGymProfile,
  updateOwnerProfile,
  type GymPlanInput,
  type GymProfileInput,
} from "@/lib/supabase/gym-profile";
import { normalizeGymCurrency, type GymCurrencyCode } from "@/lib/currency/options";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authActions, gymPlansActions, gymsActions, type GymPlan } from "@/lib/store/slices";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import type { Locale } from "@/lib/store/slices";

type GymProfilePanelProps = {
  gymId: string;
  gymSlug: string;
  locale: Locale;
};

type PlanModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; plan: GymPlan }
  | { type: "delete"; plan: GymPlan };

function emptyPlanForm(): GymPlanInput {
  return { name: "", price: 0, duration_days: 30 };
}

function planToForm(plan: GymPlan): GymPlanInput {
  return {
    name: plan.name,
    price: plan.price,
    duration_days: plan.duration_days,
  };
}

export function GymProfilePanel({ gymId, gymSlug, locale }: GymProfilePanelProps) {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const authSession = useAppSelector((state) => state.auth.session);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);

  const [ownerName, setOwnerName] = useState(authUser?.full_name ?? "");
  const [ownerAvatar, setOwnerAvatar] = useState("");
  const [savingOwner, setSavingOwner] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingGym, setSavingGym] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [slug, setSlug] = useState(gymSlug);
  const [gymForm, setGymForm] = useState<GymProfileInput>({
    name: "",
    address: "",
    phone: "",
    base_currency: "USD",
    logo_url: "",
  });
  const [plans, setPlans] = useState<GymPlan[]>([]);
  const [planModal, setPlanModal] = useState<PlanModalState>({ type: "none" });
  const [planForm, setPlanForm] = useState<GymPlanInput>(emptyPlanForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { gym, plans: planList } = await fetchGymProfile(gymId);
      setSlug(gym.slug);
      setGymForm({
        name: gym.name,
        address: gym.address,
        phone: gym.phone,
        base_currency: normalizeGymCurrency(gym.base_currency),
        logo_url: gym.logo_url ?? "",
      });
      setPlans(planList);
      dispatch(gymsActions.upsertGym(gym));
      planList.forEach((plan) => dispatch(gymPlansActions.upsertGymPlan(plan)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : getTranslation(locale, "authErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [dispatch, gymId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const currencyLabel = useMemo(
    () => normalizeGymCurrency(gymForm.base_currency),
    [gymForm.base_currency],
  );

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    dispatch(authActions.clearAuth());
    window.location.href = "/login";
  };

  const handleGymSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSavingGym(true);
    setError(null);
    setSuccess(null);

    try {
      const gym = await updateGymProfile(gymId, {
        ...gymForm,
        logo_url: gymForm.logo_url?.trim() || null,
      });
      dispatch(gymsActions.upsertGym(gym));
      setSuccess(t("profileGymSaved"));
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSavingGym(false);
    }
  };

  const openPlanModal = (state: PlanModalState) => {
    setError(null);
    setPlanModal(state);
    if (state.type === "edit") {
      setPlanForm(planToForm(state.plan));
    } else if (state.type === "add") {
      setPlanForm(emptyPlanForm());
    }
  };

  const handlePlanSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!planForm.name.trim()) {
      setError(t("profilePlanNameRequired"));
      return;
    }

    setSavingPlan(true);
    setError(null);

    try {
      if (planModal.type === "add") {
        const plan = await createGymPlan(gymId, planForm);
        setPlans((prev) => [...prev, plan]);
        dispatch(gymPlansActions.upsertGymPlan(plan));
      } else if (planModal.type === "edit") {
        const plan = await updateGymPlan(gymId, planModal.plan.id, planForm);
        setPlans((prev) => prev.map((item) => (item.id === plan.id ? plan : item)));
        dispatch(gymPlansActions.upsertGymPlan(plan));
      }
      setPlanModal({ type: "none" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async () => {
    if (planModal.type !== "delete") {
      return;
    }

    setSavingPlan(true);
    setError(null);

    try {
      await deleteGymPlan(gymId, planModal.plan.id);
      setPlans((prev) => prev.filter((item) => item.id !== planModal.plan.id));
      dispatch(gymPlansActions.removeGymPlan(planModal.plan.id));
      setPlanModal({ type: "none" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) {
    return <ListSkeleton rows={5} />;
  }

  return (
    <div className="space-y-8">
      <p className="text-sm font-medium leading-7 text-muted-foreground">{t("profilePanelDesc")}</p>

      {error ? (
        <p className="panel-alert border border-danger/30 bg-danger/10 text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="panel-alert border border-success/30 bg-success/10 text-success" role="status">
          {success}
        </p>
      ) : null}

      <form className="panel-card space-y-4 p-5 sm:p-6" onSubmit={(e) => void handleGymSubmit(e)}>
        <h2 className="text-lg font-black text-foreground">{t("profileGymSection")}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("onboardingGymName")}
            </span>
            <input
              required
              value={gymForm.name}
              onChange={(e) => setGymForm((v) => ({ ...v, name: e.target.value }))}
              className="w-full px-3"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("profileGymSlug")}
            </span>
            <input readOnly value={slug} className="w-full px-3 opacity-80" />
            <p className="mt-1 text-xs font-medium text-muted-foreground">{t("profileGymSlugHint")}</p>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("onboardingAddress")}
            </span>
            <textarea
              required
              rows={2}
              value={gymForm.address}
              onChange={(e) => setGymForm((v) => ({ ...v, address: e.target.value }))}
              className="w-full px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("onboardingPhone")}
            </span>
            <input
              required
              value={gymForm.phone}
              onChange={(e) => setGymForm((v) => ({ ...v, phone: e.target.value }))}
              className="w-full px-3"
            />
          </label>

          <div className="block sm:col-span-1">
            <CurrencySelect
              locale={locale}
              value={normalizeGymCurrency(gymForm.base_currency)}
              onChange={(value: GymCurrencyCode) =>
                setGymForm((v) => ({ ...v, base_currency: value }))
              }
            />
          </div>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("profileGymLogo")}
            </span>
            <input
              type="url"
              value={gymForm.logo_url ?? ""}
              onChange={(e) => setGymForm((v) => ({ ...v, logo_url: e.target.value }))}
              className="w-full px-3"
              placeholder="https://"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingGym}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-black disabled:opacity-70"
          >
            {savingGym ? <Spinner label={t("uiSaving")} /> : t("profileSaveGym")}
          </button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground">{t("profilePlansSection")}</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{t("profilePlansDesc")}</p>
          </div>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
            onClick={() => openPlanModal({ type: "add" })}
          >
            <FiPlus aria-hidden="true" />
            {t("profilePlanAdd")}
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="panel-section-fill panel-card flex items-center justify-center p-8 text-center">
            <p className="text-sm font-bold text-muted-foreground">{t("profilePlansEmpty")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="panel-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-black text-foreground">{plan.name}</p>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {currencyLabel} {plan.price.toFixed(2)} · {plan.duration_days}{" "}
                    {t("profilePlanDays")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-glass-border px-3 py-2 text-xs font-bold"
                    onClick={() => openPlanModal({ type: "edit", plan })}
                  >
                    <FiEdit2 aria-hidden="true" />
                    {t("profilePlanEdit")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-bold text-danger"
                    onClick={() => openPlanModal({ type: "delete", plan })}
                  >
                    <FiTrash2 aria-hidden="true" />
                    {t("profilePlanDelete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={planModal.type === "add" || planModal.type === "edit"}
        onClose={() => setPlanModal({ type: "none" })}
        title={planModal.type === "edit" ? t("profilePlanEdit") : t("profilePlanAdd")}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={() => setPlanModal({ type: "none" })}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="submit"
              form="gym-plan-form"
              disabled={savingPlan}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
            >
              {savingPlan ? <Spinner label={t("uiSaving")} /> : t("memberModalSave")}
            </button>
          </div>
        }
      >
        <form id="gym-plan-form" className="grid gap-3" onSubmit={(e) => void handlePlanSubmit(e)}>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("onboardingPlanName")}
            </span>
            <input
              required
              value={planForm.name}
              onChange={(e) => setPlanForm((v) => ({ ...v, name: e.target.value }))}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("onboardingPlanPrice")} ({currencyLabel})
            </span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={planForm.price || ""}
              onChange={(e) =>
                setPlanForm((v) => ({ ...v, price: Number(e.target.value) || 0 }))
              }
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("onboardingPlanDuration")}
            </span>
            <input
              required
              type="number"
              min={1}
              step={1}
              value={planForm.duration_days || ""}
              onChange={(e) =>
                setPlanForm((v) => ({ ...v, duration_days: Number(e.target.value) || 1 }))
              }
              className="w-full px-3"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={planModal.type === "delete"}
        onClose={() => setPlanModal({ type: "none" })}
        title={t("profilePlanDeleteTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={() => setPlanModal({ type: "none" })}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="button"
              disabled={savingPlan}
              className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-black text-danger"
              onClick={() => void handleDeletePlan()}
            >
              {savingPlan ? <Spinner label={t("uiDeleting")} /> : t("memberDeleteConfirm")}
            </button>
          </div>
        }
      >
        <p className="text-sm font-medium text-muted-foreground">
          {planModal.type === "delete" ? planModal.plan.name : ""}
        </p>
      </Modal>

      <section className="panel-card border border-glass-border p-5">
        <h2 className="text-lg font-black text-foreground">{t("ownerProfileSection")}</h2>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{t("ownerProfileDesc")}</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              setSavingOwner(true);
              setError(null);
              try {
                await updateOwnerProfile(ownerName, ownerAvatar);
                if (authUser) {
                  dispatch(
                    authActions.setAuth({
                      user: { ...authUser, full_name: ownerName },
                      session: authSession,
                    }),
                  );
                }
                setSuccess(t("ownerProfileSaved"));
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : t("authErrorGeneric"));
              } finally {
                setSavingOwner(false);
              }
            })();
          }}
        >
          <div className="flex items-center gap-4">
            <StaffAvatar
              firstName={ownerName.split(" ")[0] ?? ""}
              lastName={ownerName.split(" ").slice(1).join(" ") ?? ""}
              avatarUrl={ownerAvatar}
              size="lg"
            />
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("staffPhoto")}</span>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  void readAvatarFile(file).then(setOwnerAvatar).catch(() => {});
                }}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("authFullName")}</span>
            <input
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3"
            />
          </label>
          <button
            type="submit"
            disabled={savingOwner}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
          >
            {savingOwner ? <Spinner label={t("uiSaving")} /> : t("ownerProfileSave")}
          </button>
        </form>
      </section>

      <section className="panel-card border border-glass-border p-5">
        <h2 className="text-lg font-black text-foreground">{t("profileAccountSection")}</h2>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{t("profileLogoutDesc")}</p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-black text-danger"
        >
          <FiLogOut aria-hidden="true" />
          {t("profileLogout")}
        </button>
      </section>
    </div>
  );
}
