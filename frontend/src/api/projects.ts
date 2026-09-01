import { apiClient } from "./client";
import type {
  Project,
  ProjectListItem,
  PaginatedResponse,
  CreateProjectPayload,
  UpdateProjectPayload,
} from "@/types";

export const projectsApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<PaginatedResponse<ProjectListItem>> => {
    const { data } = await apiClient.get("/projects/", { params });
    return data;
  },

  get: async (id: string): Promise<Project> => {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data;
  },

  create: async (payload: CreateProjectPayload): Promise<Project> => {
    const { data } = await apiClient.post("/projects/", payload);
    return data;
  },

  update: async (id: string, payload: UpdateProjectPayload): Promise<Project> => {
    const { data } = await apiClient.patch(`/projects/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  generateReport: async (
    id: string,
    triggeredBy?: string
  ): Promise<{ id: string; status: string }> => {
    const { data } = await apiClient.post(
      `/reports/projects/${id}/generate`,
      { triggered_by: triggeredBy }
    );
    return data;
  },
};