import { useParams, Link } from "react-router-dom";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, ChevronRight, LayoutGrid, List } from "lucide-react";
import {
  KANBAN_COLUMNS,
  PRIORITY_LABELS,
  formatRelativeTime,
  getInitials,
} from "@/lib/constants";
import type { Task, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

function TaskCard({
  task,
  projectId,
  storyId,
  onStatusChange,
  onClick,
}: {
  task: Task;
  projectId: string;
  storyId: string;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-3 space-y-2.5 cursor-pointer hover:border-primary/40 transition-all group"
      onClick={onClick}
    >
      <p className="text-sm font-medium text-foreground leading-snug">
        {task.title}
      </p>

      <div className="flex items-center gap-1.5">
        <Badge variant={task.priority as any} className="text-xs">
          {PRIORITY_LABELS[task.priority]}
        </Badge>
      </div>

      {task.assignee_name && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {getInitials(task.assignee_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {task.assignee_name.split(" ")[0]} {task.assignee_name.split(" ")[1]?.[0]}.
            </span>
          </div>
          {task.estimated_hours && (
            <span className="text-xs text-muted-foreground">
              {task.estimated_hours}h
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  title,
  status,
  tasks,
  color,
  projectId,
  storyId,
  onAddTask,
  onStatusChange,
  onTaskClick,
}: {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  color: string;
  projectId: string;
  storyId: string;
  onAddTask: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskClick: (taskId: string) => void;
}) {
  return (
    <div className="flex flex-col min-w-[240px] max-w-[240px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", color)}>{title}</span>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2 flex-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            projectId={projectId}
            storyId={storyId}
            onStatusChange={onStatusChange}
            onClick={() => onTaskClick(task.id)}
          />
        ))}

        {/* Add task button */}
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>
    </div>
  );
}

export function TasksPage() {
  const { projectId, storyId } = useParams<{
    projectId: string;
    storyId: string;
  }>();
  const pid = projectId ?? "";
  const sid = storyId ?? "";

  const { data, isLoading } = useTasks(pid, sid, { page_size: 100 });
  const updateTask = useUpdateTask(pid, sid);
  const { openCreateTask, openTaskDrawer } = useUIStore();

  const tasks = data?.items ?? [];

  const tasksByStatus = KANBAN_COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = tasks.filter((t) => t.status === col.id);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ taskId, payload: { status } });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Link to="/projects" className="hover:text-foreground">Projects</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/projects/${pid}/stories`} className="hover:text-foreground">
            Stories
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Tasks</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Tasks</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
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
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                title={col.label}
                status={col.id}
                tasks={tasksByStatus[col.id] ?? []}
                color={col.color}
                projectId={pid}
                storyId={sid}
                onAddTask={() => openCreateTask(pid, sid)}
                onStatusChange={handleStatusChange}
                onTaskClick={openTaskDrawer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}