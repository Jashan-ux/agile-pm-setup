import { useProjects } from "@/hooks/useProjects";
import { useStories } from "@/hooks/useStories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUIStore } from "@/store/uiStore";
import {
  FolderKanban,
  BookOpen,
  CheckSquare,
  TrendingUp,
  Plus,
  ArrowRight,
  X,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  calcCompletionPercent,
  formatRelativeTime,
  getInitials,
} from "@/lib/constants";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <button className="absolute top-3 right-3 opacity-30 hover:opacity-60">
          <X className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { openCreateProject } = useUIStore();
  const { data: projectsData } = useProjects({ page_size: 100 });

  const projects = projectsData?.items ?? [];
  const activeProjects = projects.filter((p) => p.status === "active");

  // Aggregate stats
  const totalStories = projects.reduce((s, p) => s + (p.story_count ?? 0), 0);

  // Mock completed for display (real data would come from aggregation endpoint)
  const completedCount = 32;
  const totalTasks = 68;
  const completionPct = calcCompletionPercent(completedCount, totalTasks);

  const pieData = [
    { name: "Completed", value: completedCount, color: "#6366f1" },
    { name: "In Progress", value: 21, color: "#f59e0b" },
    { name: "To Do", value: 15, color: "#334155" },
  ];

  const recentActivity = [
    {
      user: "Neha Sharma",
      action: 'User story "Login with OAuth" updated',
      time: "2h ago",
      color: "bg-green-500",
    },
    {
      user: "Arjun Singh",
      action: 'Task "Fix API error handling" completed',
      time: "3h ago",
      color: "bg-blue-500",
    },
    {
      user: "Rahul Verma",
      action: 'New task "Design dashboard layout" created',
      time: "5h ago",
      color: "bg-purple-500",
    },
    {
      user: "Neha Sharma",
      action: 'User story "Payment Integration" created',
      time: "1d ago",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        </div>
        <Button onClick={openCreateProject} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, Arjun 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's what's happening with your projects today.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Projects"
            value={projects.length}
            icon={FolderKanban}
            color="bg-blue-500"
          />
          <StatCard
            label="User Stories"
            value={totalStories}
            icon={BookOpen}
            color="bg-purple-500"
          />
          <StatCard
            label="Tasks"
            value={totalTasks}
            icon={CheckSquare}
            color="bg-orange-500"
          />
          <StatCard
            label="Completed"
            value={completedCount}
            icon={TrendingUp}
            color="bg-green-500"
          />
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Progress Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative h-36 w-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(222 47% 8%)",
                          border: "1px solid hsl(216 34% 17%)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{completionPct}%</span>
                    <span className="text-xs text-muted-foreground">
                      Overall
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: d.color }}
                      />
                      <span className="text-sm text-foreground">
                        {d.name}
                      </span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {d.value} ({Math.round((d.value / totalTasks) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold">
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7">
                View all
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback
                      className={`text-xs text-white ${item.color}`}
                    >
                      {getInitials(item.user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">
                      {item.action}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      By {item.user} · {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* My Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              My Projects
            </h3>
            <Link to="/projects">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                View all projects
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {projects.slice(0, 4).map((project) => {
              const pct = calcCompletionPercent(
                project.story_count ?? 0,
                (project.story_count ?? 0) + 2
              );
              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {project.name}
                      </p>
                      <X className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          project.status === "active"
                            ? "active"
                            : project.status === "on_hold"
                            ? "on_hold"
                            : "planning"
                        }
                        className="text-xs"
                      >
                        {project.status === "active"
                          ? "In Progress"
                          : project.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}