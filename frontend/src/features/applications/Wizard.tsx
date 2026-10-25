import axios from "axios";
import clsx from "clsx";
import { useMemo, useState, type ReactNode } from "react";

import { Fieldset, Segmented, SelectField, TextField } from "@/components/Fields";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BanIcon,
  CheckIcon,
  CupIcon,
  EditIcon,
  TrendIcon,
  UserIcon,
} from "@/components/icons";
import { StatusBadge } from "@/components/Badges";
import type { ApiError } from "@/lib/api";
import { CREDIT_HISTORY_LABEL, money, monthLabels } from "@/lib/format";
import { useScenarios } from "@/lib/queries";
import type { ApplicationDraft, CreditHistory, Scenario } from "@/lib/types";
import {
  EMPTY_VALUES,
  STEPS,
  errorsForSteps,
  revenueIncomplete,
  stepOfField,
  validateStep,
  valuesFromScenario,
  valuesToDraft,
  type StepErrors,
  type WizardValues,
} from "@/lib/wizard";

import { WizardRibbon, type StepState } from "./WizardRibbon";

const PURPOSES = [
  "Пополнение оборотных средств",
  "Закупка оборудования",
  "Расширение бизнеса",
  "Открытие новой точки",
  "Рефинансирование",
  "Другое",
];

const SCENARIO_STYLE: Record<string, { tile: string; icon: ReactNode }> = {
  low_risk: { tile: "bg-lime-500 text-ink-900", icon: <TrendIcon size={18} /> },
  medium_risk: { tile: "bg-violet-500 text-white", icon: <UserIcon size={18} /> },
  high_risk: { tile: "bg-ink-900 text-white", icon: <BanIcon size={18} /> },
  cafe: { tile: "bg-amber-500 text-ink-900", icon: <CupIcon size={18} /> },
};

const HISTORY_OPTIONS = Object.entries(CREDIT_HISTORY_LABEL) as [CreditHistory, string][];

