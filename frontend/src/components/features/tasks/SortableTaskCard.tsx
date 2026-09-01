import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GripVertical, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, getInitials } from "@/lib/constants";
import type { Task } from "@/types";

interface SortableTaskCardProps {
  task: Task;
  isDragging?: boolean;
  onClick: () => void;
}

export function SortableTaskCard({
  task,
  isDragging = false,
  onClick,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isGhosted = isSortableDragging && !isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-pointer group",
        "hover:border-primary/40 hover:shadow-md transition-all",
        "select-none",
        isGhosted && "opacity-30 scale-95",
        isDragging && "shadow-2xl border-primary/40 cursor-grabbing"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground/30 hover:text-muted-foreground/80 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <p className="text-sm font-medium text-foreground leading-snug">
            {task.title}
          </p>

          {/* Priority badge */}
          <Badge variant={task.priority as any} className="text-xs">
            {PRIORITY_LABELS[task.priority]}
          </Badge>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {task.assignee_name ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs bg-primary/15 text-primary">
                    {getInitials(task.assignee_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[70px]">
                  {task.assignee_name.split(" ")[0]}{" "}
                  {task.assignee_name.split(" ")[1]?.[0]
                    ? `${task.assignee_name.split(" ")[1][0]}.`
                    : ""}
                </span>
              </div>
            ) : (
              <div />
            )}

            {task.estimated_hours && (
              <div className="flex items-center gap-1 text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{task.estimated_hours}h</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}