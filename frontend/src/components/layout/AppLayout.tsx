import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ProjectForm } from "@/components/features/projects/ProjectForm";
import { StoryForm } from "@/components/features/stories/StoryForm";
import { TaskForm } from "@/components/features/tasks/TaskForm";
import { TaskDrawer } from "@/components/features/tasks/TaskDrawer";
import { useUIStore } from "@/store/uiStore";

export function AppLayout() {
  const {
    createProjectOpen, closeCreateProject,
    createStoryOpen, closeCreateStory,
    createTaskOpen, closeCreateTask,
    taskDrawerId, closeTaskDrawer,
    activeProjectId, activeStoryId,
  } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Global modals */}
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

      {taskDrawerId && (
        <TaskDrawer
          taskId={taskDrawerId}
          onClose={closeTaskDrawer}
        />
      )}
    </div>
  );
}