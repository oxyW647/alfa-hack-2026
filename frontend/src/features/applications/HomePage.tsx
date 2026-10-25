import { Navigate, useNavigate } from "react-router-dom";

import { PlusIcon } from "@/components/icons";
import { useApplications } from "@/lib/queries";

export function HomePage() {
  const list = useApplications();
  const navigate = useNavigate();

  if (list.isLoading || list.isError) return null;
  const first = list.data?.items[0];
  if (first) return <Navigate to={`/applications/${first.id}`} replace />;

  return (
    <div className="card flex flex-col items-center gap-6 px-8 py-20">
      <div aria-hidden="true" className="flex gap-3">
        <div className="h-14 w-14 rounded-full bg-lime-500" />
        <div className="h-14 w-14 rounded-2xl bg-red-500" />
        <div className="h-14 w-14 rounded-full bg-violet-500" />
        <div className="h-14 w-14 rounded-2xl bg-ink-900" />
      </div>
      <h2 className="m-0 text-[28px] font-extrabold">Заявок пока нет</h2>
      <button
        type="button"
        onClick={() => navigate("/new")}
        className="btn btn-primary h-[52px] px-7 text-base"
      >
        <PlusIcon />
        Новая заявка
      </button>
    </div>
  );
}
