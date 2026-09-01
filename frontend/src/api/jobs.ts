import { apiClient } from "./client";
import type { Job, PaginatedResponse } from "@/types";

export const jobsApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    job_type?: string;
    status?: string;
    project_id?: string;
  }): Promise<PaginatedResponse<Job>> => {
    const { data } = await apiClient.get("/jobs/", { params });
    return data;
  },

  get: async (jobId: string): Promise<Job> => {
    const { data } = await apiClient.get(`/jobs/${jobId}`);
    return data;
  },
};