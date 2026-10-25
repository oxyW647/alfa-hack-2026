import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { RiskBadge } from "@/components/Badges";
import { AlertIcon, RepeatIcon } from "@/components/icons";
import { errorText } from "@/lib/api";
import {
  useApplication,
  usePipeline,
  useResetApplication,
  useRunAll,
  useRunStage,
} from "@/lib/queries";
import type { ActionItem, DocumentType, StageKey } from "@/lib/types";
import { isEmployeeApplication } from "@/lib/types";

import { DocumentsPanel } from "./DocumentsPanel";
import {
  AssessmentCard,
  ChecksCard,
  DiscrepanciesCard,
  HistoryCard,
  ReviewCard,
} from "./EmployeePanels";
import { PipelineRibbon } from "./PipelineRibbon";
import { StageDetail } from "./StageDetail";
import { ApplicationHeader, StatusPanel } from "./StatusPanel";

function ViewSkeleton() {
  return (
    <div aria-busy="true" className="flex animate-pulseSoft flex-col gap-5">
      <div className="card flex flex-col gap-4 p-7">
        <div className="h-8 w-1/3 rounded bg-line" />
        <div className="h-4 w-1/4 rounded bg-mist-200" />
        <div className="h-12 w-1/2 rounded bg-mist-200" />
      </div>
      <div className="card h-56 bg-white" />
      <div className="card h-40 bg-white" />
    </div>
  );
}

export function ApplicationView() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const application = useApplication(id);
  const pipeline = usePipeline(id);
  const runStage = useRunStage(id);
  const runAll = useRunAll(id);
  const reset = useResetApplication(id);
  const [expanded, setExpanded] = useState<StageKey | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("egrul_extract");

  if (application.isError || pipeline.isError) {
    return (
      <div role="alert" className="card flex flex-wrap items-center gap-4 p-7">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertIcon />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base font-bold">Не удалось загрузить заявку</span>
          <span className="text-sm text-ink-500">{errorText(application.error ?? pipeline.error)}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary h-11 px-5"
          onClick={() => {
            void application.refetch();
            void pipeline.refetch();
          }}
        >
          <RepeatIcon size={14} />
          Повторить
        </button>
      </div>
    );
  }
  if (!application.data || !pipeline.data) return <ViewSkeleton />;

  const app = application.data;
  const employee = isEmployeeApplication(app) ? app : null;
  const busy = runStage.isPending || runAll.isPending || reset.isPending;
  const running: StageKey | null = runStage.isPending
    ? (runStage.variables ?? null)
    : runAll.isPending
      ? pipeline.data.next_stage
      : null;
  const error = runStage.error ?? runAll.error ?? reset.error;
  const finished = app.status === "OFFER_ACCEPTED_DEMO";
  const clientUploads = app.status === "DRAFT" || app.status === "MORE_INFO_REQUIRED";
  const expandedStage = pipeline.data.stages.find((stage) => stage.stage === expanded);
  const finalAssessment = employee
    ? [...employee.assessments].reverse().find((item) => item.kind === "verified")
    : undefined;

  function handleAction(action: ActionItem) {
    if (action.field) {
      navigate(`/applications/${id}/edit`);
      return;
    }
    if (action.document_type) setDocumentType(action.document_type);
    document.getElementById("documents")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-5">
      {employee ? (
        <section className="card">
          <ApplicationHeader
            app={app}
            big
            onEdit={() => navigate(`/applications/${id}/edit`)}
            extra={
              finalAssessment && (
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] font-semibold text-ink-500">Итоговый балл</dt>
                  <dd className="m-0 flex items-center gap-2">
                    <span className="text-[26px] font-extrabold leading-[34px]">{finalAssessment.score}</span>
                    <RiskBadge level={finalAssessment.risk_level} />
                  </dd>
                </div>
              )
            }
          />
        </section>
      ) : (
        <section className="card overflow-hidden">
          <ApplicationHeader
            app={app}
            big={["DRAFT", "IN_PROGRESS", "MORE_INFO_REQUIRED", "UNDER_REVIEW"].includes(app.status)}
            onEdit={() => navigate(`/applications/${id}/edit`)}
          />
          <StatusPanel app={app} onAction={handleAction} />
        </section>
      )}

      <div className="flex flex-col gap-3">
        <PipelineRibbon
          pipeline={pipeline.data}
          employee={Boolean(employee)}
          running={running}
          busy={busy || finished}
          expanded={expanded}
          onToggle={(stage) => setExpanded(expanded === stage ? null : stage)}
          onRunStage={(stage) => runStage.mutate(stage)}
          onRunAll={() => runAll.mutate()}
          onReset={() => {
            setExpanded(null);
            reset.mutate();
          }}
        />
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500">
              <AlertIcon size={15} />
            </span>
            <span className="text-sm font-semibold">{errorText(error)}</span>
          </div>
        )}
        {employee && expandedStage && <StageDetail stage={expandedStage} />}
      </div>

      {employee ? (
        <>
          <div className="flex flex-wrap items-start gap-5">
            <AssessmentCard app={employee} />
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
              <HistoryCard app={employee} />
              <ReviewCard app={employee} />
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-5">
            <ChecksCard app={employee} />
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
              <DiscrepanciesCard app={employee} />
            </div>
          </div>
        </>
      ) : null}

      <DocumentsPanel
        app={app}
        employee={Boolean(employee)}
        canUpload={employee ? !finished : clientUploads}
        selectedType={documentType}
        onSelectType={setDocumentType}
      />
    </div>
  );
}
