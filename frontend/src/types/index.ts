// ─── Enums ────────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export type StoryStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled";

export type StoryPriority = "low" | "medium" | "high" | "critical";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retrying"
  | "cancelled";

export type JobType =
  | "project_report"
  | "stale_task_scan"
  | "story_completion_check"
  | "bulk_status_update";

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
  total_stories: number;
  total_tasks: number;
  completed_stories: number;
  completed_tasks: number;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
  story_count: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assignee_name: string | null;
  estimated_hours: number | null;
}

export interface UserStory {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: StoryStatus;
  priority: StoryPriority;
  story_points: number | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  total_tasks: number;
  completed_tasks: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  tasks: TaskSummary[];
}

export interface UserStorySummary {
  id: string;
  title: string;
  status: StoryStatus;
  priority: StoryPriority;
  story_points: number | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  task_count: number;
}

export interface Task {
  id: string;
  story_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours: number | null;
  actual_hours: number | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  job_type: JobType;
  status: JobStatus;
  celery_task_id: string | null;
  project_id: string | null;
  story_id: string | null;
  input_data: Record<string, unknown> | null;
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  triggered_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── API Request Payloads ─────────────────────────────────────────────────────

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: ProjectStatus;
  owner_name?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  owner_name?: string;
}

export interface CreateStoryPayload {
  title: string;
  description?: string;
  acceptance_criteria?: string;
  status?: StoryStatus;
  priority?: StoryPriority;
  story_points?: number;
  assignee_name?: string;
}

export interface UpdateStoryPayload {
  title?: string;
  description?: string;
  acceptance_criteria?: string;
  status?: StoryStatus;
  priority?: StoryPriority;
  story_points?: number;
  assignee_name?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  estimated_hours?: number;
  actual_hours?: number;
  assignee_name?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  estimated_hours?: number;
  actual_hours?: number;
  assignee_name?: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface ModalState {
  createProject: boolean;
  createStory: boolean;
  createTask: boolean;
  editProject: string | null;  // project id
  editStory: string | null;
  editTask: string | null;
  taskDrawer: string | null;   // task id for detail drawer
}