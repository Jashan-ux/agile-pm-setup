import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  FolderKanban,
} from "lucide-react";
import {
  calcCompletionPercent,
  formatRelativeTime,
  getInitials,
  PROJECT_STATUS_LABELS,
} from "@/lib/constants";
import type { ProjectStatus } from "@/types";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: "planning",
  active: "active",
  on_hold: "on_hold",
  completed: "completed",
  archived: "archived",
};

export function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");

  const { openCreateProject } = useUIStore();
  const { data, isLoading } = useProjects({
    search: search || undefined,
    status: statusFilter || undefined,
    page_size: 50,
  });

  const deleteProject = useDeleteProject();
  const projects = data?.items ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Manage all your projects in one place.
            </p>
          </div>
          <Button onClick={openCreateProject} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProjectStatus | "")
            }
          >
            <option value="">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <FolderKanban className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No projects found</p>
            <Button onClick={openCreateProject} size="sm" variant="outline">
              Create your first project
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 w-[30%]">
                  Project Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-16">
                  Key
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-28">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">
                  Progress
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-24">
                  Stories
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 w-28">
                  Updated
                </th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const pct = calcCompletionPercent(
                  project.story_count ?? 0,
                  Math.max(project.story_count ?? 0, 1)
                );
                const key = project.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 4);

                return (
                  <tr
                    key={project.id}
                    className="border-b border-border hover:bg-accent/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/projects/${project.id}/stories`)}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                          <FolderKanban className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {key}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          STATUS_COLORS[project.status] as any
                        }
                        className="text-xs"
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={pct}
                          className="h-1.5 w-24"
                          indicatorClassName={
                            project.status === "active"
                              ? "bg-blue-500"
                              : project.status === "on_hold"
                              ? "bg-yellow-500"
                              : "bg-primary"
                          }
                        />
                        <span className="text-xs text-muted-foreground w-8">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-muted-foreground">
                        {project.story_count ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(project.updated_at)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}/stories`);
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this project?")) {
                              deleteProject.mutate(project.id);
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

      {data && (
        <div className="border-t border-border px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {data.total} project{data.total !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}