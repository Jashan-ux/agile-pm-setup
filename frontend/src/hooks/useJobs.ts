import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "@/api/jobs";
import type { JobStatus } from "@/types";

export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (params: object) => [...jobKeys.lists(), params] as const,
  detail: (id: string) => [...jobKeys.all, "detail", id] as const,
};

export function useJobs(params?: {
  page?: number;
  page_size?: number;
  job_type?: string;
  status?: string;
  project_id?: string;
}) {
  return useQuery({
    queryKey: jobKeys.list(params ?? {}),
    queryFn: () => jobsApi.list(params),
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

// Poll a specific job until it reaches a terminal state
export function useJobPolling(jobId: string | null) {
  const TERMINAL: JobStatus[] = ["completed", "failed", "cancelled"];

  return useQuery({
    queryKey: jobKeys.detail(jobId ?? ""),
    queryFn: () => jobsApi.get(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status as JobStatus | undefined;
      if (status && TERMINAL.includes(status)) return false; // Stop polling
      return 2000; // Poll every 2 seconds while pending/processing
    },
  });
}