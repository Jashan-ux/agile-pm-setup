import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import type { CreateTaskPayload, UpdateTaskPayload } from "@/types";
import { storyKeys } from "./useStories";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: (projectId: string, storyId: string) =>
    [...taskKeys.all, projectId, storyId, "list"] as const,
  detail: (projectId: string, storyId: string, taskId: string) =>
    [...taskKeys.all, "detail", projectId, storyId, taskId] as const,
};

export function useTasks(
  projectId: string,
  storyId: string,
  params?: object
) {
  return useQuery({
    queryKey: taskKeys.lists(projectId, storyId),
    queryFn: () => tasksApi.list(projectId, storyId, params),
    enabled: Boolean(projectId) && Boolean(storyId),
  });
}

export function useTask(
  projectId: string,
  storyId: string,
  taskId: string
) {
  return useQuery({
    queryKey: taskKeys.detail(projectId, storyId, taskId),
    queryFn: () => tasksApi.get(projectId, storyId, taskId),
    enabled: Boolean(projectId) && Boolean(storyId) && Boolean(taskId),
  });
}

export function useCreateTask(projectId: string, storyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      tasksApi.create(projectId, storyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists(projectId, storyId) });
      qc.invalidateQueries({ queryKey: storyKeys.detail(projectId, storyId) });
    },
  });
}

export function useUpdateTask(
  projectId: string,
  storyId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: UpdateTaskPayload;
    }) => tasksApi.update(projectId, storyId, taskId, payload),
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists(projectId, storyId) });
      qc.invalidateQueries({
        queryKey: taskKeys.detail(projectId, storyId, taskId),
      });
      qc.invalidateQueries({ queryKey: storyKeys.detail(projectId, storyId) });
    },
  });
}

export function useDeleteTask(projectId: string, storyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      tasksApi.delete(projectId, storyId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists(projectId, storyId) });
    },
  });
}