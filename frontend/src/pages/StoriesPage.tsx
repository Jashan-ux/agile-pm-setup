import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useStories, useDeleteStory } from "@/hooks/useStories";
import { useProject } from "@/hooks/useProjects";
import { useUIStore } from "@/store/uiStore";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/loading-skeletons";

import { EditStoryModal } from "@/components/features/stories/EditStoryModal";

import {
  Plus,
  ChevronRight,
  Trash2,
  Edit2,
  BookOpen,
} from "lucide-react";

import {
  STORY_STATUS_LABELS,
  PRIORITY_LABELS,
  calcCompletionPercent,
  formatRelativeTime,
  getInitials,
} from "@/lib/constants";

export function StoriesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ?? "";

  // Pagination + edit state
  const [editStoryId, setEditStoryId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: project } = useProject(pid);

  const { data, isLoading } = useStories(pid, {
    page_size: 20,
    page,
  });

  const deleteStory = useDeleteStory(pid);
  const { openCreateStory } = useUIStore();

  const stories = data?.items ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Link
            to="/projects"
            className="hover:text-foreground transition-colors"
          >
            Projects
          </Link>

          <ChevronRight className="h-3 w-3" />

          <span className="text-foreground">
            {project?.name}
          </span>

          <ChevronRight className="h-3 w-3" />

          <span className="text-foreground">
            User Stories
          </span>
        </div>

        {/* Page title + button */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            User Stories
          </h1>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => openCreateStory(pid)}
          >
            <Plus className="h-4 w-4" />
            New User Story
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <table className="w-full">
            <tbody>
              <TableSkeleton rows={6} cols={8} />
            </tbody>
          </table>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <BookOpen className="h-12 w-12 text-muted-foreground/30" />

            <p className="text-muted-foreground text-sm">
              No user stories yet
            </p>

            <Button
              size="sm"
              variant="outline"
              onClick={() => openCreateStory(pid)}
            >
              Create first story
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Title
                </th>

                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-28">
                  Status
                </th>

                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-24">
                  Priority
                </th>

                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-16">
                  Points
                </th>

                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-24">
                  Tasks
                </th>

                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">
                  Progress
                </th>

                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-24">
                  Assignee
                </th>

                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-24">
                  Updated
                </th>

                <th className="w-20" />
              </tr>
            </thead>

            <tbody>
              {stories.map((story) => {
                const pct = calcCompletionPercent(
                  story.task_count ?? 0,
                  Math.max(story.task_count ?? 0, 1)
                );

                return (
                  <tr
                    key={story.id}
                    className="border-b border-border hover:bg-accent/30 transition-colors cursor-pointer group"
                    onClick={() =>
                      (window.location.href = `/projects/${pid}/stories/${story.id}/tasks`)
                    }
                  >
                    {/* Title */}
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {story.title}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <Badge
                        variant={story.status as any}
                        className="text-xs"
                      >
                        {STORY_STATUS_LABELS[story.status]}
                      </Badge>
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-3">
                      <Badge
                        variant={story.priority as any}
                        className="text-xs"
                      >
                        {PRIORITY_LABELS[story.priority]}
                      </Badge>
                    </td>

                    {/* Story Points */}
                    <td className="px-3 py-3">
                      <span className="text-sm text-muted-foreground">
                        {story.story_points ?? "—"}
                      </span>
                    </td>

                    {/* Tasks */}
                    <td className="px-3 py-3">
                      <span className="text-sm text-muted-foreground">
                        {story.task_count}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={pct}
                          className="h-1.5 w-20"
                        />

                        <span className="text-xs text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    </td>

                    {/* Assignee */}
                    <td className="px-3 py-3">
                      {story.assignee_name ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(story.assignee_name)}
                            </AvatarFallback>
                          </Avatar>

                          <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                            {story.assignee_name.split(" ")[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>

                    {/* Updated */}
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(story.updated_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditStoryId(story.id);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();

                            if (confirm("Delete this story?")) {
                              deleteStory.mutate(story.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <Pagination
          page={data.page}
          pages={data.pages}
          total={data.total}
          pageSize={data.page_size}
          hasNext={data.has_next}
          hasPrev={data.has_prev}
          onPageChange={setPage}
        />
      )}

      {/* Edit Story Modal */}
      {editStoryId && (
        <EditStoryModal
          projectId={pid}
          storyId={editStoryId}
          open={Boolean(editStoryId)}
          onClose={() => setEditStoryId(null)}
        />
      )}
    </div>
  );
}