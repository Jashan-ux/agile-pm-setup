import { apiClient } from "./client";
import type {
  UserStory,
  UserStorySummary,
  PaginatedResponse,
  CreateStoryPayload,
  UpdateStoryPayload,
} from "@/types";

export const storiesApi = {
  list: async (
    projectId: string,
    params?: {
      page?: number;
      page_size?: number;
      status?: string;
      sort_by?: string;
      sort_order?: string;
    }
  ): Promise<PaginatedResponse<UserStorySummary>> => {
    const { data } = await apiClient.get(
      `/projects/${projectId}/stories/`,
      { params }
    );
    return data;
  },

  get: async (projectId: string, storyId: string): Promise<UserStory> => {
    const { data } = await apiClient.get(
      `/projects/${projectId}/stories/${storyId}`
    );
    return data;
  },

  create: async (
    projectId: string,
    payload: CreateStoryPayload
  ): Promise<UserStory> => {
    const { data } = await apiClient.post(
      `/projects/${projectId}/stories/`,
      payload
    );
    return data;
  },

  update: async (
    projectId: string,
    storyId: string,
    payload: UpdateStoryPayload
  ): Promise<UserStory> => {
    const { data } = await apiClient.patch(
      `/projects/${projectId}/stories/${storyId}`,
      payload
    );
    return data;
  },

  delete: async (projectId: string, storyId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/stories/${storyId}`);
  },
};