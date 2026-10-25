import clsx from "clsx";

import { Badge } from "@/components/Badge";
import { dateTime, money } from "@/lib/format";
import type { Assessment, EmployeeApplication } from "@/lib/types";

const RISK_TONE = {
  LOW: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-red-100 text-red-800",
};

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-semibold">{assessment.score}</span>
        <Badge tone={RISK_TONE[assessment.risk_level]}>{assessment.risk_level}</Badge>
        <Badge tone="bg-neutral-200 text-neutral-700">{assessment.route}</Badge>
        <span className="text-xs text-neutral-500">
          {assessment.kind} · {assessment.data_source} · {dateTime(assessment.created_at)}
        </span>
      </div>
      <div className="space-y-1">
        {assessment.factors.map((factor) => (
          <div key={factor.code} className="text-xs">
            <div className="flex justify-between">
              <span>{factor.label}</span>
              <span className="font-mono">
                {factor.points}/{factor.max_points}
              </span>
            </div>
            <div className="h-1.5 rounded bg-neutral-100">
              <div
                className={clsx(
                  "h-1.5 rounded",
                  factor.lost_points === 0 ? "bg-emerald-500" : "bg-amber-500",
                )}
                style={{ width: `${(factor.points / factor.max_points) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {assessment.warnings.length > 0 && (
        <div className="text-xs text-amber-700">{assessment.warnings.join(", ")}</div>
      )}
      <details>
        <summary className="cursor-pointer text-xs text-neutral-500">Метрики</summary>
        <pre className="mt-1 overflow-auto rounded bg-neutral-50 p-2 text-[11px]">
          {JSON.stringify(assessment.metrics, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function AssessmentPanel({ application }: { application: EmployeeApplication }) {
  const { assessments, comparison, checks, bank_offer: offer } = application;
  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold">Оценка</h2>
      {comparison && (
        <div className="text-sm">
          {comparison.score_before} → {comparison.score_after} ({comparison.delta > 0 ? "+" : ""}
          {comparison.delta})
        </div>
      )}
      {assessments.length === 0 && <div className="text-sm text-neutral-400">—</div>}
      {[...assessments].reverse().map((assessment) => (
        <AssessmentCard key={assessment.id} assessment={assessment} />
      ))}
      {checks && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-neutral-500">Проверки</h3>
          {checks.checks.map((check) => (
            <div key={check.code} className="flex items-start justify-between gap-3 text-xs">
              <span>
                {check.title}
                <span className="block text-neutral-400">{check.details}</span>
              </span>
              <Badge
                tone={
                  check.status === "passed"
                    ? "bg-emerald-100 text-emerald-800"
                    : check.status === "warning"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {check.status}
              </Badge>
            </div>
          ))}
          {checks.discrepancies.length > 0 && (
            <pre className="overflow-auto rounded bg-neutral-50 p-2 text-[11px]">
              {JSON.stringify(checks.discrepancies, null, 2)}
            </pre>
          )}
        </div>
      )}
      {offer && (
        <div className="text-xs text-neutral-600">
          {money(offer.amount_rub)} · {offer.term_months} мес. · {offer.score}
        </div>
      )}
    </div>
  );
}
