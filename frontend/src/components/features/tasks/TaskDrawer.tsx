import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Clock,
  User,
  Tag,
  ExternalLink,
  CheckSquare,
  AlertCircle,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  TASK_STATUS_LABELS,
  PRIORITY_LABELS,
  formatRelativeTime,
  getInitials,
} from "@/lib/constants";
import type { Task, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/store/uiStore";
import { tasksApi } from "@/api/tasks";
import { toast } from "@/hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/hooks/useTasks";

interface TaskDrawerProps {
  taskId: string;
  projectId: string;
  storyId: string;
  onClose: () => void;
  onDelete?: (taskId: string) => void;
}

const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress", "done"],
  in_progress: ["blocked", "in_review", "todo"],
  blocked: ["in_progress", "todo"],
  in_review: ["in_progress", "done"],
  done: ["in_progress", "todo"],
};

export function TaskDrawer({
  taskId,
  projectId,
  storyId,
  onClose,
  onDelete,
}: TaskDrawerProps) {
  const qc = useQueryClient();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: taskKeys.detail(projectId, storyId, taskId),
    queryFn: () => tasksApi.get(projectId, storyId, taskId),
    enabled: Boolean(taskId && projectId && storyId),
    refetchInterval: false,
  });

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || newStatus === task.status) return;
    setIsUpdatingStatus(true);
    try {
      await tasksApi.update(projectId, storyId, taskId, {
        status: newStatus,
      });
      qc.invalidateQueries({
        queryKey: taskKeys.detail(projectId, storyId, taskId),
      });
      qc.invalidateQueries({
        queryKey: taskKeys.lists(projectId, storyId),
      });
      toast.success(
        "Status updated",
        `Task moved to ${TASK_STATUS_LABELS[newStatus]}`
      );
    } catch (e: any) {
      toast.error("Update failed", e.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      await tasksApi.delete(projectId, storyId, taskId);
      qc.invalidateQueries({ queryKey: taskKeys.lists(projectId, storyId) });
      toast.success("Task deleted");
      onClose();
      onDelete?.(taskId);
    } catch (e: any) {
      toast.error("Delete failed", e.message);
    }
  };

  const allowedTransitions = task
    ? STATUS_TRANSITIONS[task.status] ?? []
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed right-0 top-0 h-full w-[440px] border-l border-border bg-card z-50 flex flex-col animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : task ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-muted-foreground font-mono tracking-wide">
                    TASK-{task.id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-foreground leading-snug">
                  {task.title}
                </h2>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Task not found</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        {task ? (
          <div className="flex-1 overflow-auto">
            {/* Status change bar */}
            <div className="px-5 py-3 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-14 shrink-0">
                  Status
                </span>
                <Badge variant={task.status as any} className="text-xs mr-2">
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <Select
                  onValueChange={(v) =>
                    handleStatusChange(v as TaskStatus)
                  }
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Move to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTransitions.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {TASK_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Full description */}
              {task.description && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              <Separator />

              {/* Meta fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <MetaField
                  label="Assignee"
                  icon={<User className="h-3 w-3" />}
                >
                  {task.assignee_name ? (
                    <div className="flex items-center gap-1.5 mt-1">
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
                </MetaField>

                <MetaField
                  label="Priority"
                  icon={<Tag className="h-3 w-3" />}
                >
                  <Badge
                    variant={task.priority as any}
                    className="text-xs mt-1"
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </Badge>
                </MetaField>

                <MetaField
                  label="Estimated"
                  icon={<Clock className="h-3 w-3" />}
                >
                  <span className="text-sm text-foreground mt-1 block">
                    {task.estimated_hours
                      ? `${task.estimated_hours}h`
                      : "—"}
                  </span>
                </MetaField>

                <MetaField
                  label="Actual"
                  icon={<Clock className="h-3 w-3" />}
                >
                  <span className="text-sm text-foreground mt-1 block">
                    {task.actual_hours ? `${task.actual_hours}h` : "—"}
                  </span>
                </MetaField>
              </div>

              {/* Time progress bar */}
              {task.estimated_hours && task.actual_hours ? (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Time spent</span>
                    <span
                      className={cn(
                        task.actual_hours > task.estimated_hours
                          ? "text-destructive"
                          : "text-green-400"
                      )}
                    >
                      {task.actual_hours}h / {task.estimated_hours}h
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      (task.actual_hours / task.estimated_hours) * 100,
                      100
                    )}
                    className="h-1.5"
                    indicatorClassName={
                      task.actual_hours > task.estimated_hours
                        ? "bg-destructive"
                        : "bg-green-500"
                    }
                  />
                </div>
              ) : null}

              <Separator />

              {/* Timestamps */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">
                    {formatRelativeTime(task.created_at)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-foreground">
                    {formatRelativeTime(task.updated_at)}
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
                      <AvatarFallback className="text-xs bg-primary/15 text-primary">
                        SY
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-foreground">
                        <span className="font-medium">System</span>{" "}
                        created this task
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(task.created_at)}
                      </p>
                    </div>
                  </div>
                  {task.updated_at !== task.created_at && (
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/15 text-primary">
                          SY
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-foreground">
                          <span className="font-medium">System</span>{" "}
                          updated this task
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRelativeTime(task.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={`h-4 ${i % 2 === 0 ? "w-full" : "w-2/3"}`} />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

function MetaField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
        {icon} {label}
      </p>
      {children}
    </div>
  );
}