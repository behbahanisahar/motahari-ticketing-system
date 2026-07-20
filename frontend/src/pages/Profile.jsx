import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || "");
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("نام نمایشی نمی‌تواند خالی باشد.");
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile(displayName.trim());
      await refresh();
      toast.success("نام نمایشی به‌روزرسانی شد.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="پروفایل من"
        description="نام کاربری شما ثابت است؛ می‌توانید نام نمایشی را تغییر دهید."
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">نام کاربری (ثابت)</Label>
              <Input id="username" value={user?.username || ""} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">نام نمایشی</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثلاً: سحر بهبهانی"
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
