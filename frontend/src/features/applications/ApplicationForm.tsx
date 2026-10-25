import { useState } from "react";

import { errorText } from "@/lib/api";
import { useScenarios } from "@/lib/queries";
import type { ApplicationDraft } from "@/lib/types";

interface Props {
  initial?: ApplicationDraft;
  editableCompany: boolean;
  submitLabel: string;
  onSubmit: (draft: ApplicationDraft) => Promise<unknown>;
}

const EMPTY: ApplicationDraft = {
  company: { inn: "", name: "", legal_form: "OOO" },
  loan: { amount_rub: 1000000, term_months: 12, purpose: "" },
  declared: {},
};

export function ApplicationForm({ initial, editableCompany, submitLabel, onSubmit }: Props) {
  const scenarios = useScenarios();
  const start = initial ?? EMPTY;
  const [company, setCompany] = useState(start.company);
  const [amount, setAmount] = useState(String(start.loan.amount_rub));
  const [term, setTerm] = useState(String(start.loan.term_months));
  const [purpose, setPurpose] = useState(start.loan.purpose ?? "");
  const [declared, setDeclared] = useState(JSON.stringify(start.declared, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function applyScenario(key: string) {
    const scenario = scenarios.data?.find((item) => item.key === key);
    if (!scenario) return;
    setCompany(scenario.company);
    setAmount(String(scenario.loan.amount_rub));
    setTerm(String(scenario.loan.term_months));
    setPurpose(scenario.loan.purpose ?? "");
    setDeclared(JSON.stringify(scenario.declared, null, 2));
  }

  async function submit() {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(declared || "{}");
    } catch {
      setError("declared: некорректный JSON");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        company,
        loan: { amount_rub: Number(amount), term_months: Number(term), purpose: purpose || null },
        declared: parsed,
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {editableCompany && (
        <div>
          <label className="label">Сценарий</label>
          <select
            className="input"
            defaultValue=""
            onChange={(event) => applyScenario(event.target.value)}
          >
            <option value="" disabled>
              Выбрать
            </option>
            {scenarios.data?.map((item) => (
              <option key={item.key} value={item.key}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label">ИНН</label>
          <input
            className="input"
            disabled={!editableCompany}
            value={company.inn}
            onChange={(e) => setCompany({ ...company, inn: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Наименование</label>
          <input
            className="input"
            disabled={!editableCompany}
            value={company.name}
            onChange={(e) => setCompany({ ...company, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Форма</label>
          <select
            className="input"
            disabled={!editableCompany}
            value={company.legal_form}
            onChange={(e) =>
              setCompany({ ...company, legal_form: e.target.value as "IP" | "OOO" })
            }
          >
            <option value="OOO">ООО</option>
            <option value="IP">ИП</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Сумма, ₽</label>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">Срок, мес.</label>
          <input className="input" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div>
          <label className="label">Цель</label>
          <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Данные анкеты (JSON)</label>
        <textarea
          className="input h-64 font-mono text-xs"
          value={declared}
          onChange={(e) => setDeclared(e.target.value)}
        />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button className="btn btn-primary" disabled={busy} type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
