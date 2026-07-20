import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TableToolbar({
  query = "",
  onQueryChange,
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  placeholder = "جستجو...",
  showSearch = true,
  /** Use on dark page backgrounds so meta text stays readable */
  onDark = false,
  className = "",
}) {
  const hasPagination = total > 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showSearch && onQueryChange && (
        <div className="relative w-full">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={placeholder}
            className="h-11 rounded-xl border-slate-200 bg-white pe-4 ps-9 text-slate-900 shadow-sm placeholder:text-slate-400"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
      )}

      {hasPagination && onPageChange && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={cn(
              "fa-num text-center text-sm sm:text-start",
              onDark
                ? "text-slate-600 dark:text-slate-300"
                : "text-slate-500"
            )}
          >
            {formatNumber(total)} مورد · صفحه {formatNumber(page)} از {formatNumber(totalPages)}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className={cn(
                "w-full sm:w-auto",
                onDark &&
                  "border-slate-200 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 dark:hover:text-white disabled:opacity-40"
              )}
            >
              <ChevronRight className="h-4 w-4" />
              قبلی
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className={cn(
                "w-full sm:w-auto",
                onDark &&
                  "border-slate-200 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 dark:hover:text-white disabled:opacity-40"
              )}
            >
              بعدی
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
