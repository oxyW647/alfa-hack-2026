import clsx from "clsx";

import { CheckIcon, CrossIcon } from "@/components/icons";
import {
  RISK_TONE,
  ROUTE_TONE,
  SOURCE_TONE,
  STATUS_TONE,
} from "@/lib/format";
import type {
  CheckItem,
  ClientStatus,
  DocumentSource,
  RiskLevel,
  Route,
} from "@/lib/types";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: ClientStatus;
  size?: "sm" | "md";
}) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        tone.badge,
        size === "md" ? "px-3 py-[5px] text-[13px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <span className={clsx("rounded-full", tone.dot, size === "md" ? "h-[7px] w-[7px]" : "h-1.5 w-1.5")} />
      {tone.label}
    </span>
  );
}

export function RiskBadge({ level, large = false }: { level: RiskLevel; large?: boolean }) {
  return (
    <span
      className={clsx(
        "rounded-lg font-bold tracking-[0.04em]",
        RISK_TONE[level],
        large ? "px-3.5 py-1.5 text-sm font-extrabold" : "px-3 py-[5px] text-[13px]",
      )}
    >
      {level}
    </span>
  );
}

export function RouteBadge({ route, large = false }: { route: Route; large?: boolean }) {
  return (
    <span
      className={clsx(
        "rounded-lg font-bold",
        ROUTE_TONE[route],
        large ? "px-3.5 py-1.5 text-sm font-extrabold" : "px-3 py-[5px] text-[13px]",
      )}
    >
      {route}
    </span>
  );
}

export function SourceBadge({ source }: { source: DocumentSource | null }) {
  if (source === null) {
    return (
      <span className="inline-block rounded-full border border-dashed border-ink-400 px-[11px] py-[3px] text-xs font-semibold text-ink-500">
        Нет
      </span>
    );
  }
  const tone = SOURCE_TONE[source];
  return (
    <span className={clsx("inline-block rounded-full px-2.5 py-[3px] text-xs font-semibold", tone.badge)}>
      {tone.label}
    </span>
  );
}

export function CheckMark({ status }: { status: CheckItem["status"] }) {
  if (status === "passed") {
    return (
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-lime-500 text-ink-900">
        <CheckIcon size={14} />
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-amber-500 text-[15px] font-black text-ink-900">
        !
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-red-500 text-white">
      <CrossIcon size={13} />
    </span>
  );
}

export const CHECK_TONE: Record<CheckItem["status"], string> = {
  passed: "bg-lime-100 text-lime-900",
  warning: "bg-amber-100 text-amber-900",
  failed: "bg-red-50 text-red-700",
};
