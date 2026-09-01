import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storiesApi } from "@/api/stories";
import type { CreateStoryPayload, UpdateStoryPayload } from "@/types";

export const storyKeys = {
  all: ["stories"] as const,
  lists: (projectId: string) => [...storyKeys.all, projectId, "list"] as const,
  list: (projectId: string, params: object) =>
    [...storyKeys.lists(projectId), params] as const,
  details: () => [...storyKeys.all, "detail"] as const,
  detail: (projectId: string, storyId: string) =>
    [...storyKeys.details(), projectId, storyId] as const,
};

export function useStories(projectId: string, params?: object) {
  return useQuery({
    queryKey: storyKeys.list(projectId, params ?? {}),
    queryFn: () => storiesApi.list(projectId, params),
    enabled: Boolean(projectId),
  });
}

export function useStory(projectId: string, storyId: string) {
  return useQuery({
    queryKey: storyKeys.detail(projectId, storyId),
    queryFn: () => storiesApi.get(projectId, storyId),
    enabled: Boolean(projectId) && Boolean(storyId),
  });
}

export function useCreateStory(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStoryPayload) =>
      storiesApi.create(projectId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storyKeys.lists(projectId) });
    },
  });
}

export function useUpdateStory(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      storyId,
      payload,
    }: {
      storyId: string;
      payload: UpdateStoryPayload;
    }) => storiesApi.update(projectId, storyId, payload),
    onSuccess: (_, { storyId }) => {
      qc.invalidateQueries({ queryKey: storyKeys.lists(projectId) });
      qc.invalidateQueries({
        queryKey: storyKeys.detail(projectId, storyId),
      });
    },
  });
}

export function useDeleteStory(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => storiesApi.delete(projectId, storyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storyKeys.lists(projectId) });
    },
  });
}