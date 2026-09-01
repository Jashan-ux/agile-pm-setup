import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ProjectForm } from "@/components/features/projects/ProjectForm";
import { StoryForm } from "@/components/features/stories/StoryForm";
import { TaskForm } from "@/components/features/tasks/TaskForm";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useUIStore } from "@/store/uiStore";

export function AppLayout() {
  const {
    createProjectOpen,
    closeCreateProject,
    createStoryOpen,
    closeCreateStory,
    createTaskOpen,
    closeCreateTask,
    activeProjectId,
    activeStoryId,
  } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Global Create Modals */}
      <ProjectForm
        open={createProjectOpen}
        onClose={closeCreateProject}
      />

      {activeProjectId && (
        <StoryForm
          open={createStoryOpen}
          onClose={closeCreateStory}
          projectId={activeProjectId}
        />
      )}

      {activeProjectId && activeStoryId && (
        <TaskForm
          open={createTaskOpen}
          onClose={closeCreateTask}
          projectId={activeProjectId}
          storyId={activeStoryId}
        />
      )}

      {/* Global Toast Notifications */}
      <Toaster />
    </div>
  );
}