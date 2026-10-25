import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { Badge } from "@/components/Badge";
import { STATUS_LABEL, STATUS_TONE, money } from "@/lib/format";
import { useApplications, useMe } from "@/lib/queries";
import { signInAs } from "@/lib/session";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; label: string }[] = [
  { role: "client", label: "Клиент" },
  { role: "employee", label: "Сотрудник банка" },
];

export function ApplicationsLayout() {
  const me = useMe();
  const list = useApplications();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function switchRole(role: Role) {
    if (me.data?.role === role) return;
    await signInAs(role);
    queryClient.clear();
    navigate("/new");
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <Link to="/" className="font-semibold">
          Кредитный кабинет
        </Link>
        <div className="flex gap-1">
          {ROLES.map(({ role, label }) => (
            <button
              key={role}
              className={clsx("btn", me.data?.role === role && "btn-primary")}
              onClick={() => void switchRole(role)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:flex-row">
        <aside className="w-full shrink-0 space-y-2 lg:w-72">
          <Link to="/new" className="btn btn-primary w-full">
            Новая заявка
          </Link>
          {list.data?.items.map((item) => (
            <NavLink
              key={item.id}
              to={`/applications/${item.id}`}
              className={({ isActive }) =>
                clsx(
                  "card block space-y-1 !p-3 text-sm transition",
                  isActive ? "border-neutral-900" : "hover:border-neutral-400",
                )
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.company_name}</span>
                <span className="text-xs text-neutral-400">#{item.id}</span>
              </div>
              <div className="text-xs text-neutral-500">
                {money(item.amount_rub)} · {item.term_months} мес.
                {item.score != null && ` · ${item.score}`}
              </div>
              <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
            </NavLink>
          ))}
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
