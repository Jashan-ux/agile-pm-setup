import { apiClient } from "./client";
import type {
  Task,
  PaginatedResponse,
  CreateTaskPayload,
  UpdateTaskPayload,
} from "@/types";

export const tasksApi = {
  list: async (
    projectId: string,
    storyId: string,
    params?: {
      page?: number;
      page_size?: number;
      status?: string;
    }
  ): Promise<PaginatedResponse<Task>> => {
    const { data } = await apiClient.get(
      `/projects/${projectId}/stories/${storyId}/tasks/`,
      { params }
    );
    return data;
  },

  get: async (
    projectId: string,
    storyId: string,
    taskId: string
  ): Promise<Task> => {
    const { data } = await apiClient.get(
      `/projects/${projectId}/stories/${storyId}/tasks/${taskId}`
    );
    return data;
  },

  create: async (
    projectId: string,
    storyId: string,
    payload: CreateTaskPayload
  ): Promise<Task> => {
    const { data } = await apiClient.post(
      `/projects/${projectId}/stories/${storyId}/tasks/`,
      payload
    );
    return data;
  },

  update: async (
    projectId: string,
    storyId: string,
    taskId: string,
    payload: UpdateTaskPayload
  ): Promise<Task> => {
    const { data } = await apiClient.patch(
      `/projects/${projectId}/stories/${storyId}/tasks/${taskId}`,
      payload
    );
    return data;
  },

  delete: async (
    projectId: string,
    storyId: string,
    taskId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/projects/${projectId}/stories/${storyId}/tasks/${taskId}`
    );
  },
};