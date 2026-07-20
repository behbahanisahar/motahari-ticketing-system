import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef(({ className, containerClassName, ...props }, ref) => (
  <div
    className={cn(
      "relative w-full overflow-auto rounded-[1.25rem] border border-slate-200 bg-white shadow-soft",
      containerClassName
    )}
  >
    <table ref={ref} className={cn("w-full caption-bottom text-sm text-slate-800", className)} {...props} />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-slate-50 [&_tr]:border-b [&_tr]:border-slate-200", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn("border-b border-slate-100 bg-white transition-colors hover:bg-slate-50", className)}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-start align-middle text-xs font-semibold tracking-wide text-slate-600",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-4 py-3.5 align-middle text-slate-800", className)} {...props} />
));
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
