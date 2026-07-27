import { BookOpen, Download, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const GUIDE_URL = "/user-guide.pdf";

export default function UserGuide() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="راهنمای استفاده"
        description="آموزش ورود و کار با سامانه تیک‌یار برای کاربران."
      />

      <div className="flex flex-wrap items-center gap-2">
        <a href={GUIDE_URL} target="_blank" rel="noreferrer">
          <Button type="button" variant="outline" className="rounded-xl">
            <ExternalLink className="h-4 w-4" />
            باز کردن در تب جدید
          </Button>
        </a>
        <a href={GUIDE_URL} download="راهنمای-تیک‌یار.pdf">
          <Button type="button" variant="outline" className="rounded-xl">
            <Download className="h-4 w-4" />
            دانلود PDF
          </Button>
        </a>
      </div>

      <section className="overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/90 shadow-soft backdrop-blur-xl dark:border-white/15">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">نمایش راهنما</p>
        </div>
        <div className="bg-slate-100/80 p-2 sm:p-3">
          <iframe
            title="راهنمای استفاده از سامانه"
            src={`${GUIDE_URL}#toolbar=1&navpanes=0`}
            className="h-[min(78vh,820px)] w-full rounded-xl border border-slate-200 bg-white"
          />
        </div>
      </section>
    </div>
  );
}
