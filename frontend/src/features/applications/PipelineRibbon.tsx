import clsx from "clsx";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockIcon,
  PlayIcon,
  RepeatIcon,
  SpinnerIcon,
} from "@/components/icons";
import { STEPS } from "@/lib/wizard";
import type { Pipeline, PipelineStage, StageKey } from "@/lib/types";

export type CardState = "done" | "failed" | "available" | "locked" | "running";

export function stageSummary(stage: PipelineStage): string | null {
  const result = stage.result;
  if (!result || stage.state !== "done") return null;
  if (stage.stage === "preliminary_scoring" || stage.stage === "final_scoring") {
    return `${result.score} · ${result.route}`;
  }
  if (stage.stage === "documents") {
    const documents = result.documents as unknown[] | undefined;
    return documents ? `${documents.length} из 3` : null;
  }
  if (stage.stage === "decision") {
    return result.awaiting_employee ? "Ручное решение" : String(result.route);
  }
  return null;
}

function checkCounts(stage: PipelineStage): Record<string, number> | null {
  if (stage.stage !== "verification" || stage.state !== "done" || !stage.result) return null;
  const checks = (stage.result.checks as { status: string }[] | undefined) ?? [];
  return checks.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}

function StageBadge({ state, dark }: { state: CardState; dark: boolean }) {
  const base = "inline-flex items-center gap-1 rounded-lg px-2 py-[3px] text-xs font-bold";
  if (state === "done")
    return (
      <span className={clsx(base, dark ? "bg-lime-500 text-ink-900" : "bg-lime-100 text-lime-900")}>
        <CheckIcon size={11} stroke={3.5} />
        Выполнен
      </span>
    );
  if (state === "failed")
    return (
      <span className={clsx(base, "bg-ink-900 text-white")}>
        <span className="font-black">!</span>Ошибка
      </span>
    );
  if (state === "available")
    return (
      <span className={clsx(base, "bg-red-50 text-red-700")}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Доступен
      </span>
    );
  if (state === "running")
    return (
      <span className={clsx(base, "bg-sky-100 text-sky-900")}>
        <SpinnerIcon size={11} stroke={3.5} />
        Выполняется
      </span>
    );
  return (
    <span className={clsx(base, "bg-mist-200 text-ink-500")}>
      <LockIcon size={11} />
      Заблокирован
    </span>
  );
}

