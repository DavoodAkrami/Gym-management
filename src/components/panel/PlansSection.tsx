"use client";

import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { GymPlan } from "@/lib/store/slices";
import type { GymPlanInput } from "@/lib/supabase/gym-profile";

type PlanModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; plan: GymPlan }
  | { type: "delete"; plan: GymPlan };

type PlansSectionProps = {
  plans: GymPlan[];
  planModal: PlanModalState;
  planForm: GymPlanInput;
  savingPlan: boolean;
  onOpenModal: (state: PlanModalState) => void;
  onCloseModal: () => void;
  onPlanFormChange: (form: GymPlanInput) => void;
  onPlanSubmit: (e: React.FormEvent) => void;
  onDeletePlan: () => void;
  t: (key: TranslationKey) => string;
};

export function PlansSection({
  plans,
  planModal,
  planForm,
  savingPlan,
  onOpenModal,
  onCloseModal,
  onPlanFormChange,
  onPlanSubmit,
  onDeletePlan,
  t,
}: PlansSectionProps) {
  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground">{t("profilePlansSection")}</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{t("profilePlansDesc")}</p>
          </div>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
            onClick={() => onOpenModal({ type: "add" })}
          >
            <FiPlus aria-hidden="true" />
            {t("profilePlanAdd")}
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-glass-border p-8 text-center">
            <p className="text-sm font-bold text-muted-foreground">{t("profilePlansEmpty")}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex flex-col gap-3 rounded-xl border border-glass-border bg-glass/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-black text-foreground">{plan.name}</p>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t("currencyToman")} {plan.price.toFixed(2)} · {plan.duration_days} {t("profilePlanDays")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-glass-border px-3 py-2 text-xs font-bold"
                    onClick={() => onOpenModal({ type: "edit", plan })}
                  >
                    <FiEdit2 aria-hidden="true" />
                    {t("profilePlanEdit")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-bold text-danger"
                    onClick={() => onOpenModal({ type: "delete", plan })}
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
        onClose={onCloseModal}
        title={planModal.type === "edit" ? t("profilePlanEdit") : t("profilePlanAdd")}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={onCloseModal}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="submit"
              form="gym-plan-form"
              disabled={savingPlan}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-70"
            >
              {savingPlan ? <Spinner label={t("uiSaving")} /> : t("memberModalSave")}
            </button>
          </div>
        }
      >
        <form id="gym-plan-form" className="grid gap-3" onSubmit={(e) => onPlanSubmit(e)}>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPlanName")}</span>
            <input
              required
              value={planForm.name}
              onChange={(e) => onPlanFormChange({ ...planForm, name: e.target.value })}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("onboardingPlanPrice")} ({t("currencyToman")})
            </span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={planForm.price || ""}
              onChange={(e) => onPlanFormChange({ ...planForm, price: Number(e.target.value) || 0 })}
              className="w-full px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("onboardingPlanDuration")}</span>
            <input
              required
              type="number"
              min={1}
              step={1}
              value={planForm.duration_days || ""}
              onChange={(e) => onPlanFormChange({ ...planForm, duration_days: Number(e.target.value) || 1 })}
              className="w-full px-3"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={planModal.type === "delete"}
        onClose={onCloseModal}
        title={t("profilePlanDeleteTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-glass-border px-4 py-2 text-sm font-bold"
              onClick={onCloseModal}
            >
              {t("memberModalCancel")}
            </button>
            <button
              type="button"
              disabled={savingPlan}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-black text-danger"
              onClick={() => onDeletePlan()}
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
    </>
  );
}
