import { useEffect, useMemo, useState } from "react";

export function useClientTable(items, { searchKeys = [], pageSize = 10 } = {}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) =>
      searchKeys.some((key) => {
        const value = typeof key === "function" ? key(item) : item[key];
        return String(value ?? "")
          .toLowerCase()
          .includes(q);
      })
    );
  }, [items, query, searchKeys]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [query, items]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    query,
    setQuery,
    page: safePage,
    setPage,
    rows,
    total,
    totalPages,
    pageSize,
    isEmpty: items !== null && items !== undefined && total === 0,
  };
}