function StageCard({
  stage,
  number,
  state,
  last,
  expanded,
  employee,
  busy,
  onRun,
  onToggle,
}: {
  stage: PipelineStage;
  number: number;
  state: CardState;
  last: boolean;
  expanded: boolean;
  employee: boolean;
  busy: boolean;
  onRun: () => void;
  onToggle: () => void;
}) {
  const darkFinal = last && state === "done";
  const summary = stageSummary(stage);
  const counts = checkCounts(stage);
  const cardState: CardState = state;
  const canExpand = employee && (cardState === "done" || cardState === "failed") && stage.result !== null;
  const canRun = !busy && cardState !== "locked" && cardState !== "running";

  const shell = clsx(
    "flex min-w-0 flex-1 flex-col gap-3 rounded-card p-3.5",
    state === "done" && !darkFinal && "border-[1.5px] border-line bg-white",
    darkFinal && "bg-ink-900 text-white",
    state === "failed" && "border-[1.5px] border-red-100 bg-[#FFF7F6]",
    state === "available" && "border-2 border-red-500 bg-white shadow-glow",
    state === "running" && "border-2 border-sky-500 bg-white",
    state === "locked" && "border-[1.5px] border-mist-200 bg-mist-50",
    expanded && state === "done" && !darkFinal && "border-ink-900",
  );

  const circle = clsx(
    "flex h-[34px] w-[34px] items-center justify-center rounded-full text-[15px] font-extrabold",
    state === "done" && "bg-lime-500 text-ink-900",
    state === "failed" && "bg-ink-900 text-white",
    state === "available" && "bg-red-500 text-white",
    state === "running" && "bg-sky-500 text-white",
    state === "locked" && "bg-mist-200 text-mist-400",
  );

  const actionLabel = state === "done" || state === "failed" ? "Повторить" : "Запустить";
  const actionClass = clsx(
    "inline-flex h-[38px] min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 text-sm font-bold [&>svg]:flex-none",
    state === "available" && canRun && "bg-red-500 text-white hover:bg-red-600",
    state === "done" && canRun && !darkFinal && "bg-mist-100 text-ink-900 hover:bg-line",
    darkFinal && canRun && "bg-ink-800 text-white hover:bg-ink-600",
    state === "failed" && canRun && "border-[1.5px] border-ink-900 bg-white text-ink-900",
    (!canRun || state === "locked" || state === "running") && "cursor-not-allowed",
    (!canRun || state === "locked" || state === "running") && !darkFinal && "bg-mist-200 text-ink-400",
    (!canRun || state === "locked" || state === "running") && darkFinal && "bg-ink-800 text-ink-400",
  );

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className={circle}>{number}</span>
        <StageBadge state={state} dark={darkFinal} />
      </div>
      <div
        className={clsx(
          "flex-1 hyphens-auto break-words text-sm font-bold leading-[18px]",
          state === "locked" && "text-mist-400",
        )}
      >
        {stage.title}
      </div>
      {state === "running" && (
        <div className="h-1.5 overflow-hidden rounded-[3px] bg-sky-100">
          <div className="h-1.5 w-1/2 animate-pulseSoft rounded-[3px] bg-sky-500" />
        </div>
      )}
      {employee && summary && (
        <span
          className={clsx(
            "flex min-w-0 flex-col gap-0.5 text-[13px] font-bold tabular-nums",
            darkFinal ? "text-ink-300" : "text-ink-600",
          )}
        >
          {summary.split(" · ").map((part, index) => (
            <span key={index} className={clsx("break-words", index > 0 && "text-[11px] tracking-[-0.01em]")}>
              {part.replace(/_/g, "_​")}
            </span>
          ))}
        </span>
      )}
      {employee && counts && (
        <span className="flex gap-1.5 text-xs font-extrabold">
          <span className="rounded-md bg-lime-100 px-[7px] py-px text-lime-900">{counts.passed ?? 0}</span>
          <span className="rounded-md bg-amber-100 px-[7px] py-px text-amber-900">{counts.warning ?? 0}</span>
          <span className="rounded-md bg-red-50 px-[7px] py-px text-red-700">{counts.failed ?? 0}</span>
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <button type="button" disabled={!canRun} onClick={onRun} className={actionClass}>
          {state === "available" ? <PlayIcon size={12} /> : state === "locked" ? null : <RepeatIcon size={14} />}
          {actionLabel}
        </button>
        {canExpand && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? "Свернуть результат" : "Показать результат"}
            onClick={onToggle}
            className={clsx("flex-none", darkFinal ? "text-white" : "text-ink-600")}
          >
            {expanded ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

function barClass(state: CardState, last: boolean): string {
  if (state === "done") return last ? "bg-lime-600" : "bg-ink-900";
  if (state === "failed") return "bg-[repeating-linear-gradient(90deg,#17171A_0_6px,transparent_6px_10px)]";
  if (state === "available") return "bg-red-500";
  if (state === "running") return "bg-sky-500";
  return "bg-mist-200";
}

export function PipelineRibbon({
  pipeline,
  employee,
  running,
  busy,
  expanded,
  onToggle,
  onRunStage,
  onRunAll,
  onReset,
}: {
  pipeline: Pipeline;
  employee: boolean;
  running: StageKey | null;
  busy: boolean;
  expanded: StageKey | null;
  onToggle: (stage: StageKey) => void;
  onRunStage: (stage: StageKey) => void;
  onRunAll: () => void;
  onReset: () => void;
}) {
  const states: CardState[] = pipeline.stages.map((stage) =>
    running === stage.stage ? "running" : stage.state,
  );
  const allDone = states.every((state) => state === "done");

  return (
    <nav aria-label="Путь заявки" className="card flex flex-col gap-[18px] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="m-0 text-xl font-extrabold">Путь заявки</h2>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" disabled={busy} onClick={onReset} className="btn btn-secondary h-11 px-[18px] text-[15px]">
            Сбросить
          </button>
          <button
            type="button"
            disabled={busy || allDone}
            onClick={onRunAll}
            className="btn btn-primary h-11 px-5 text-[15px]"
          >
            {busy ? <SpinnerIcon size={14} stroke={3} /> : <PlayIcon size={14} />}
            Запустить всё
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex flex-[1_1_150px] flex-col gap-[9px] rounded-card bg-mist-50 p-4 xl:max-w-[170px]">
          <span className="eyebrow">Оформление</span>
          {STEPS.map((title, index) => (
            <div key={title} className="flex items-center gap-2.5 text-[13px] font-semibold">
              <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-lime-500 text-[11px] font-extrabold">
                {index + 1}
              </span>
              {title}
            </div>
          ))}
        </div>
        <div className="grid min-w-0 flex-[999_1_600px] grid-cols-[repeat(auto-fit,minmax(min(132px,100%),1fr))] gap-x-3 gap-y-5">
          {pipeline.stages.map((stage, index) => (
            <div key={stage.stage} className="flex min-w-0 flex-col gap-2.5">
              <div className={clsx("h-1 rounded-sm", barClass(states[index], index === states.length - 1))} />
              <StageCard
                stage={stage}
                number={index + 5}
                state={states[index]}
                last={index === pipeline.stages.length - 1}
                expanded={expanded === stage.stage}
                employee={employee}
                busy={busy}
                onRun={() => onRunStage(stage.stage)}
                onToggle={() => onToggle(stage.stage)}
              />
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
