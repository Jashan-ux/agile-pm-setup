import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { projectsApi } from "@/api/projects";
import type {
  CreateProjectPayload,
  UpdateProjectPayload,
} from "@/types";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: object) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export function useProjects(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: projectKeys.list(params ?? {}),
    queryFn: () => projectsApi.list(params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) =>
      projectsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateProjectPayload;
    }) => projectsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}