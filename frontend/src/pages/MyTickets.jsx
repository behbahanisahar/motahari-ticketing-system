import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadges";
import { ticketRequesterPriority, ticketStatus } from "@/lib/constants";
import { formatDateFa, formatNumber, toPersianDigits } from "@/lib/format";
import { api } from "@/lib/api";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function MyTickets() {
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      api
        .myTickets({ page, limit: PAGE_SIZE, q: query })
        .then(setResult)
        .catch((err) => toast.error(err.message));
    }, 250);
    return () => clearTimeout(timeout);
  }, [page, query]);

  if (result === null) {
    return <p className="py-10 text-center text-muted-foreground">در حال بارگذاری...</p>;
  }

  const tickets = result.items;
  const isEmpty = result.total === 0 && !query;

  if (isEmpty) {
    return (
      <>
        <PageHeader title="تیکت‌های من" description="درخواست‌های پشتیبانی شما" />
        <Card>
          <CardContent className="empty-state">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold">هنوز تیکتی ثبت نکرده‌اید</p>
              <p className="mt-1 text-sm text-muted-foreground">اولین درخواست پشتیبانی خود را ثبت کنید.</p>
            </div>
            <Link to="/new">
              <Button type="button">
                <Plus className="h-4 w-4" />
                ثبت اولین تیکت
              </Button>
            </Link>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="تیکت‌های من"
        description={`${formatNumber(result.total)} درخواست ثبت‌شده`}
        action={
          <Link to="/new">
            <Button size="sm" type="button" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              تیکت جدید
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <TableToolbar
            query={query}
            onQueryChange={(v) => {
              setPage(1);
              setQuery(v);
            }}
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            onPageChange={setPage}
            placeholder="جستجو در شماره، موضوع یا نام کامپیوتر..."
          />
        </CardContent>
      </Card>

      <ResponsiveTable
        rowKey={(t) => t.id}
        rows={tickets}
        emptyMessage="تیکتی با این جستجو یافت نشد."
        columns={[
          {
            key: "number",
            label: "شماره",
            primary: true,
            render: (t) => (
              <Link to={`/tickets/${t.id}`} className="fa-num font-bold text-primary hover:underline">
                {toPersianDigits(t.ticket_number)}
              </Link>
            ),
          },
          {
            key: "subject",
            label: "موضوع",
            primary: true,
            render: (t) => (
              <Link to={`/tickets/${t.id}`} className="font-semibold hover:underline">{t.subject}</Link>
            ),
          },
          {
            key: "badges",
            label: "وضعیت",
            primary: true,
            render: (t) => (
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={ticketStatus(t)} />
                <PriorityBadge value={ticketRequesterPriority(t)} />
              </div>
            ),
          },
          {
            key: "status",
            label: "وضعیت",
            hideOnMobile: true,
            render: (t) => <StatusBadge value={ticketStatus(t)} />,
          },
          {
            key: "priority",
            label: "فوریت",
            hideOnMobile: true,
            render: (t) => <PriorityBadge value={ticketRequesterPriority(t)} />,
          },
          {
            key: "date",
            label: "تاریخ",
            className: "fa-num text-muted-foreground",
            render: (t) => formatDateFa(t.created_at, { year: "numeric", month: "long", day: "numeric" }),
          },
        ]}
      />
    </div>
  );
}
