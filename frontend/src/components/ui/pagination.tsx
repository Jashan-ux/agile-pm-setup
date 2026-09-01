import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  hasNext,
  hasPrev,
  onPageChange,
}: PaginationProps) {
  if (pages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build page number array with ellipsis
  const getPageNumbers = () => {
    const nums: (number | "...")[] = [];
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }
    nums.push(1);
    if (page > 3) nums.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(pages - 1, page + 1);
      i++
    ) {
      nums.push(i);
    }
    if (page < pages - 2) nums.push("...");
    nums.push(pages);
    return nums;
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-xs text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}