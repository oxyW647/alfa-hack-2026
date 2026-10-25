import { useState } from "react";

import { Badge } from "@/components/Badge";
import { errorText } from "@/lib/api";
import { DOCUMENT_LABEL, DOCUMENT_TEMPLATES } from "@/lib/format";
import { usePutDocument } from "@/lib/queries";
import type { AnyApplication, DocumentType } from "@/lib/types";
import { isEmployeeApplication } from "@/lib/types";

const SOURCE_LABEL = { registry: "Реестр", upload: "Клиент", employee: "Сотрудник" };

const TYPES = Object.keys(DOCUMENT_LABEL) as DocumentType[];

export function DocumentsPanel({ application }: { application: AnyApplication }) {
  const put = usePutDocument(application.id);
  const [type, setType] = useState<DocumentType>("egrul_extract");
  const [text, setText] = useState(JSON.stringify(DOCUMENT_TEMPLATES.egrul_extract, null, 2));
  const [error, setError] = useState<string | null>(null);

  function pick(next: DocumentType) {
    setType(next);
    const payload = isEmployeeApplication(application)
      ? application.documents_payload[next]
      : undefined;
    setText(JSON.stringify(payload ?? DOCUMENT_TEMPLATES[next], null, 2));
  }

  async function upload() {
    setError(null);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text);
    } catch {
      setError("Некорректный JSON");
      return;
    }
    try {
      await put.mutateAsync(payload);
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold">Документы</h2>
      <ul className="space-y-1 text-sm">
        {TYPES.map((item) => {
          const present = application.documents.find((doc) => doc.doc_type === item);
          return (
            <li key={item} className="flex items-center justify-between">
              <span>{DOCUMENT_LABEL[item]}</span>
              {present ? (
                <Badge tone="bg-emerald-100 text-emerald-800">
                  {SOURCE_LABEL[present.source]}
                </Badge>
              ) : (
                <Badge tone="bg-neutral-200 text-neutral-600">Нет</Badge>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <select
          className="input"
          value={type}
          onChange={(event) => pick(event.target.value as DocumentType)}
        >
          {TYPES.map((item) => (
            <option key={item} value={item}>
              {DOCUMENT_LABEL[item]}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" disabled={put.isPending} onClick={() => void upload()}>
          Загрузить
        </button>
      </div>
      <textarea
        className="input h-48 font-mono text-xs"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
