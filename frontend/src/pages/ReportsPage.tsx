import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useJobs, useJobPolling } from "@/hooks/useJobs";
import { projectsApi } from "@/api/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/constants";
import { toast } from "@/hooks/useToast";
import type { Job, JobStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";

// ── Job Status Badge ──────────────────────────────────────────────────────────
function JobStatusBadge({ status }: { status: JobStatus }) {
  const config: Record<
    JobStatus,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    pending: {
      icon: <Clock className="h-3 w-3" />,
      label: "Pending",
      className: "text-muted-foreground border-border",
    },
    processing: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: "Processing",
      className: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    },
    completed: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Completed",
      className: "text-green-400 border-green-500/30 bg-green-500/10",
    },
    failed: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Failed",
      className: "text-destructive border-destructive/30 bg-destructive/10",
    },
    retrying: {
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      label: "Retrying",
      className: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    },
    cancelled: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Cancelled",
      className: "text-muted-foreground border-border",
    },
  };

  const c = config[status];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        c.className
      )}
    >
      {c.icon}
      {c.label}
    </div>
  );
}

// ── Job Row ───────────────────────────────────────────────────────────────────
function JobRow({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  const { data: liveJob } = useJobPolling(
    job.status === "pending" || job.status === "processing" ? job.id : null
  );

  const displayJob = liveJob ?? job;
  const hasResult =
    displayJob.status === "completed" && displayJob.result_data;
  const hasError = displayJob.status === "failed" && displayJob.error_message;

  const JOB_TYPE_LABELS: Record<string, string> = {
    project_report: "Project Report",
    stale_task_scan: "Stale Task Scan",
    story_completion_check: "Story Completion Check",
    bulk_status_update: "Bulk Status Update",
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Row header */}
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={() => (hasResult || hasError) && setExpanded((e) => !e)}
      >
        <JobStatusBadge status={displayJob.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {JOB_TYPE_LABELS[displayJob.job_type] ?? displayJob.job_type}
            </span>
            {displayJob.retry_count > 0 && (
              <span className="text-xs text-yellow-400">
                (retry {displayJob.retry_count}/{displayJob.max_retries})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground font-mono">
              {displayJob.id.slice(0, 8)}...
            </span>
            {displayJob.triggered_by && (
              <span className="text-xs text-muted-foreground">
                by {displayJob.triggered_by}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(displayJob.created_at)}
            </span>
          </div>
        </div>

        {(hasResult || hasError) && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Expanded result */}
      {expanded && hasResult && (
        <div className="border-t border-border bg-secondary/20 p-4">
          <ReportResult result={displayJob.result_data!} />
        </div>
      )}

      {/* Error detail */}
      {expanded && hasError && (
        <div className="border-t border-border bg-destructive/5 p-4">
          <p className="text-xs font-semibold text-destructive mb-1">
            Error Details
          </p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {displayJob.error_message}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Report Result Display ─────────────────────────────────────────────────────
function ReportResult({ result }: { result: Record<string, unknown> }) {
  const [showMarkdown, setShowMarkdown] = useState(false);

  const metrics = result.metrics as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      {/* Metrics grid */}
      {metrics && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Report Metrics
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Total Stories",
                value: metrics.total_stories as number,
              },
              {
                label: "Total Tasks",
                value: metrics.total_tasks as number,
              },
              {
                label: "Completion",
                value: `${metrics.completion_rate_percent}%`,
              },
              {
                label: "Story Points",
                value: `${metrics.completed_story_points}/${metrics.total_story_points}`,
              },
              {
                label: "Est. Hours",
                value: `${metrics.total_estimated_hours}h`,
              },
              {
                label: "Actual Hours",
                value: `${metrics.total_actual_hours}h`,
              },
              {
                label: "Hours Variance",
                value: `${(metrics.hours_variance as number) > 0 ? "+" : ""}${metrics.hours_variance}h`,
              },
              {
                label: "Blocked Tasks",
                value: metrics.blocked_tasks as number,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-card border border-border rounded-lg p-2.5"
              >
                <p className="text-xs text-muted-foreground mb-0.5">
                  {m.label}
                </p>
                <p className="text-base font-bold text-foreground">
                  {String(m.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Markdown toggle */}
      {result.report_markdown && (
        <div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1.5"
            onClick={() => setShowMarkdown((s) => !s)}
          >
            <FileText className="h-3.5 w-3.5" />
            {showMarkdown ? "Hide" : "Show"} Full Report
          </Button>

          {showMarkdown && (
            <ScrollArea className="mt-3 h-80 rounded-lg border border-border">
              <pre className="p-4 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {result.report_markdown as string}
              </pre>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Stale task findings */}
      {result.findings !== undefined && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Findings ({(result.findings as unknown[]).length} stale tasks)
          </p>
          {(result.findings as Array<Record<string, unknown>>).length === 0 ? (
            <p className="text-xs text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              No stale tasks found
            </p>
          ) : (
            <div className="space-y-1.5">
              {(
                result.findings as Array<Record<string, unknown>>
              ).map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs border border-border rounded-md px-3 py-2"
                >
                  <span className="text-foreground font-medium">
                    {f.task_title as string}
                  </span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{f.assignee as string}</span>
                    <span className="text-yellow-400">
                      {f.hours_in_progress as number}h in progress
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Story completion check */}
      {result.finding && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
          {result.finding === "all_tasks_complete" ? (
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
          ) : result.finding === "has_blocked_tasks" ? (
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {result.message as string}
            </p>
            {result.suggestion && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Suggestion: {(result.suggestion as string).replace("_", " ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────────────────────
export function ReportsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isScanTriggering, setIsScanTriggering] = useState(false);

  const { data: projectsData } = useProjects({ page_size: 100 });
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } =
    useJobs({
      page,
      page_size: 10,
      project_id: selectedProjectId || undefined,
    });

  // Live poll the actively triggered job
  const { data: triggeredJob } = useJobPolling(activeJobId);

  // Clear activeJobId when terminal
  if (
    triggeredJob &&
    activeJobId &&
    ["completed", "failed", "cancelled"].includes(triggeredJob.status)
  ) {
    if (triggeredJob.status === "completed") {
      toast.success("Report ready", "Click the job row to view results");
    } else {
      toast.error("Job failed", triggeredJob.error_message ?? "Unknown error");
    }
    setActiveJobId(null);
    refetchJobs();
  }

  const projects = projectsData?.items ?? [];
  const jobs = jobsData?.items ?? [];

  const handleGenerateReport = async () => {
    if (!selectedProjectId) {
      toast.warning("Select a project", "Please select a project first");
      return;
    }
    setIsTriggering(true);
    try {
      const job = await projectsApi.generateReport(
        selectedProjectId,
        "user"
      );
      setActiveJobId(job.id);
      toast.info(
        "Report queued",
        "Generating report in background..."
      );
      refetchJobs();
    } catch (e: any) {
      toast.error("Failed to trigger report", e.message);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleStaleScan = async () => {
    setIsScanTriggering(true);
    try {
      const { data } = await import("@/api/client").then(
        ({ apiClient }) =>
          apiClient.post("/reports/maintenance/scan-stale-tasks", {
            triggered_by: "user",
          })
      );
      setActiveJobId(data.id);
      toast.info("Scan started", "Scanning for stale tasks...");
      refetchJobs();
    } catch (e: any) {
      toast.error("Scan failed", e.message);
    } finally {
      setIsScanTriggering(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Generate reports and monitor background jobs.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetchJobs()}
          >
            <RefreshCw className={`h-4 w-4 ${jobsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Trigger Panel */}
        <div className="grid grid-cols-2 gap-4">
          {/* Project Report */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Project Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Generate a comprehensive markdown report with metrics,
                task breakdown, and time estimates.
              </p>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={handleGenerateReport}
                disabled={isTriggering || !selectedProjectId}
              >
                {isTriggering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isTriggering ? "Queuing..." : "Generate Report"}
              </Button>
            </CardContent>
          </Card>

          {/* Stale Task Scan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Stale Task Scan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Scan all active tasks for items stuck in{" "}
                <span className="text-foreground font-medium">
                  In Progress
                </span>{" "}
                for more than 48 hours. Also runs automatically every hour.
              </p>
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2.5">
                <span className="text-foreground font-medium">
                  Scheduled:
                </span>{" "}
                Every hour at :00 via Celery Beat
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={handleStaleScan}
                disabled={isScanTriggering}
              >
                {isScanTriggering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isScanTriggering ? "Starting..." : "Run Now"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Job Indicator */}
        {activeJobId && triggeredJob && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">
                Job running
              </p>
              <p className="text-xs text-muted-foreground">
                {triggeredJob.job_type.replace("_", " ")} ·{" "}
                {triggeredJob.id.slice(0, 8)}... · Status:{" "}
                {triggeredJob.status}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setActiveJobId(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Jobs List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Job History
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Auto-refreshes every 5s
              </span>
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          {jobsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg border border-border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 rounded-xl border border-border border-dashed">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No jobs yet. Generate a report to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {jobsData && (
            <Pagination
              page={jobsData.page}
              pages={jobsData.pages}
              total={jobsData.total}
              pageSize={jobsData.page_size}
              hasNext={jobsData.has_next}
              hasPrev={jobsData.has_prev}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}