import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTasks, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useStory } from "@/hooks/useStories";
import { useProject } from "@/hooks/useProjects";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/features/tasks/KanbanBoard";
import { TaskDrawer } from "@/components/features/tasks/TaskDrawer";
import { KanbanColumnSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ChevronRight,
  LayoutGrid,
  List,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/useToast";
import { STORY_STATUS_LABELS } from "@/lib/constants";
import type { TaskStatus } from "@/types";

export function TasksPage() {
  const { projectId, storyId } = useParams<{
    projectId: string;
    storyId: string;
  }>();
  const pid = projectId ?? "";
  const sid = storyId ?? "";

  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  const { data: project } = useProject(pid);
  const { data: story } = useStory(pid, sid);
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useTasks(pid, sid, { page_size: 100 });

  const updateTask = useUpdateTask(pid, sid);
  const { openCreateTask } = useUIStore();

  const tasks = data?.items ?? [];

  const handleStatusChange = async (
    taskId: string,
    newStatus: TaskStatus
  ): Promise<void> => {
    await updateTask.mutateAsync({
      taskId,
      payload: { status: newStatus },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Link
            to="/projects"
            className="hover:text-foreground transition-colors"
          >
            Projects
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            to={`/projects/${pid}/stories`}
            className="hover:text-foreground transition-colors"
          >
            {project?.name ?? "..."}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            to={`/projects/${pid}/stories`}
            className="hover:text-foreground transition-colors"
          >
            User Stories
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[200px]">
            {story?.title ?? "Tasks"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Tasks</h1>
            {story && (
              <Badge variant={story.status as any} className="text-xs">
                {STORY_STATUS_LABELS[story.status]}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
              />
            </Button>

            {/* New Task */}
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => openCreateTask(pid, sid)}
            >
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Story stats bar */}
        {story && (
          <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground">
            <span>{story.total_tasks} tasks total</span>
            <span className="text-green-400">
              {story.completed_tasks} done
            </span>
            {story.total_estimated_hours > 0 && (
              <span>{story.total_estimated_hours}h estimated</span>
            )}
            {story.story_points && (
              <span>{story.story_points} story points</span>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        <ErrorBoundary>
          {isLoading ? (
            <div className="flex gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <KanbanColumnSkeleton key={i} />
              ))}
            </div>
          ) : (
            <KanbanBoard
              tasks={tasks}
              projectId={pid}
              storyId={sid}
              onStatusChange={handleStatusChange}
              onTaskClick={(taskId) => setDrawerTaskId(taskId)}
              onAddTask={() => openCreateTask(pid, sid)}
              isUpdating={updateTask.isPending}
            />
          )}
        </ErrorBoundary>
      </div>

      {/* Task Drawer */}
      {drawerTaskId && (
        <TaskDrawer
          taskId={drawerTaskId}
          projectId={pid}
          storyId={sid}
          onClose={() => setDrawerTaskId(null)}
          onDelete={() => setDrawerTaskId(null)}
        />
      )}
    </div>
  );
}