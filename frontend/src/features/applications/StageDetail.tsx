import { ChevronDownIcon } from "@/components/icons";
import { DOCUMENT_LABEL, SOURCE_TONE, STAGE_ORDER, timeShort } from "@/lib/format";
import type { DocumentSource, DocumentType, PipelineStage } from "@/lib/types";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-white px-3.5 py-3">
      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
      <dd className="m-0 text-[15px] font-extrabold">{value}</dd>
    </div>
  );
}

function facts(stage: PipelineStage): { label: string; value: string }[] {
  const result = stage.result ?? {};
  const time = { label: "Время", value: timeShort(stage.finished_at) };
  if (stage.state === "failed") {
    const error = (result.error ?? {}) as { code?: string; message?: string; field?: string | null };
    return [
      { label: "Код", value: error.code ?? "—" },
      { label: "Сообщение", value: error.message ?? "—" },
      { label: "Поле", value: error.field ?? "—" },
      time,
    ];
  }
  if (stage.stage === "preliminary_scoring" || stage.stage === "final_scoring") {
    return [
      { label: "Балл", value: `${result.score} / 100` },
      { label: "Риск", value: String(result.risk_level) },
      { label: "Маршрут", value: String(result.route) },
      { label: "Вид оценки", value: stage.stage === "final_scoring" ? "Итоговая" : "Предварительная" },
      time,
    ];
  }
  if (stage.stage === "documents") {
    const docs = (result.documents ?? []) as { doc_type: DocumentType; source: DocumentSource }[];
    return [
      ...docs.map((doc) => ({
        label: DOCUMENT_LABEL[doc.doc_type],
        value: SOURCE_TONE[doc.source].label,
      })),
      time,
    ];
  }
  if (stage.stage === "verification") {
    return [
      { label: "Документы подтверждены", value: result.documents_verified ? "да" : "нет" },
      { label: "Регистрация действует", value: result.registration_active ? "да" : "нет" },
      { label: "Продукт подходит", value: result.product_eligible ? "да" : "нет" },
      { label: "Антифрод", value: result.fraud_check_passed ? "пройден" : "не пройден" },
      { label: "Документы доверенные", value: result.documents_trusted ? "да" : "нет" },
      time,
    ];
  }
  return [
    { label: "Маршрут", value: String(result.route) },
    { label: "Причина", value: String(result.reason ?? "—") },
    { label: "Балл", value: `${result.score} / 100` },
    { label: "Ждёт сотрудника", value: result.awaiting_employee ? "да" : "нет" },
    time,
  ];
}

export function StageDetail({ stage }: { stage: PipelineStage }) {
  const number = STAGE_ORDER.indexOf(stage.stage) + 5;
  return (
    <div className="flex flex-col gap-4 rounded-[22px] bg-mist-50 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-[13px] font-extrabold text-white">
          {number}
        </span>
        <h3 className="m-0 text-[17px] font-extrabold">{stage.title} · результат</h3>
      </div>
      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-2.5">
        {facts(stage).map((fact) => (
          <Fact key={fact.label} {...fact} />
        ))}
      </dl>
      <details className="overflow-hidden rounded-[14px] bg-white">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-bold">
          JSON
          <ChevronDownIcon size={16} />
        </summary>
        <pre className="m-0 max-h-80 overflow-auto bg-ink-900 p-4 font-mono text-[13px] leading-5 text-line">
          {JSON.stringify(stage.result, null, 2)}
        </pre>
      </details>
    </div>
  );
}
