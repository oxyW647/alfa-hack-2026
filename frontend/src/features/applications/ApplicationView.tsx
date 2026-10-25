import { useState } from "react";
import { useParams } from "react-router-dom";

import { Badge } from "@/components/Badge";
import { errorText } from "@/lib/api";
import { DOCUMENT_LABEL, STATUS_LABEL, STATUS_TONE, money } from "@/lib/format";
import { useApplication, usePipeline, useUpdateApplication } from "@/lib/queries";
import type { ApplicationDraft } from "@/lib/types";
import { isEmployeeApplication } from "@/lib/types";

import { ApplicationForm } from "./ApplicationForm";
import { AssessmentPanel } from "./AssessmentPanel";
import { DocumentsPanel } from "./DocumentsPanel";
import { OfferPanel } from "./OfferPanel";
import { PipelineBoard } from "./PipelineBoard";
import { ReviewPanel } from "./ReviewPanel";

export function ApplicationView() {
  const id = Number(useParams().id);
  const application = useApplication(id);
  const pipeline = usePipeline(id);
  const update = useUpdateApplication(id);
  const [editing, setEditing] = useState(false);

  if (application.isError) {
    return <div className="card text-sm text-red-600">{errorText(application.error)}</div>;
  }
  if (!application.data || !pipeline.data) return null;
  const app = application.data;
  const employee = isEmployeeApplication(app) ? app : null;

  const draft: ApplicationDraft = {
    company: app.company,
    loan: {
      amount_rub: app.loan.amount_rub,
      term_months: app.loan.term_months,
      purpose: app.loan.purpose,
    },
    declared: employee?.declared ?? {},
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{app.company.name}</div>
          <div className="text-sm text-neutral-500">
            ИНН {app.company.inn} · {money(app.loan.amount_rub)} · {app.loan.term_months} мес. ·{" "}
            {money(app.loan.monthly_payment_rub)}/мес.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[app.status]}>{STATUS_LABEL[app.status]}</Badge>
          <button className="btn" onClick={() => setEditing(!editing)}>
            Анкета
          </button>
        </div>
      </div>

      <div className="card">
        <div className="text-sm font-medium">{app.status_title}</div>
        <div className="text-sm text-neutral-600">{app.status_text}</div>
        {app.actions.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
            {app.actions.map((action, index) => (
              <li key={index}>
                {action.document_type
                  ? `Загрузить: ${DOCUMENT_LABEL[action.document_type]}`
                  : action.field
                    ? `Заполнить: ${action.field}`
                    : "Проверить документы"}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <ApplicationForm
          key={app.id}
          initial={draft}
          editableCompany={false}
          submitLabel="Сохранить"
          onSubmit={async (next) => {
            await update.mutateAsync({ loan: next.loan, declared: next.declared });
            setEditing(false);
          }}
        />
      )}

      <PipelineBoard applicationId={id} pipeline={pipeline.data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <OfferPanel application={app} />
          {employee && <ReviewPanel application={employee} />}
          <DocumentsPanel application={app} />
        </div>
        {employee && <AssessmentPanel application={employee} />}
      </div>
    </div>
  );
}
