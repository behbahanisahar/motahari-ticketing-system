import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

/**
 * Responsive data table: card list on mobile, classic table on md+.
 *
 * columns: { key, label, render(row), primary?, hideOnMobile?, className?, headClassName? }
 */
export function ResponsiveTable({
  columns,
  rows = [],
  rowKey,
  emptyMessage = "موردی یافت نشد.",
  containerClassName,
  mobileActions,
  fixedLayout = false,
  tableMinWidth,
}) {
  const primaryCols = columns.filter((c) => c.primary);
  const detailCols = columns.filter((c) => !c.primary && !c.hideOnMobile);

  if (rows.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-col gap-2 md:hidden", containerClassName)}>
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            className="rounded-[1.25rem] border border-slate-200 bg-white p-4"
          >
            {(primaryCols.length > 0 ? primaryCols : columns.slice(0, 2)).map((col) => (
              <div key={col.key} className="mb-2 last:mb-0">
                {col.primary ? (
                  <div className={cn("text-slate-900", col.className)}>{col.render(row)}</div>
                ) : (
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="shrink-0 text-slate-500">{col.label}</span>
                    <span className={cn("text-end font-medium text-slate-800", col.className)}>
                      {col.render(row)}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {detailCols.length > 0 && (
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
                {detailCols.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="shrink-0 text-xs text-slate-500">{col.label}</span>
                    <span className={cn("text-end text-slate-800", col.className)}>{col.render(row)}</span>
                  </div>
                ))}
              </div>
            )}

            {mobileActions && (
              <div className="mt-3 border-t border-slate-100 pt-3">{mobileActions(row)}</div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <Table
          containerClassName={cn(
            "overflow-x-auto rounded-[1.25rem] border-slate-200 bg-white shadow-soft",
            containerClassName
          )}
          className={cn(tableMinWidth, fixedLayout && "table-fixed")}
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headClassName}>{col.label}</TableHead>
              ))}
              {mobileActions && <TableHead className="w-20 whitespace-nowrap px-2">عملیات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={cn("text-slate-800", col.className)}>
                    {col.render(row)}
                  </TableCell>
                ))}
                {mobileActions && (
                  <TableCell className="whitespace-nowrap px-2">{mobileActions(row)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
