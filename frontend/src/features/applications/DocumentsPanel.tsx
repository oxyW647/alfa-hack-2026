import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { SourceBadge } from "@/components/Badges";
import { SelectField, FieldError } from "@/components/Fields";
import { ClipboardIcon, DocIcon, LockIcon, UploadIcon } from "@/components/icons";
import { errorText } from "@/lib/api";
import { DOCUMENT_LABEL } from "@/lib/format";
import { usePutDocument } from "@/lib/queries";
import type { AnyApplication, DocumentType } from "@/lib/types";
import { DOCUMENT_TEMPLATES } from "@/lib/templates";

const TYPES = Object.keys(DOCUMENT_LABEL) as DocumentType[];

export function DocumentsPanel({
  app,
  employee,
  canUpload,
  selectedType,
  onSelectType,
}: {
  app: AnyApplication;
  employee: boolean;
  canUpload: boolean;
  selectedType: DocumentType;
  onSelectType: (type: DocumentType) => void;
}) {
  const put = usePutDocument(app.id);
  const [tab, setTab] = useState<"file" | "paste">("paste");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(JSON.stringify(DOCUMENT_TEMPLATES[selectedType], null, 2));
    setError(null);
  }, [selectedType]);

  async function upload() {
    setError(null);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      setError("Некорректный JSON");
      return;
    }
    try {
      await put.mutateAsync(payload as Record<string, unknown>);
      setText("");
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function paste() {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      setError("Нет доступа к буферу обмена");
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setText(await file.text());
    setTab("paste");
  }

  return (
    <section id="documents" className="card flex flex-col gap-5 p-7">
      <h2 className="m-0 text-2xl font-extrabold leading-[30px]">Документы</h2>
      <div className="flex flex-wrap items-start gap-5">
        <div
          className={clsx(
            "gap-2.5",
            canUpload
              ? "flex flex-[1_1_320px] flex-col"
              : "grid w-full grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
          )}
        >
          {TYPES.map((type) => {
            const present = app.documents.find((doc) => doc.doc_type === type);
            return (
              <div
                key={type}
                className={clsx(
                  "flex items-center gap-4 rounded-[18px] p-4",
                  present ? "bg-mist-50" : "border-[1.5px] border-dashed border-mist-300 bg-white",
                )}
              >
                <span
                  className={clsx(
                    "flex h-11 w-11 flex-none items-center justify-center rounded-xl",
                    present ? "border-[1.5px] border-line bg-white text-ink-900" : "bg-mist-100 text-ink-500",
                  )}
                >
                  <DocIcon size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-[15px] font-bold">{DOCUMENT_LABEL[type]}</span>
                  <span className="self-start">
                    <SourceBadge source={present?.source ?? null} />
                  </span>
                </div>
                {present?.source === "registry" && !employee && canUpload && (
                  <button
                    type="button"
                    disabled
                    className="btn btn-secondary h-10 gap-2 rounded-xl px-3.5 text-sm"
                  >
                    <LockIcon size={14} />
                    Заменить
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {canUpload && (
          <div className="flex flex-[1_1_380px] flex-col gap-4 rounded-3xl bg-mist-50 p-5">
            <SelectField
              id="doc-type"
              label="Тип документа"
              value={selectedType}
              onChange={(value) => onSelectType(value as DocumentType)}
              options={TYPES.map((type) => ({ value: type, label: DOCUMENT_LABEL[type] }))}
            />
            <div role="tablist" aria-label="Способ загрузки" className="flex gap-1 rounded-field bg-mist-200 p-1">
              {(
                [
                  ["file", "JSON-файл"],
                  ["paste", "Из буфера"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => (key === "file" ? fileRef.current?.click() : setTab(key))}
                  className={clsx(
                    "h-10 flex-1 rounded-[11px] text-sm font-bold",
                    tab === key ? "bg-white text-ink-900 shadow-[0_1px_3px_rgba(23,23,26,0.12)]" : "text-ink-600",
                  )}
                >
                  {label}
                </button>
              ))}
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => void readFile(event.target.files?.[0])}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="doc-json" className="text-sm font-semibold text-ink-600">
                JSON
              </label>
              <textarea
                id="doc-json"
                rows={8}
                value={text}
                placeholder="{ … }"
                onChange={(event) => setText(event.target.value)}
                className="resize-y rounded-field border-[1.5px] border-line bg-white px-4 py-3.5 font-mono text-sm leading-[21px] outline-none focus:border-ink-900"
              />
              <FieldError id="doc-err" message={error ?? undefined} />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => void paste()}
                className="btn h-12 gap-2 bg-white px-[18px] text-[15px] shadow-[inset_0_0_0_1.5px_#E3E4E8] hover:bg-mist-100"
              >
                <ClipboardIcon size={16} />
                Вставить из буфера
              </button>
              <button
                type="button"
                disabled={!text.trim() || put.isPending}
                onClick={() => void upload()}
                className="btn btn-primary h-12 flex-1 gap-2 px-[18px] text-[15px]"
              >
                <UploadIcon size={16} />
                Загрузить
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
