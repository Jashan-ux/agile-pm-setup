import { useTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  X, Clock, User, Tag, ChevronUp,
} from "lucide-react";
import {
  TASK_STATUS_LABELS,
  PRIORITY_LABELS,
  formatRelativeTime,
  getInitials,
} from "@/lib/constants";
import type { TaskStatus } from "@/types";

interface TaskDrawerProps {
  taskId: string;
  onClose: () => void;
  projectId?: string;
  storyId?: string;
}

export function TaskDrawer({
  taskId,
  onClose,
  projectId = "",
  storyId = "",
}: TaskDrawerProps) {
  // Note: In a real app you'd store the projectId/storyId context
  // For now we render the drawer with available data
  const { data: task, isLoading } = useTask(projectId, storyId, taskId);

  if (!projectId || !storyId) {
    return (
      <div className="fixed right-0 top-0 h-full w-96 border-l border-border bg-card z-50 flex items-center justify-center animate-slide-in-right">
        <div className="text-center text-muted-foreground text-sm">
          <p>Open a task from the Kanban board</p>
          <p className="text-xs mt-1">to see full details here</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] border-l border-border bg-card z-50 flex flex-col animate-slide-in-right shadow-2xl">
      {/* Drawer Header */}
      <div className="flex items-start justify-between p-5 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-mono">
              TASK-{taskId.slice(-4).toUpperCase()}
            </span>
            {task && (
              <Badge variant={task.status as any} className="text-xs">
                {TASK_STATUS_LABELS[task.status]}
              </Badge>
            )}
          </div>
          <h2 className="text-base font-semibold text-foreground leading-snug">
            {isLoading ? "Loading..." : task?.title ?? "Task not found"}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 ml-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {task && (
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <User className="h-3 w-3" /> Assignee
              </p>
              {task.assignee_name ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(task.assignee_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">
                    {task.assignee_name}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Unassigned
                </span>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Priority
              </p>
              <Badge variant={task.priority as any} className="text-xs">
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Estimated
              </p>
              <span className="text-sm text-foreground">
                {task.estimated_hours ? `${task.estimated_hours}h` : "—"}
              </span>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Actual
              </p>
              <span className="text-sm text-foreground">
                {task.actual_hours ? `${task.actual_hours}h` : "—"}
              </span>
            </div>
          </div>

          <Separator />

          {/* Activity */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-xs">SY</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-foreground">
                    <span className="font-medium">System</span> created this task
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(task.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}