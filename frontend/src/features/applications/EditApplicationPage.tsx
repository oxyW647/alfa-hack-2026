import { useNavigate, useParams } from "react-router-dom";

import { useApplication, useUpdateApplication } from "@/lib/queries";
import { valuesFromApplication } from "@/lib/wizard";

import { Wizard } from "./Wizard";

export function EditApplicationPage() {
  const id = Number(useParams().id);
  const application = useApplication(id);
  const update = useUpdateApplication(id);
  const navigate = useNavigate();

  if (!application.data) return null;

  return (
    <Wizard
      key={id}
      mode="edit"
      title="Анкета"
      initial={valuesFromApplication(application.data)}
      onSubmit={async (draft) => {
        await update.mutateAsync({ loan: draft.loan, declared: draft.declared });
        navigate(`/applications/${id}`);
      }}
    />
  );
}
