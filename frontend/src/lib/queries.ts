import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  AnyApplication,
  ApplicationDraft,
  ApplicationListItem,
  Page,
  Pipeline,
  Scenario,
  StageKey,
  User,
} from "@/lib/types";

export function useMe() {
  const token = useAuth((s) => s.token);
  return useQuery<User>({
    queryKey: ["me", token],
    queryFn: async () => (await api.get<User>("/auth/me")).data,
    enabled: Boolean(token),
    retry: false,
  });
}

export function useScenarios() {
  return useQuery<Scenario[]>({
    queryKey: ["scenarios"],
    queryFn: async () => (await api.get<Scenario[]>("/demo/scenarios")).data,
  });
}

export function useApplications() {
  return useQuery<Page<ApplicationListItem>>({
    queryKey: ["applications"],
    queryFn: async () =>
      (await api.get<Page<ApplicationListItem>>("/applications", { params: { size: 100 } })).data,
  });
}

export function useApplication(id: number) {
  return useQuery<AnyApplication>({
    queryKey: ["application", id],
    queryFn: async () => (await api.get<AnyApplication>(`/applications/${id}`)).data,
  });
}

export function usePipeline(id: number) {
  return useQuery<Pipeline>({
    queryKey: ["pipeline", id],
    queryFn: async () => (await api.get<Pipeline>(`/applications/${id}/pipeline`)).data,
  });
}

function useRefresh(id?: number) {
  const client = useQueryClient();
  return async () => {
    await client.invalidateQueries({ queryKey: ["applications"] });
    if (id !== undefined) {
      await client.invalidateQueries({ queryKey: ["application", id] });
      await client.invalidateQueries({ queryKey: ["pipeline", id] });
    }
  };
}

export function useCreateApplication() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (draft: ApplicationDraft) =>
      (await api.post<AnyApplication>("/applications", draft)).data,
    onSuccess: refresh,
  });
}

export function useUpdateApplication(id: number) {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: async (draft: Pick<ApplicationDraft, "loan" | "declared">) =>
      (await api.patch<AnyApplication>(`/applications/${id}`, draft)).data,
    onSuccess: refresh,
  });
}

export function useRunStage(id: number) {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: async (stage: StageKey) =>
      (await api.post<Pipeline>(`/applications/${id}/stages/${stage}/run`)).data,
    onSuccess: refresh,
  });
}

export function useRunAll(id: number) {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: async () => (await api.post<Pipeline>(`/applications/${id}/run`)).data,
    onSuccess: refresh,
  });
}

export function useResetApplication(id: number) {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: async () => (await api.post(`/applications/${id}/reset`)).data,
    onSuccess: refresh,
  });
}

export function usePutDocument(id: number) {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.put(`/applications/${id}/documents`, payload)).data,
    onSuccess: refresh,
  });
}

export function useAcceptOffer(id: number) {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: async (kind: "requested" | "alternative") =>
      (await api.post(`/applications/${id}/offer/accept`, { kind })).data,
    onSuccess: refresh,
  });
}

export function useManualReview(id: number) {
  const refresh = useRefresh(id);
  return useMutation({
    mutationFn: async (payload: { decision: "approve" | "decline"; comment: string | null }) =>
      (await api.post(`/applications/${id}/manual-review`, payload)).data,
    onSuccess: refresh,
  });
}
