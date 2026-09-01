import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTaskCard } from "./SortableTaskCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  color: string;
  tasks: Task[];
  onAddTask: () => void;
  onTaskClick: (taskId: string) => void;
}

export function KanbanColumn({
  id,
  title,
  color,
  tasks,
  onAddTask,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col min-w-[240px] max-w-[240px] h-full">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              id === "todo" && "bg-slate-400",
              id === "in_progress" && "bg-blue-400",
              id === "in_review" && "bg-purple-400",
              id === "done" && "bg-green-400"
            )}
          />
          <span className={cn("text-sm font-semibold", color)}>
            {title}
          </span>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 hover:opacity-100"
          onClick={onAddTask}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 flex-1 rounded-xl p-2 transition-colors min-h-[200px]",
          isOver
            ? "bg-primary/5 ring-1 ring-primary/20"
            : "bg-secondary/20"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
            <p className="text-xs text-muted-foreground/50 text-center">
              Drop tasks here
            </p>
          </div>
        )}

        {/* Add task */}
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all text-xs w-full mt-1"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          Add task
        </button>
      </div>
    </div>
  );
}