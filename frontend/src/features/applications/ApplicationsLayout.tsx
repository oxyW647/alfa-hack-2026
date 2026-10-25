import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { StatusBadge } from "@/components/Badges";
import { AlertIcon, PlusIcon, RepeatIcon } from "@/components/icons";
import { applicationNumber, money, months } from "@/lib/format";
import { useApplications, useMe } from "@/lib/queries";
import { signInAs } from "@/lib/session";
import type { ApplicationListItem, Role } from "@/lib/types";

const ROLES: { role: Role; label: string }[] = [
  { role: "client", label: "Клиент" },
  { role: "employee", label: "Сотрудник банка" },
];

function scoreTile(score: number | null) {
  if (score == null) return { tone: "bg-mist-200 text-mist-400", text: "—", small: false };
  if (score > 75) return { tone: "bg-lime-100 text-lime-900", text: String(score), small: true };
  if (score >= 46) return { tone: "bg-amber-100 text-amber-900", text: String(score), small: true };
  return { tone: "bg-red-500 text-white", text: String(score), small: true };
}

function ListItem({ item, employee }: { item: ApplicationListItem; employee: boolean }) {
  const tile = scoreTile(item.score);
  return (
    <NavLink
      to={`/applications/${item.id}`}
      className={({ isActive }) =>
        clsx(
          "flex w-full gap-3 rounded-2xl text-left",
          employee ? "p-3.5" : "flex-col gap-2 p-4",
          isActive ? "bg-white shadow-[inset_0_0_0_2px_#EF3124]" : "bg-mist-50 hover:bg-mist-100",
        )
      }
    >
      {employee && (
        <span
          className={clsx(
            "flex h-12 w-12 flex-none flex-col items-center justify-center rounded-[14px] text-lg font-extrabold leading-[18px]",
            tile.tone,
          )}
        >
          {tile.text}
          {tile.small && <span className="text-[10px] font-semibold leading-3">/100</span>}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-base font-bold">{item.company_name}</span>
        <span className="text-sm tabular-nums text-ink-600">
          {money(item.amount_rub)} · {months(item.term_months)}
        </span>
        <span className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <span className="whitespace-nowrap text-[13px] text-ink-500">{applicationNumber(item.id, item.created_at)}</span>
          <StatusBadge status={item.status} size="sm" />
        </span>
      </span>
    </NavLink>
  );
}

function SidebarSkeleton() {
  return (
    <div aria-busy="true" className="flex animate-pulseSoft flex-col gap-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-2.5 rounded-2xl bg-mist-50 p-4">
          <div className="h-4 w-2/3 rounded bg-line" />
          <div className="h-3.5 w-1/2 rounded bg-mist-200" />
          <div className="flex justify-between">
            <div className="h-3 w-1/4 rounded bg-mist-200" />
            <div className="h-5 w-1/3 rounded-full bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApplicationsLayout() {
  const me = useMe();
  const list = useApplications();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const employee = me.data?.role === "employee";

  async function switchRole(role: Role) {
    if (me.data?.role === role) return;
    await signInAs(role);
    queryClient.clear();
    navigate("/");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-3">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-red-500 text-lg font-extrabold text-white">
              ₽
            </span>
            <span className="text-[19px] font-extrabold">Кредитный кабинет</span>
          </NavLink>
          <div role="group" aria-label="Роль" className="flex gap-1 rounded-field bg-mist-100 p-1">
            {ROLES.map(({ role, label }) => (
              <button
                key={role}
                type="button"
                aria-pressed={me.data?.role === role}
                onClick={() => void switchRole(role)}
                className={clsx(
                  "h-10 rounded-[11px] px-[18px] text-[15px] font-bold",
                  me.data?.role === role ? "bg-red-500 text-white" : "text-ink-900 hover:bg-line",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-wrap items-start gap-6 p-6">
        <aside
          aria-label="Заявки"
          className="flex flex-[1_1_320px] flex-col gap-3 rounded-3xl bg-white p-4 lg:max-w-[320px]"
        >
          <NavLink
            to="/new"
            className={({ isActive }) =>
              clsx(
                "btn btn-primary h-[52px] text-base",
                isActive && "shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#EF3124]",
              )
            }
          >
            <PlusIcon />
            Новая заявка
          </NavLink>
          <span className="eyebrow px-1 pt-2">{employee ? "Все заявки" : "Мои заявки"}</span>
          {list.isLoading && <SidebarSkeleton />}
          {list.isError && (
            <div role="alert" className="flex items-center gap-3 rounded-2xl bg-ink-900 p-3.5 text-white">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-red-500">
                <AlertIcon size={16} />
              </span>
              <span className="flex-1 text-sm font-semibold">Не удалось загрузить заявки</span>
              <button
                type="button"
                onClick={() => void list.refetch()}
                className="btn h-9 gap-1.5 rounded-xl bg-white px-3 text-[13px] text-ink-900"
              >
                <RepeatIcon size={14} />
                Повторить
              </button>
            </div>
          )}
          {list.data?.items.map((item) => (
            <ListItem key={item.id} item={item} employee={Boolean(employee)} />
          ))}
        </aside>
        <main className="min-w-0 flex-[999_1_560px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
