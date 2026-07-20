import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, Send, Monitor } from "lucide-react";
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

export default function NewTicket() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [computerName, setComputerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const navigate = useNavigate();

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setPriority("medium");
    setComputerName("");
    setCreated(null);
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
      const ticket = await api.createTicket({
        subject,
        description,
        priority,
        computerName: computerName.trim(),
      });
      setCreated(ticket);
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
