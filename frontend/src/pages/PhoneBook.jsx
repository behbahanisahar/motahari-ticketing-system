import { useMemo, useState } from "react";
import { Phone, Search, Copy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PHONEBOOK_CATEGORIES, PHONEBOOK_ENTRIES } from "@/lib/phonebook";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function normalizeQuery(value) {
  return toEnglishDigits(String(value || ""))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function matchesEntry(entry, query) {
  if (!query) return true;
  const name = entry.name.toLowerCase();
  const category = entry.category.toLowerCase();
  const ext = toEnglishDigits(entry.ext);
  const q = query;
  return name.includes(q) || category.includes(q) || ext.includes(q.replace(/\s/g, ""));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`شماره ${toPersianDigits(text)} کپی شد`);
  } catch {
    toast.error("کپی انجام نشد");
  }
}

export default function PhoneBook() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const normalizedQuery = normalizeQuery(query);

  const filtered = useMemo(() => {
    return PHONEBOOK_ENTRIES.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      return matchesEntry(entry, normalizedQuery);
    });
  }, [category, normalizedQuery]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const entry of filtered) {
      if (!map.has(entry.category)) map.set(entry.category, []);
      map.get(entry.category).push(entry);
    }
    return PHONEBOOK_CATEGORIES.map((cat) => ({
      category: cat,
      items: map.get(cat) || [],
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="دفترچه تلفن داخلی"
        description="شماره‌های داخلی مرکز. جستجو بر اساس نام واحد یا شماره."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو: مثلاً اورژانس یا ۲۳۲"
              className="fa-num pe-10"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                category === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              همه
            </button>
            {PHONEBOOK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <p className="fa-num text-sm text-muted-foreground">
            {toPersianDigits(filtered.length)} مورد
            {normalizedQuery ? ` برای «${query.trim()}»` : ""}
          </p>
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            موردی پیدا نشد.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(({ category: cat, items }) => (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-primary" />
                  {cat}
                  <Badge variant="secondary" className="fa-num ms-auto font-normal">
                    {toPersianDigits(items.length)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border/60">
                  {items.map((entry, idx) => (
                    <li
                      key={`${entry.category}-${entry.name}-${entry.ext}-${idx}`}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{entry.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="fa-num text-base font-bold tabular-nums text-primary">
                          {toPersianDigits(entry.ext)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyText(entry.ext)}
                          title="کپی شماره"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
