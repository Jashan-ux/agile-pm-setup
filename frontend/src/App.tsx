import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { StoriesPage } from "@/pages/StoriesPage";
import { TasksPage } from "@/pages/TasksPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
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
              <Route path="/reports" element={<div className="p-6 text-muted-foreground text-sm">Reports page — Sprint 5</div>} />
              <Route path="/tasks" element={<div className="p-6 text-muted-foreground text-sm">Global tasks view — Sprint 5</div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}