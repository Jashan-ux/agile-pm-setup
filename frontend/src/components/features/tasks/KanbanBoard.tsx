import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { SortableTaskCard } from "./SortableTaskCard";
import { KANBAN_COLUMNS } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types";
import { toast } from "@/hooks/useToast";

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
  storyId: string;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskClick: (taskId: string) => void;
  onAddTask: () => void;
  isUpdating?: boolean;
}

export function KanbanBoard({
  tasks,
  projectId,
  storyId,
  onStatusChange,
  onTaskClick,
  onAddTask,
  isUpdating,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Optimistic local state for smooth drag UX
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Sync when server data changes
  if (JSON.stringify(tasks.map((t) => t.id + t.status)) !==
    JSON.stringify(localTasks.map((t) => t.id + t.status))) {
    setLocalTasks(tasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 8px movement before drag starts (prevents accidental drags)
      activationConstraint: { distance: 8 },
    })
  );

  const tasksByStatus = KANBAN_COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = localTasks.filter((t) => t.status === col.id);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  function handleDragStart(event: DragStartEvent) {
    const task = localTasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    const targetColumn = KANBAN_COLUMNS.find(
      (col) =>
        col.id === overId ||
        localTasks.find((t) => t.id === overId)?.status === col.id
    );
    if (!targetColumn) return;

    const activeTask = localTasks.find((t) => t.id === activeTaskId);
    if (!activeTask || activeTask.status === targetColumn.id) return;

    // Optimistically update local state for smooth animation
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === activeTaskId ? { ...t, status: targetColumn.id } : t
      )
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Find target status from column id or task's column
    const activeTask = localTasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    const newStatus = activeTask.status; // already updated by handleDragOver

    const originalStatus = tasks.find((t) => t.id === activeTaskId)?.status;

    if (newStatus === originalStatus) return;

    try {
      await onStatusChange(activeTaskId, newStatus);
      toast.success(
        "Task moved",
        `Moved to ${newStatus.replace("_", " ")}`
      );
    } catch (err) {
      // Revert optimistic update on failure
      setLocalTasks(tasks);
      toast.error("Failed to move task", "Please try again");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 h-full">
        {KANBAN_COLUMNS.map((col) => (
          <SortableContext
            key={col.id}
            id={col.id}
            items={tasksByStatus[col.id]?.map((t) => t.id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              id={col.id}
              title={col.label}
              color={col.color}
              tasks={tasksByStatus[col.id] ?? []}
              onAddTask={onAddTask}
              onTaskClick={onTaskClick}
            />
          </SortableContext>
        ))}
      </div>

      {/* Drag Overlay - the ghost card while dragging */}
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
        {activeTask ? (
          <div className="rotate-2 opacity-95 shadow-2xl">
            <SortableTaskCard
              task={activeTask}
              isDragging
              onClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}