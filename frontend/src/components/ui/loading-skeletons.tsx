import { Skeleton } from "./skeleton";

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? "w-48" : "w-20"}`} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  );
}

export function KanbanCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2.5">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="min-w-[240px] space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-6 rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <KanbanCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 h-52">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="flex gap-6">
            <Skeleton className="h-36 w-36 rounded-full" />
            <div className="space-y-2 flex-1 pt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 h-52">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}