function ScenarioCards({
  scenarios,
  selected,
  onPick,
}: {
  scenarios: Scenario[];
  selected: string | null;
  onPick: (scenario: Scenario) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow">Быстрый старт</span>
      <div
        role="radiogroup"
        aria-label="Готовый сценарий"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3"
      >
        {scenarios.map((scenario) => {
          const style = SCENARIO_STYLE[scenario.key] ?? SCENARIO_STYLE.low_risk;
          const active = selected === scenario.key;
          return (
            <button
              key={scenario.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPick(scenario)}
              className={clsx(
                "relative flex min-h-[132px] flex-col gap-3.5 rounded-[20px] p-[18px] text-left",
                active ? "bg-[#FFF7F6] shadow-[inset_0_0_0_2px_#EF3124]" : "bg-mist-50 hover:bg-mist-100",
              )}
            >
              <span className="flex w-full items-start justify-between">
                <span className={clsx("flex h-9 w-9 items-center justify-center rounded-xl", style.tile)}>
                  {style.icon}
                </span>
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
                    <CheckIcon size={12} stroke={3.6} />
                  </span>
                )}
              </span>
              <span className="text-[15px] font-bold leading-[21px]">{scenario.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepFooter({
  step,
  onBack,
  onNext,
  onSkip,
  submitting,
  submitLabel,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const last = step === STEPS.length - 1;
  return (
    <div className="flex flex-wrap justify-between gap-3 border-t border-mist-200 pt-4">
      {step > 0 ? (
        <button type="button" onClick={onBack} className="btn btn-secondary h-[52px] px-6 text-base">
          <ArrowLeftIcon />
          Назад
        </button>
      ) : (
        <span />
      )}
      <div className="flex gap-3">
        {step === 2 && (
          <button type="button" onClick={onSkip} className="btn btn-secondary h-[52px] px-6 text-base">
            Пропустить
          </button>
        )}
        <button
          type="button"
          disabled={submitting}
          onClick={onNext}
          className="btn btn-primary h-[52px] px-7 text-base"
        >
          {last ? submitLabel : "Далее"}
          {!last && <ArrowRightIcon />}
        </button>
      </div>
    </div>
  );
}

export function Wizard({
  mode,
  title,
  initial,
  onSubmit,
}: {
  mode: "create" | "edit";
  title: string;
  initial?: WizardValues;
  onSubmit: (draft: ApplicationDraft) => Promise<unknown>;
}) {
  const scenarios = useScenarios();
  const [values, setValues] = useState<WizardValues>(initial ?? EMPTY_VALUES);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<StepErrors>({});
  const [scenarioKey, setScenarioKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const months = useMemo(() => monthLabels(), []);

  const set = <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const errorSteps = errorsForSteps(errors);
  const states: StepState[] = STEPS.map((_, index) => {
    if (errorSteps.has(index)) return "error";
    if (index === step) return "current";
    return visited.has(index) && index < step ? "done" : "todo";
  });

  function go(target: number) {
    setVisited((current) => new Set(current).add(step));
    setStep(target);
  }

  function next() {
    const stepErrors = validateStep(step, values);
    setErrors((current) => {
      const rest = Object.fromEntries(
        Object.entries(current).filter(([field]) => stepOfField(field) !== step),
      );
      return { ...rest, ...stepErrors };
    });
    if (Object.keys(stepErrors).length > 0) return;
    if (step < STEPS.length - 1) {
      go(step + 1);
      return;
    }
    void submit();
  }

  async function submit() {
    const all = { ...validateStep(0, values), ...validateStep(1, values) };
    if (Object.keys(all).length > 0) {
      setErrors(all);
      setStep(stepOfField(Object.keys(all)[0]));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(valuesToDraft(values));
    } catch (error) {
      if (axios.isAxiosError<ApiError>(error) && error.response?.data) {
        const { detail, field } = error.response.data;
        if (field) {
          setErrors({ [field]: detail });
          setStep(stepOfField(field));
        } else {
          setFormError(detail);
        }
      } else {
        setFormError("Что-то пошло не так");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function pickScenario(scenario: Scenario) {
    setScenarioKey(scenario.key);
    setValues(valuesFromScenario(scenario));
    setErrors({});
  }

  const purposes = values.purpose && !PURPOSES.includes(values.purpose) ? [values.purpose, ...PURPOSES] : PURPOSES;
  const lockCompany = mode === "edit";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="m-0 text-4xl font-extrabold leading-[42px] tracking-[-0.015em]">{title}</h1>
        <StatusBadge status="DRAFT" />
      </div>

      <WizardRibbon current={step} states={states} onGo={go} />

      <section className="card flex flex-col gap-7 p-8">
        <h2 className="m-0 text-[28px] font-extrabold leading-[34px]">{STEPS[step]}</h2>

        {step === 0 && (
          <>
            {!lockCompany && scenarios.data && (
              <ScenarioCards scenarios={scenarios.data} selected={scenarioKey} onPick={pickScenario} />
            )}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5">
              <TextField
                id="w-inn"
                label="ИНН"
                value={values.inn}
                inputMode="numeric"
                disabled={lockCompany}
                error={errors["company.inn"]}
                onChange={(value) => set("inn", value.replace(/[^\d]/g, ""))}
              />
              <TextField
                id="w-name"
                label="Наименование"
                value={values.name}
                disabled={lockCompany}
                error={errors["company.name"]}
                onChange={(value) => set("name", value)}
              />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-ink-600">Форма</span>
                <Segmented
                  label="Форма"
                  value={values.legalForm}
                  onChange={(value) => !lockCompany && set("legalForm", value)}
                  options={[
                    { value: "IP", label: "ИП" },
                    { value: "OOO", label: "ООО" },
                  ]}
                />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <TextField
              id="w-amount"
              label="Сумма"
              hero
              money
              suffix="₽"
              value={values.amount}
              error={errors["loan.amount_rub"]}
              onChange={(value) => set("amount", value)}
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-5">
              <TextField
                id="w-term"
                label="Срок"
                suffix="мес."
                inputMode="numeric"
                value={values.term}
                error={errors["loan.term_months"]}
                onChange={(value) => set("term", value.replace(/[^\d]/g, ""))}
              />
              <SelectField
                id="w-purpose"
                label="Цель"
                value={values.purpose || purposes[0]}
                onChange={(value) => set("purpose", value)}
                options={purposes.map((item) => ({ value: item, label: item }))}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <BusinessStep values={values} set={set} months={months} errors={errors} />
        )}

        {step === 3 && (
          <ReviewStep values={values} months={months} onEdit={setStep} formError={formError} />
        )}

        <StepFooter
          step={step}
          onBack={() => go(step - 1)}
          onNext={next}
          onSkip={() => go(3)}
          submitting={submitting}
          submitLabel={mode === "edit" ? "Сохранить" : "Создать заявку"}
        />
      </section>
    </div>
  );
}

function BusinessStep({
  values,
  set,
  months,
  errors,
}: {
  values: WizardValues;
  set: <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => void;
  months: string[];
  errors: StepErrors;
}) {
  const money_ = (id: string, label: string, key: keyof WizardValues, error?: string) => (
    <TextField
      key={id}
      id={id}
      label={label}
      money
      suffix="₽"
      value={values[key] as string}
      error={error}
      onChange={(value) => set(key, value as never)}
    />
  );
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5">
        <TextField
          id="w-age"
          label="Возраст бизнеса"
          suffix="мес."
          inputMode="numeric"
          value={values.age}
          error={errors["company.age_months"]}
          onChange={(value) => set("age", value.replace(/[^\d]/g, ""))}
        />
      </div>
      <Fieldset legend="Выручка за последние 6 месяцев">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-5">
          {months.map((label, index) => (
            <TextField
              key={label}
              id={`w-rev-${index}`}
              label={label}
              money
              suffix="₽"
              value={values.revenues[index]}
              onChange={(value) =>
                set(
                  "revenues",
                  values.revenues.map((item, position) => (position === index ? value : item)),
                )
              }
            />
          ))}
        </div>
      </Fieldset>
      <Fieldset legend="Расходы и долги">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5">
          {money_("w-opex", "Среднемесячные операционные расходы", "opex")}
          {money_("w-pay", "Текущие ежемесячные платежи по долгам", "payments")}
          {money_("w-debt", "Остаток долга до нового кредита", "debt")}
        </div>
      </Fieldset>
      <Fieldset legend="Баланс">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5">
          {money_("w-eq", "Собственный капитал", "equity")}
          {money_("w-ca", "Оборотные активы", "assets")}
          {money_("w-cl", "Краткосрочные обязательства", "liabilities")}
        </div>
      </Fieldset>
      <Fieldset legend="Кредитная история">
        <div
          role="radiogroup"
          aria-label="Кредитная история"
          className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-2.5"
        >
          {HISTORY_OPTIONS.map(([value, label]) => {
            const active = values.history === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set("history", active ? "" : value)}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-semibold",
                  active ? "bg-[#FFF7F6] shadow-[inset_0_0_0_2px_#EF3124]" : "bg-mist-50 hover:bg-mist-100",
                )}
              >
                <span
                  className={clsx(
                    "flex h-5 w-5 flex-none items-center justify-center rounded-full border-2",
                    active ? "border-red-500" : "border-mist-300 bg-white",
                  )}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </Fieldset>
    </>
  );
}

function SummaryBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-mist-50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-[15px] font-extrabold">{title}</h3>
        <button
          type="button"
          aria-label={`Изменить: ${title}`}
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-900"
        >
          <EditIcon size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] font-semibold text-ink-500">{label}</dt>
      <dd className="m-0 text-[15px] font-bold tabular-nums">{value || "—"}</dd>
    </div>
  );
}

function ReviewStep({
  values,
  months,
  onEdit,
  formError,
}: {
  values: WizardValues;
  months: string[];
  onEdit: (step: number) => void;
  formError: string | null;
}) {
  const asMoney = (value: string) => (value === "" ? "" : money(Number(value)));
  const incomplete = revenueIncomplete(values);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4">
        <SummaryBlock title="1 · Компания" onEdit={() => onEdit(0)}>
          <span className="text-2xl font-extrabold">{values.name || "—"}</span>
          <dl className="m-0 grid grid-cols-2 gap-3">
            <Row label="ИНН" value={values.inn} />
            <Row label="Форма" value={values.legalForm === "IP" ? "ИП" : "ООО"} />
          </dl>
        </SummaryBlock>
        <SummaryBlock title="2 · Условия кредита" onEdit={() => onEdit(1)}>
          <span className="text-2xl font-extrabold tabular-nums">{asMoney(values.amount) || "—"}</span>
          <dl className="m-0 grid grid-cols-2 gap-3">
            <Row label="Срок" value={values.term ? `${values.term} мес.` : ""} />
            <Row label="Цель" value={values.purpose} />
          </dl>
        </SummaryBlock>
      </div>
      <SummaryBlock title="3 · Сведения о бизнесе" onEdit={() => onEdit(2)}>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink-500">Выручка за последние 6 месяцев</span>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-2">
            {months.map((label, index) => (
              <div key={label} className="flex justify-between gap-2 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-sm">
                <span className="text-ink-600">{label.split(" ")[0]}</span>
                <span className="font-bold tabular-nums">{asMoney(values.revenues[index]) || "—"}</span>
              </div>
            ))}
          </div>
          {incomplete && (
            <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-900">
              Укажите выручку за каждый из шести месяцев
            </div>
          )}
        </div>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3">
          <Row label="Возраст бизнеса" value={values.age ? `${values.age} мес.` : ""} />
          <Row label="Операционные расходы" value={asMoney(values.opex)} />
          <Row label="Платежи по долгам" value={asMoney(values.payments)} />
          <Row label="Остаток долга" value={asMoney(values.debt)} />
          <Row label="Собственный капитал" value={asMoney(values.equity)} />
          <Row label="Оборотные активы" value={asMoney(values.assets)} />
          <Row label="Краткосрочные обязательства" value={asMoney(values.liabilities)} />
          <Row
            label="Кредитная история"
            value={values.history ? CREDIT_HISTORY_LABEL[values.history] : ""}
          />
        </dl>
      </SummaryBlock>
      {formError && <div className="text-sm font-semibold text-red-700">{formError}</div>}
    </div>
  );
}
