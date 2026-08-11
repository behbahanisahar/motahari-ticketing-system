import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, Send, Monitor, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { PriorityPicker } from "@/components/PriorityPicker";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function NewTicket() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [computerName, setComputerName] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const navigate = useNavigate();

  const clearScreenshot = () => {
    setScreenshot(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  };

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setPriority("medium");
    setComputerName("");
    clearScreenshot();
    setCreated(null);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("فقط تصویر JPEG، PNG، WebP یا GIF مجاز است.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      toast.error("حجم تصویر حداکثر ۵ مگابایت است.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setScreenshot(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !computerName.trim()) {
      toast.error("لطفاً عنوان، توضیحات و نام کامپیوتر را کامل کنید.");
      return;
    }
    if (!user?.department) {
      toast.error("واحد سازمانی شما مشخص نیست. با مدیر تماس بگیرید.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("subject", subject.trim());
      form.append("description", description.trim());
      form.append("priority", priority);
      form.append("computerName", computerName.trim());
      if (screenshot) form.append("screenshot", screenshot);

      const ticket = await api.createTicket(form);
      setCreated(ticket);
      clearScreenshot();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Card className="text-center shadow-card">
          <CardContent className="empty-state py-14">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-low/10">
              <CheckCircle2 className="h-9 w-9 text-low" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">تیکت شما ثبت شد</h2>
              <p className="mt-2 text-muted-foreground">
                شماره پیگیری:{" "}
                <span className="fa-num font-bold text-foreground">{created.ticket_number}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                همکاران پشتیبانی به‌زودی درخواست شما را بررسی می‌کنند.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={resetForm}>ثبت تیکت دیگر</Button>
              <Button variant="outline" onClick={() => navigate("/mine")}>
                مشاهده تیکت‌های من
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="ثبت درخواست پشتیبانی"
        description="مشکل خود را توضیح دهید؛ تیم فناوری اطلاعات پیگیری می‌کند."
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {user?.department && (
              <div className="flex items-center gap-2 rounded-[1.25rem] border border-white/60 bg-white/50 px-4 py-3 text-sm backdrop-blur-sm">
                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">واحد سازمانی:</span>
                <span className="font-semibold">{user.department}</span>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subject">موضوع مشکل</Label>
                <Input
                  id="subject"
                  placeholder="مثلاً: چاپگر کار نمی‌کند"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="computerName" className="flex items-center gap-1.5">
                  <Monitor className="h-4 w-4" />
                  نام کامپیوتر
                </Label>
                <Input
                  id="computerName"
                  placeholder="مثلاً: PC-SARA-01 (از تنظیمات ویندوز)"
                  value={computerName}
                  onChange={(e) => setComputerName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">توضیح کامل‌تر</Label>
              <Textarea
                id="description"
                placeholder="لطفاً بنویسید دقیقاً چه اتفاقی افتاده و از چه زمانی..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[140px]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="screenshot" className="flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4" />
                تصویر ضمیمه (اختیاری)
              </Label>
              <p className="text-xs text-muted-foreground">یک تصویر، حداکثر ۵ مگابایت — JPEG، PNG، WebP یا GIF</p>
              {!screenshot ? (
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleScreenshotChange}
                  className="cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                />
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted/30">
                  <img src={previewUrl} alt="پیش‌نمایش تصویر" className="max-h-56 w-full object-contain" />
                  <button
                    type="button"
                    onClick={clearScreenshot}
                    className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    حذف
                  </button>
                  <p className="truncate border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
                    {screenshot.name}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>این مشکل چقدر فوری است؟</Label>
              <PriorityPicker value={priority} onChange={setPriority} />
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
              <Send className="h-5 w-5" />
              {submitting ? "در حال ثبت..." : "ثبت تیکت"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
