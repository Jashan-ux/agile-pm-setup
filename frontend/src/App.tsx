import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { StoriesPage } from "@/pages/StoriesPage";
import { TasksPage } from "@/pages/TasksPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { toast } from "@/hooks/useToast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: Error) => {
        toast.error("Operation failed", error.message);
      },
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route
                path="/projects/:projectId/stories"
                element={<StoriesPage />}
              />
              <Route
                path="/projects/:projectId/stories/:storyId/tasks"
                element={<TasksPage />}
              />
              <Route path="/reports" element={<ReportsPage />} />
              <Route
                path="/tasks"
                element={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <p className="text-sm font-medium">Global Tasks View</p>
                      <p className="text-xs mt-1">
                        Navigate to a project → story to see its tasks
                      </p>
                    </div>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}