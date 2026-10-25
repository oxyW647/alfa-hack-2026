import { useNavigate } from "react-router-dom";

import { useCreateApplication } from "@/lib/queries";

import { Wizard } from "./Wizard";

export function NewApplicationPage() {
  const navigate = useNavigate();
  const create = useCreateApplication();

  return (
    <Wizard
      mode="create"
      title="Новая заявка"
      onSubmit={async (draft) => {
        const created = await create.mutateAsync(draft);
        navigate(`/applications/${created.id}`);
      }}
    />
  );
}
