import clsx from "clsx";
import { useState } from "react";

import { CHECK_TONE, CheckMark, RiskBadge, RouteBadge } from "@/components/Badges";
import { CheckIcon, ArrowRightIcon, ChevronDownIcon } from "@/components/icons";
import { errorText } from "@/lib/api";
import {
  FACTOR_LABEL,
  METRIC_LABEL,
  dateTime,
  discrepancyValue,
  FIELD_LABEL,
  metricValue,
  timeShort,
} from "@/lib/format";
import { useManualReview } from "@/lib/queries";
import type { Assessment, EmployeeApplication } from "@/lib/types";

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-mist-50 px-3.5 py-3">
      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
      <dd className={clsx("m-0 text-[15px] font-bold", tone)}>{value}</dd>
    </div>
  );
}

function FactorRow({ factor }: { factor: Assessment["factors"][number] }) {
  const full = factor.lost_points === 0;
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex justify-between gap-3 text-sm font-semibold">
        <span>{FACTOR_LABEL[factor.code] ?? factor.label}</span>
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums",
            full && "text-lime-900",
          )}
        >
          {full && <CheckIcon size={14} stroke={3} />}
          <b>{factor.points}</b> / {factor.max_points}
          {!full && <b className="text-red-700">−{factor.lost_points}</b>}
        </span>
      </div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-md">
        {full ? (
          <div className="flex-1 bg-lime-600" />
        ) : (
          <>
            <div className="bg-ink-900" style={{ flex: factor.points }} />
            <div
              className="bg-[repeating-linear-gradient(135deg,#FDD9D5_0_5px,#FFEDEB_5px_10px)]"
              style={{ flex: factor.lost_points }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function AssessmentCard({ app }: { app: EmployeeApplication }) {
  const assessment =
    [...app.assessments].reverse().find((item) => item.kind === "verified") ??
    app.assessments[app.assessments.length - 1];
  if (!assessment) {
    return (
      <section className="card flex min-h-[160px] flex-[1_1_420px] flex-col gap-3 p-7">
        <h2 className="m-0 text-[22px] font-extrabold">Оценка</h2>
        <span className="text-ink-500">—</span>
      </section>
    );
  }
  const final = assessment.kind === "verified";
  return (
    <section className="card flex min-w-0 flex-[1_1_420px] flex-col gap-[22px] p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[22px] font-extrabold">Оценка</h2>
        <span className="rounded-lg bg-ink-900 px-2.5 py-1 text-xs font-bold text-white">
          {final ? "Итоговая" : "Предварительная"}
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[112px] font-extrabold leading-[100px] tracking-[-0.05em]">{assessment.score}</span>
            <span className="text-[26px] font-bold text-ink-500">/100</span>
          </div>
          <span className="text-[13px] text-ink-500">Оценка по демонстрационной модели, баллы из 100</span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RiskBadge level={assessment.risk_level} large />
          <RouteBadge route={assessment.route} large />
        </div>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2.5">
        <Fact label="Источник данных" value={assessment.data_source === "documents" ? "Документы" : "Анкета"} />
        <Fact label="Время" value={dateTime(assessment.created_at)} />
      </dl>
      <div className="flex flex-col gap-4">
        {assessment.factors.map((factor) => (
          <FactorRow key={factor.code} factor={factor} />
        ))}
      </div>
      {assessment.warnings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assessment.warnings.map((warning) => (
            <span key={warning} className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
              {warning}
            </span>
          ))}
        </div>
      )}
      <details className="overflow-hidden rounded-2xl bg-mist-50">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3.5 text-[15px] font-bold">
          Метрики
          <ChevronDownIcon size={16} />
        </summary>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(120px,100%),1fr))] gap-2 px-4 pb-4">
          {Object.entries(assessment.metrics).map(([key, value]) => (
            <div key={key} className="rounded-xl bg-white px-3 py-2.5">
              <dt className="text-xs font-semibold text-ink-500">{METRIC_LABEL[key] ?? key}</dt>
              <dd className="m-0 text-base font-extrabold tabular-nums">{metricValue(key, value)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}

export function HistoryCard({ app }: { app: EmployeeApplication }) {
  const preliminary = [...app.assessments].reverse().find((item) => item.kind === "preliminary");
  const final = [...app.assessments].reverse().find((item) => item.kind === "verified");
  if (!preliminary) return null;
  const delta = final ? final.score - preliminary.score : null;
  const rows = final
    ? final.factors
        .map((factor, index) => ({
          code: factor.code,
          before: preliminary.factors[index]?.points ?? 0,
          after: factor.points,
        }))
        .filter((row) => row.before !== row.after)
    : [];
  return (
    <section className="flex flex-col gap-[22px] rounded-section bg-ink-900 p-7 text-white">
      <h2 className="m-0 text-[22px] font-extrabold">История оценок</h2>
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex flex-[1_1_120px] flex-col gap-1.5 rounded-[20px] bg-ink-800 p-4">
          <span className="text-xs font-bold text-ink-400">Предварительная</span>
          <span className="text-[56px] font-extrabold leading-[56px] tracking-[-0.03em]">{preliminary.score}</span>
          <span className="self-start rounded-md bg-amber-100 px-2 py-[3px] text-[11px] font-extrabold text-amber-900">
            {preliminary.route}
          </span>
          <span className="text-xs text-ink-400">Анкета · {timeShort(preliminary.created_at)}</span>
        </div>
        {final && (
          <>
            <ArrowRightIcon size={28} className="text-ink-400" />
            <div className="flex flex-[1_1_120px] flex-col gap-1.5 rounded-[20px] bg-white p-4 text-ink-900">
              <span className="text-xs font-bold text-ink-500">Итоговая</span>
              <span className="text-[56px] font-extrabold leading-[56px] tracking-[-0.03em]">{final.score}</span>
              <span className="self-start rounded-md bg-violet-100 px-2 py-[3px] text-[11px] font-extrabold text-violet-900">
                {final.route}
              </span>
              <span className="text-xs text-ink-500">Документы · {timeShort(final.created_at)}</span>
            </div>
          </>
        )}
      </div>
      {delta !== null && delta !== 0 && (
        <div
          className={clsx(
            "flex items-center gap-3.5 rounded-[18px] px-[18px] py-3.5",
            delta < 0 ? "bg-red-500" : "bg-lime-500 text-ink-900",
          )}
        >
          <span className="text-[40px] font-black leading-[44px] tracking-[-0.02em] tabular-nums">
            {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
          </span>
          <span className="text-[15px] font-bold">после проверки документов</span>
        </div>
      )}
      {rows.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <div key={row.code} className="flex justify-between gap-3 text-sm">
              <span className="text-ink-300">{FACTOR_LABEL[row.code] ?? row.code}</span>
              <span className="whitespace-nowrap font-bold tabular-nums">
                {row.before} → {row.after}{" "}
                <b className={row.after < row.before ? "text-[#FF8A80]" : "text-lime-500"}>
                  {row.after > row.before ? "+" : "−"}
                  {Math.abs(row.after - row.before)}
                </b>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ReviewCard({ app }: { app: EmployeeApplication }) {
  const review = useManualReview(app.id);
  const [comment, setComment] = useState("");
  if (app.route !== "MANUAL_REVIEW" || app.accepted_at) return null;
  const isPreliminary = !app.assessments.some((a) => a.kind === "verified");

  return (
    <section className="flex flex-col gap-[18px] rounded-section bg-white p-7 shadow-[inset_0_0_0_2px_#7B3FF2]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[22px] font-extrabold">
          {isPreliminary ? "Предварительная ручная проверка" : "Финальное ручное решение"}
        </h2>
        <span className="rounded-lg bg-violet-100 px-3 py-[5px] text-[13px] font-bold text-violet-900">
          MANUAL_REVIEW
        </span>
      </div>
      {isPreliminary && !app.manual_review && (
        <p className="m-0 text-sm text-ink-600">
          Допуск разрешает следующий этап проверки, но не означает одобрение кредита.
        </p>
      )}
      {app.manual_review && (
        <div className="rounded-2xl bg-mist-50 px-4 py-3 text-sm font-semibold">
          {app.manual_review.decision === "approve"
            ? (isPreliminary ? "Допуск к проверке документов разрешён" : "Кредит одобрен")
            : "Отклонено"}
          {app.manual_review.comment ? ` · ${app.manual_review.comment}` : ""}
        </div>
      )}
      {!app.manual_review && <div className="flex flex-col gap-2">
        <label htmlFor="emp-comment" className="text-sm font-semibold text-ink-600">
          Комментарий
        </label>
        <textarea
          id="emp-comment"
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="resize-y rounded-field border-[1.5px] border-line bg-white px-4 py-3.5 text-[15px] leading-[22px] outline-none focus:border-ink-900"
        />
      </div>}
      {!app.manual_review && <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={review.isPending}
          onClick={() => review.mutate({ decision: "approve", comment: comment || null })}
          className="btn btn-primary h-[54px] flex-[1_1_140px] rounded-2xl text-base font-extrabold"
        >
          {isPreliminary ? "Допустить к документам" : "Одобрить"}
        </button>
        <button
          type="button"
          disabled={review.isPending}
          onClick={() => review.mutate({ decision: "decline", comment: comment || null })}
          className="btn btn-outline h-[54px] flex-[1_1_140px] rounded-2xl text-base font-extrabold"
        >
          Отклонить
        </button>
      </div>}
      {review.error && <span className="text-sm font-semibold text-red-700">{errorText(review.error)}</span>}
    </section>
  );
}

export function ChecksCard({ app }: { app: EmployeeApplication }) {
  if (!app.checks) return null;
  const items = app.checks.checks;
  const count = (status: string) => items.filter((item) => item.status === status).length;
  return (
    <section className="card flex min-w-0 flex-[1_1_420px] flex-col gap-3 p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[22px] font-extrabold">Проверки</h2>
        <div className="flex gap-1.5">
          {(["passed", "warning", "failed"] as const).map((status) => (
            <span key={status} className={clsx("rounded-lg px-2.5 py-1 text-xs font-extrabold", CHECK_TONE[status])}>
              {status} {count(status)}
            </span>
          ))}
        </div>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((item, index) => (
          <li
            key={item.code}
            className={clsx("flex items-start gap-3.5 py-[13px]", index < items.length - 1 && "border-b border-mist-200")}
          >
            <CheckMark status={item.status} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{item.title}</span>
              <span className="text-sm text-ink-500">{item.details}</span>
            </div>
            <span className={clsx("rounded-lg px-2.5 py-1 text-xs font-bold", CHECK_TONE[item.status])}>
              {item.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DiscrepanciesCard({ app }: { app: EmployeeApplication }) {
  const rows = app.checks?.discrepancies ?? [];
  if (rows.length === 0) return null;
  return (
    <section className="card flex flex-col gap-4 p-7">
      <h2 className="m-0 text-[22px] font-extrabold">Расхождения анкеты и документов</h2>
      <div className="overflow-x-auto rounded-[18px] border-[1.5px] border-line">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-mist-50">
              <th scope="col" className="px-4 py-3 text-left text-[13px] font-bold text-ink-600">Поле</th>
              <th scope="col" className="px-4 py-3 text-right text-[13px] font-bold text-ink-600">Заявлено</th>
              <th scope="col" className="px-4 py-3 text-right text-[13px] font-bold text-ink-600">По документам</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className="border-t border-mist-200">
                <td className="px-4 py-3.5 font-semibold">{FIELD_LABEL[row.field] ?? row.field}</td>
                <td className="px-4 py-3.5 text-right tabular-nums text-ink-500">
                  {discrepancyValue(row.field, row.declared)}
                </td>
                <td className="px-4 py-3.5 text-right font-extrabold tabular-nums text-red-700">
                  {discrepancyValue(row.field, row.documented)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
