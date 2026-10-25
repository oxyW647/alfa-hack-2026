import clsx from "clsx";

import { STAGE_ORDER, STAGE_TITLE } from "@/lib/format";
import { STEPS } from "@/lib/wizard";

export type StepState = "done" | "current" | "error" | "todo";

function stepTone(active: boolean) {
  if (active) return "bg-red-50 shadow-[inset_0_0_0_2px_#EF3124]";
  return "bg-mist-50 hover:bg-mist-100";
}

function StepCircle({ index, state }: { index: number; state: StepState }) {
  const base =
    "flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-base font-extrabold";
  if (state === "error") return <span className={clsx(base, "bg-ink-900 font-black text-white")}>!</span>;
  if (state === "current") return <span className={clsx(base, "bg-red-500 text-white")}>{index + 1}</span>;
  if (state === "done") return <span className={clsx(base, "bg-lime-500 text-ink-900")}>{index + 1}</span>;
  return (
    <span className={clsx(base, "border-[1.5px] border-mist-300 bg-white text-ink-500")}>{index + 1}</span>
  );
}

function StepLabel({ state }: { state: StepState }) {
  if (state === "current")
    return <span className="self-start rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">Текущий</span>;
  if (state === "done")
    return (
      <span className="self-start rounded-md bg-lime-100 px-2 py-0.5 text-xs font-bold text-lime-900">
        Заполнен
      </span>
    );
  if (state === "error")
    return <span className="self-start rounded-md bg-ink-900 px-2 py-0.5 text-xs font-bold text-white">Есть ошибка</span>;
  return null;
}

export function WizardRibbon({
  current,
  states,
  onGo,
}: {
  current: number;
  states: StepState[];
  onGo: (step: number) => void;
}) {
  return (
    <nav aria-label="Путь заявки" className="card flex flex-wrap items-stretch gap-4 p-5">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
        <span className="eyebrow">Оформление заявки</span>
        <div className="grid grid-cols-4 gap-2">
          {states.map((state, index) => (
            <div
              key={index}
              className={clsx(
                "h-1 rounded-sm",
                state === "current" && "bg-red-500",
                (state === "done" || state === "error") && "bg-ink-900",
                state === "todo" && "bg-mist-200",
              )}
            />
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-2">
          {STEPS.map((title, index) => {
            const state = states[index];
            const active = index === current;
            return (
              <button
                key={title}
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onGo(index)}
                className={clsx(
                  "flex items-center gap-3 rounded-[18px] p-3 text-left",
                  stepTone(active),
                )}
              >
                <StepCircle index={index} state={state} />
                <span className="flex min-w-0 flex-col gap-1">
                  <span
                    className={clsx(
                      "text-[15px] font-bold",
                      state === "todo" && !active && "text-ink-600",
                    )}
                  >
                    {title}
                  </span>
                  <StepLabel state={state} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-[1_1_220px] flex-col gap-2 rounded-[20px] bg-mist-50 px-4 py-3.5">
        <span className="eyebrow !text-mist-400">Обработка заявки</span>
        {STAGE_ORDER.map((stage, index) => (
          <div key={stage} className="flex items-center gap-2.5 text-[13px] font-semibold text-mist-400">
            <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-mist-200 text-[11px] font-extrabold">
              {index + 5}
            </span>
            {STAGE_TITLE[stage]}
          </div>
        ))}
      </div>
    </nav>
  );
}
