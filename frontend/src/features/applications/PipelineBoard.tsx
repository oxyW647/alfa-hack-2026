import clsx from "clsx";

import { Badge } from "@/components/Badge";
import { errorText } from "@/lib/api";
import { STATE_LABEL, STATE_TONE } from "@/lib/format";
import { useResetApplication, useRunAll, useRunStage } from "@/lib/queries";
import type { Pipeline } from "@/lib/types";

export function PipelineBoard({ applicationId, pipeline }: { applicationId: number; pipeline: Pipeline }) {
  const runStage = useRunStage(applicationId);
  const runAll = useRunAll(applicationId);
  const reset = useResetApplication(applicationId);
  const busy = runStage.isPending || runAll.isPending || reset.isPending;
  const error = runStage.error ?? runAll.error ?? reset.error;

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" disabled={busy} onClick={() => runAll.mutate()}>
          Запустить всё
        </button>
        <button className="btn" disabled={busy} onClick={() => reset.mutate()}>
          Сбросить
        </button>
        {error && <span className="text-sm text-red-600">{errorText(error)}</span>}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {pipeline.stages.map((stage, index) => (
          <div
            key={stage.stage}
            className={clsx(
              "flex min-w-0 flex-col gap-2 rounded-lg border p-3",
              stage.state === "failed" ? "border-red-300" : "border-neutral-200",
              stage.state === "locked" && "opacity-60",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-400">{index + 1}</span>
              <Badge tone={STATE_TONE[stage.state]}>{STATE_LABEL[stage.state]}</Badge>
            </div>
            <div className="text-sm font-medium">{stage.title}</div>
            <button
              className="btn mt-auto"
              disabled={busy || stage.state === "locked"}
              onClick={() => runStage.mutate(stage.stage)}
            >
              {stage.state === "done" || stage.state === "failed" ? "Повторить" : "Запустить"}
            </button>
            {stage.result && (
              <details>
                <summary className="cursor-pointer text-xs text-neutral-500">JSON</summary>
                <pre className="mt-1 max-h-64 overflow-auto rounded bg-neutral-50 p-2 text-[11px]">
                  {JSON.stringify(stage.result, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
