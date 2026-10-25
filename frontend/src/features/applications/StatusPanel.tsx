import clsx from "clsx";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/Badges";
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  DocPlusIcon,
  EditIcon,
  EyeIcon,
  SpinnerIcon,
  UploadIcon,
} from "@/components/icons";
import { applicationNumber, dateLong, money, months } from "@/lib/format";
import { useAcceptOffer } from "@/lib/queries";
import { errorText } from "@/lib/api";
import type { ActionItem, Application, OfferTerms } from "@/lib/types";
import { DOCUMENT_LABEL, FIELD_LABEL } from "@/lib/format";

export function actionLabel(action: ActionItem): string {
  if (action.document_type) return `Загрузить: ${DOCUMENT_LABEL[action.document_type]}`;
  if (action.field) return `Заполнить: ${FIELD_LABEL[action.field] ?? action.field}`;
  return "Проверить документы";
}

export function ApplicationHeader({
  app,
  big,
  onEdit,
  extra,
}: {
  app: Application;
  big: boolean;
  onEdit: () => void;
  extra?: ReactNode;
}) {
  const number = applicationNumber(app.id, app.created_at);
  return (
    <div className="flex flex-col gap-6 p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[34px] font-extrabold leading-10 tracking-[-0.015em]">
              {app.company.name}
            </h1>
            <StatusBadge status={app.status} />
          </div>
          <span className="text-[15px] tabular-nums text-ink-600">
            ИНН {app.company.inn} · {number}
            {!big && ` · ${money(app.loan.amount_rub)} · ${months(app.loan.term_months)} · ${money(app.loan.monthly_payment_rub)}/мес.`}
          </span>
        </div>
        <button type="button" onClick={onEdit} className="btn btn-outline h-12 px-5 text-[15px]">
          <EditIcon />
          Анкета
        </button>
      </div>
      {big && (
        <dl className="m-0 flex flex-wrap items-end gap-x-12 gap-y-4">
          <div className="flex flex-col gap-1">
            <dt className="text-[13px] font-semibold text-ink-500">Сумма</dt>
            <dd className="m-0 text-5xl font-extrabold leading-[52px] tracking-[-0.025em] tabular-nums">
              {money(app.loan.amount_rub)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-[13px] font-semibold text-ink-500">Срок</dt>
            <dd className="m-0 text-[26px] font-extrabold leading-[34px]">{months(app.loan.term_months)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-[13px] font-semibold text-ink-500">Ежемесячный платёж</dt>
            <dd className="m-0 text-[26px] font-extrabold leading-[34px] tabular-nums">
              {money(app.loan.monthly_payment_rub)}
            </dd>
          </div>
          {extra}
        </dl>
      )}
    </div>
  );
}

function IconBubble({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={clsx("flex h-14 w-14 flex-none items-center justify-center rounded-[18px]", tone)}>
      {children}
    </span>
  );
}

function OfferTable({
  terms,
  requested,
  dark,
}: {
  terms: OfferTerms;
  requested?: { amount_rub: number; term_months: number };
  dark?: boolean;
}) {
  const muted = dark ? "text-ink-400" : "text-ink-500";
  const changedTerm = requested && requested.term_months !== terms.term_months;
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-[52px] font-extrabold leading-[56px] tracking-[-0.025em] tabular-nums">
          {money(terms.amount_rub)}
        </span>
        {requested && requested.amount_rub !== terms.amount_rub && (
          <span className={clsx("text-lg font-semibold tabular-nums line-through", muted)}>
            {money(requested.amount_rub)}
          </span>
        )}
      </div>
      <dl className="m-0 grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <dt className={clsx("text-[13px] font-semibold", muted)}>Срок</dt>
          <dd className={clsx("m-0 text-lg font-bold", changedTerm && dark && "text-lime-500")}>
            {months(terms.term_months)}
            {changedTerm && <span className={clsx("ml-1.5 text-sm line-through", muted)}>{requested.term_months}</span>}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className={clsx("text-[13px] font-semibold", muted)}>Ставка</dt>
          <dd className="m-0 text-lg font-bold">{terms.annual_rate_percent}% годовых</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className={clsx("text-[13px] font-semibold", muted)}>Платёж</dt>
          <dd className="m-0 text-lg font-bold tabular-nums">{money(terms.monthly_payment_rub)}</dd>
        </div>
      </dl>
    </>
  );
}

function Circles({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="pointer-events-none">
      {children}
    </div>
  );
}

export function StatusPanel({
  app,
  onAction,
}: {
  app: Application;
  onAction: (action: ActionItem) => void;
}) {
  const accept = useAcceptOffer(app.id);
  const failure = accept.error ? (
    <span className="text-sm font-semibold text-red-700">{errorText(accept.error)}</span>
  ) : null;

  switch (app.status) {
    case "DRAFT":
      return (
        <div className="flex items-center gap-4 bg-mist-100 p-7">
          <IconBubble tone="bg-white text-ink-900">
            <EditIcon size={26} />
          </IconBubble>
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[28px] font-extrabold leading-[34px]">{app.status_title}</h2>
            <span className="text-ink-600">{app.status_text}</span>
          </div>
        </div>
      );
    case "IN_PROGRESS":
      return (
        <div className="flex items-center gap-4 bg-sky-100 p-7">
          <IconBubble tone="bg-sky-500 text-white">
            <SpinnerIcon size={26} />
          </IconBubble>
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[28px] font-extrabold leading-[34px]">{app.status_title}</h2>
            <span className="text-sky-900">{app.status_text}</span>
          </div>
        </div>
      );
    case "MORE_INFO_REQUIRED":
      return (
        <div className="flex flex-wrap items-start gap-x-10 gap-y-6 bg-amber-100 p-7">
          <div className="flex flex-[1_1_260px] items-center gap-4">
            <IconBubble tone="bg-amber-500 text-ink-900">
              <DocPlusIcon size={26} />
            </IconBubble>
            <h2 className="m-0 text-[28px] font-extrabold leading-[34px]">{app.status_title}</h2>
          </div>
          <ul className="m-0 flex flex-[2_1_380px] list-none flex-col gap-2 p-0">
            {app.actions.map((action, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white py-3 pl-[18px] pr-3"
              >
                <span className="text-base font-bold">{actionLabel(action)}</span>
                <button
                  type="button"
                  onClick={() => onAction(action)}
                  className={clsx(
                    "btn h-10 gap-2 rounded-xl px-4 text-sm text-white",
                    action.document_type ? "bg-red-500 hover:bg-red-600" : "bg-ink-900 hover:bg-ink-800",
                  )}
                >
                  {action.document_type ? <UploadIcon size={14} /> : <EditIcon size={14} />}
                  {action.document_type ? "Загрузить" : action.field ? "Заполнить" : "Проверить"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    case "UNDER_REVIEW":
      return (
        <div className="relative overflow-hidden bg-violet-500 p-7 text-white">
          <Circles>
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-900/60" />
            <div className="absolute bottom-6 right-40 h-14 w-14 rounded-full bg-lime-500" />
          </Circles>
          <div className="relative flex items-center gap-4">
            <IconBubble tone="bg-white text-violet-900">
              <EyeIcon size={26} />
            </IconBubble>
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-[28px] font-extrabold leading-[34px]">{app.status_title}</h2>
              <span className="text-[#F2EBFF]">{app.status_text}</span>
            </div>
          </div>
        </div>
      );
    case "APPROVED_DEMO":
      return (
        <div className="relative flex flex-wrap items-center gap-8 overflow-hidden bg-lime-500 px-8 py-10">
          <Circles>
            <div className="absolute -right-28 -top-36 h-[360px] w-[360px] rounded-full bg-ink-900" />
            <div className="absolute right-[210px] top-10 h-[72px] w-[72px] rounded-full bg-red-500" />
            <div className="absolute -bottom-24 -left-16 h-[180px] w-[180px] rounded-full border-[18px] border-lime-600" />
          </Circles>
          <div className="relative flex flex-[1_1_300px] flex-col gap-5">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-ink-900 text-lime-500">
              <CheckIcon size={38} stroke={3} />
            </span>
            <h2 className="m-0 text-[64px] font-black leading-[64px] tracking-[-0.03em]">Одобрено</h2>
            <span className="self-start rounded-full bg-ink-900 px-3 py-1.5 text-[13px] font-bold text-white">
              Демо
            </span>
          </div>
          {app.offer && (
            <div className="relative flex flex-[1_1_380px] flex-col gap-[22px] rounded-3xl bg-white p-7 shadow-lg">
              <span className="eyebrow">Предложение</span>
              <OfferTable terms={app.offer} />
              <button
                type="button"
                disabled={accept.isPending}
                onClick={() => accept.mutate("requested")}
                className="btn btn-primary h-14 rounded-2xl text-[17px] font-extrabold"
              >
                Принять
              </button>
              {failure}
            </div>
          )}
        </div>
      );
    case "NOT_APPROVED_DEMO":
      return (
        <div className="flex flex-wrap items-center gap-6 bg-red-50 p-7">
          <div className="flex flex-[1_1_260px] items-center gap-4">
            <IconBubble tone="bg-red-500 text-white">
              <AlertIcon size={26} />
            </IconBubble>
            <h2 className="m-0 text-[28px] font-extrabold leading-[34px]">{app.status_title}</h2>
          </div>
          {app.alternative_offer && (
            <div className="flex flex-[1_1_380px] flex-col gap-5 rounded-3xl bg-ink-900 p-7 text-white">
              <span className="eyebrow !text-lime-500">Альтернативное предложение</span>
              <OfferTable
                dark
                terms={app.alternative_offer}
                requested={{ amount_rub: app.loan.amount_rub, term_months: app.loan.term_months }}
              />
              <button
                type="button"
                disabled={accept.isPending}
                onClick={() => accept.mutate("alternative")}
                className="btn btn-primary h-14 rounded-2xl text-[17px] font-extrabold"
              >
                Принять
              </button>
              {accept.error && <span className="text-sm font-semibold text-red-100">{errorText(accept.error)}</span>}
            </div>
          )}
        </div>
      );
    case "OFFER_ACCEPTED_DEMO":
      return (
        <div className="relative flex flex-wrap items-center gap-8 overflow-hidden bg-pine px-8 py-9 text-white">
          <Circles>
            <div className="absolute -bottom-32 -left-20 h-[260px] w-[260px] rounded-full border-[22px] border-lime-500" />
          </Circles>
          <div className="relative flex flex-[1_1_280px] items-center gap-4">
            <IconBubble tone="bg-lime-500 text-ink-900">
              <CheckIcon size={28} stroke={3} />
            </IconBubble>
            <h2 className="m-0 text-4xl font-black leading-10 tracking-[-0.02em]">{app.status_title}</h2>
          </div>
          {app.accepted_offer && (
            <div className="relative flex flex-[1_1_380px] flex-col gap-[18px] rounded-[22px] bg-white/10 p-6 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.22)]">
              <span className="eyebrow !text-lime-500">Принятые условия</span>
              <OfferTable dark terms={app.accepted_offer} />
              <span className="flex items-center gap-2 text-sm font-semibold text-[#BFE6CD]">
                <ClockIcon size={14} />
                {dateLong(app.accepted_at)}
              </span>
            </div>
          )}
        </div>
      );
  }
}
