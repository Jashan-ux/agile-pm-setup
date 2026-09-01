import { create } from "zustand";

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Modals
  createProjectOpen: boolean;
  createStoryOpen: boolean;
  createTaskOpen: boolean;

  editProjectId: string | null;
  editStoryId: string | null;
  editTaskId: string | null;

  taskDrawerId: string | null;

  // Context IDs for nested creation
  activeProjectId: string | null;
  activeStoryId: string | null;

  // Actions
  openCreateProject: () => void;
  closeCreateProject: () => void;

  openCreateStory: (projectId: string) => void;
  closeCreateStory: () => void;

  openCreateTask: (projectId: string, storyId: string) => void;
  closeCreateTask: () => void;

  openTaskDrawer: (taskId: string) => void;
  closeTaskDrawer: () => void;

  openEditProject: (id: string) => void;
  closeEditProject: () => void;

  openEditStory: (id: string) => void;
  closeEditStory: () => void;

  setActiveProjectId: (id: string | null) => void;
  setActiveStoryId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  createProjectOpen: false,
  createStoryOpen: false,
  createTaskOpen: false,
  editProjectId: null,
  editStoryId: null,
  editTaskId: null,
  taskDrawerId: null,
  activeProjectId: null,
  activeStoryId: null,

  openCreateProject: () => set({ createProjectOpen: true }),
  closeCreateProject: () => set({ createProjectOpen: false }),

  openCreateStory: (projectId) =>
    set({ createStoryOpen: true, activeProjectId: projectId }),
  closeCreateStory: () => set({ createStoryOpen: false }),

  openCreateTask: (projectId, storyId) =>
    set({
      createTaskOpen: true,
      activeProjectId: projectId,
      activeStoryId: storyId,
    }),
  closeCreateTask: () => set({ createTaskOpen: false }),

  openTaskDrawer: (taskId) => set({ taskDrawerId: taskId }),
  closeTaskDrawer: () => set({ taskDrawerId: null }),

  openEditProject: (id) => set({ editProjectId: id }),
  closeEditProject: () => set({ editProjectId: null }),

  openEditStory: (id) => set({ editStoryId: id }),
  closeEditStory: () => set({ editStoryId: null }),

  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setActiveStoryId: (id) => set({ activeStoryId: id }),
}));