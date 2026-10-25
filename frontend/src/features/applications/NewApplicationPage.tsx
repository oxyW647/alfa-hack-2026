import { useNavigate } from "react-router-dom";

import { useCreateApplication } from "@/lib/queries";

import { ApplicationForm } from "./ApplicationForm";

export function NewApplicationPage() {
  const navigate = useNavigate();
  const create = useCreateApplication();

  return (
    <ApplicationForm
      editableCompany
      submitLabel="Создать заявку"
      onSubmit={async (draft) => {
        const created = await create.mutateAsync(draft);
        navigate(`/applications/${created.id}`);
      }}
    />
  );
}
