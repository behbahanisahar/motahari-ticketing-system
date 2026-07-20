import { useEffect, useMemo, useState } from "react";
import { Building2, Check, KeyRound, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useClientTable } from "@/hooks/useClientTable";
import { useAppDialog } from "@/hooks/useAppDialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const { confirm, prompt } = useAppDialog();
  const [tab, setTab] = useState("users");
  const [usersResult, setUsersResult] = useState(null);
  const [teams, setTeams] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [form, setForm] = useState({ displayName: "", username: "", password: "", department: "" });
  const [newTeam, setNewTeam] = useState("");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserForm, setEditingUserForm] = useState({ displayName: "", department: "" });
  const [submitting, setSubmitting] = useState(false);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name, "fa")),
    [teams]
  );

  const teamsTable = useClientTable(sortedTeams, {
    pageSize: PAGE_SIZE,
    searchKeys: ["name"],
  });

  const loadUsers = () =>
    api
      .users({ page: userPage, limit: PAGE_SIZE, q: userQuery })
      .then(setUsersResult)
      .catch((err) => toast.error(err.message));

  const loadTeams = () => api.teams().then(setTeams).catch((err) => toast.error(err.message));

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadUsers, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage, userQuery]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim() || !form.username.trim() || !form.password || !form.department) {
      toast.error("همه فیلدها الزامی است.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createUser({
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        password: form.password,
        department: form.department,
      });
      toast.success("کاربر جدید ایجاد شد.");
      setForm({ displayName: "", username: "", password: "", department: "" });
      setUserPage(1);
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeam.trim()) {
      toast.error("نام واحد الزامی است.");
      return;
    }
    try {
      await api.createTeam(newTeam.trim());
      toast.success("واحد سازمانی اضافه شد.");
      setNewTeam("");
      loadTeams();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteTeam = async (team) => {
    const ok = await confirm({
      title: "حذف واحد",
      message: `واحد «${team.name}» حذف شود؟`,
      confirmLabel: "حذف",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.deleteTeam(team.id);
      toast.success("واحد حذف شد.");
      if (editingTeamId === team.id) {
        setEditingTeamId(null);
        setEditingTeamName("");
      }
      loadTeams();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const startEditTeam = (team) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
  };

  const cancelEditTeam = () => {
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const handleSaveTeam = async (team) => {
    const name = editingTeamName.trim();
    if (!name) {
      toast.error("نام واحد الزامی است.");
      return;
    }
    if (name === team.name) {
      cancelEditTeam();
      return;
    }
    try {
      await api.updateTeam(team.id, name);
      toast.success("نام واحد به‌روزرسانی شد.");
      cancelEditTeam();
      loadTeams();
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const teamActions = (team) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {editingTeamId === team.id ? (
        <>
          <Button type="button" size="sm" onClick={() => handleSaveTeam(team)}>
            <Check className="h-4 w-4" />
            ذخیره
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={cancelEditTeam}>
            <X className="h-4 w-4" />
            انصراف
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => startEditTeam(team)}>
            <Pencil className="h-4 w-4" />
            ویرایش
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteTeam(team)}>
            <Trash2 className="h-4 w-4" />
            حذف
          </Button>
        </>
      )}
    </div>
  );

  const toggleActive = async (user) => {
    try {
      await api.updateUser(user.id, { isActive: !user.is_active });
      toast.success(user.is_active ? "کاربر غیرفعال شد." : "کاربر فعال شد.");
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const startEditUser = (user) => {
    setEditingUserId(user.id);
    setEditingUserForm({
      displayName: user.display_name,
      department: user.department || "",
    });
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditingUserForm({ displayName: "", department: "" });
  };

  const handleSaveUser = async (user) => {
    const displayName = editingUserForm.displayName.trim();
    const department = editingUserForm.department.trim();
    if (!displayName) {
      toast.error("نام کامل الزامی است.");
      return;
    }
    if (!department) {
      toast.error("واحد سازمانی الزامی است.");
      return;
    }
    if (displayName === user.display_name && department === user.department) {
      cancelEditUser();
      return;
    }
    try {
      await api.updateUser(user.id, { displayName, department });
      toast.success("اطلاعات کاربر به‌روزرسانی شد.");
      cancelEditUser();
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleResetPassword = async (user) => {
    const password = await prompt({
      title: "بازنشانی رمز عبور",
      message: `رمز عبور جدید برای «${user.display_name}» را وارد کنید.`,
      placeholder: "حداقل ۴ کاراکتر",
      inputType: "password",
      confirmLabel: "ذخیره رمز",
    });
    if (!password) return;
    if (password.length < 4) {
      toast.error("رمز عبور باید حداقل ۴ کاراکتر باشد.");
      return;
    }
    try {
      await api.updateUser(user.id, { password });
      toast.success("رمز عبور به‌روزرسانی شد.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const userActions = (user) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {editingUserId === user.id ? (
        <>
          <Button type="button" size="sm" onClick={() => handleSaveUser(user)}>
            <Check className="h-4 w-4" />
            ذخیره
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={cancelEditUser}>
            <X className="h-4 w-4" />
            انصراف
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => startEditUser(user)}>
            <Pencil className="h-4 w-4" />
            ویرایش
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleResetPassword(user)}>
            <KeyRound className="h-4 w-4" />
            بازنشانی رمز
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => toggleActive(user)}>
            {user.is_active ? "غیرفعال کردن" : "فعال کردن"}
          </Button>
        </>
      )}
    </div>
  );

  const tabClass = (key) =>
    cn(
      "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
      tab === key
        ? "bg-gradient-to-l from-primary to-slate-800 text-primary-foreground shadow-md shadow-primary/20"
        : "bg-white/70 text-muted-foreground hover:bg-white hover:text-foreground"
    );

  const users = usersResult?.items ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مدیریت سامانه"
        description="واحدهای سازمانی و کاربران را از اینجا مدیریت کنید."
      />

      <div className="mb-1 flex gap-2 overflow-x-auto rounded-[1.25rem] border border-white/70 bg-white/55 p-1.5 backdrop-blur-xl">
        <button type="button" className={cn(tabClass("users"), "shrink-0")} onClick={() => setTab("users")}>
          کاربران
        </button>
        <button type="button" className={cn(tabClass("departments"), "shrink-0")} onClick={() => setTab("departments")}>
          واحدهای سازمانی
        </button>
      </div>

      {tab === "departments" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">افزودن واحد سازمانی</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam} className="flex flex-wrap gap-3">
                <Input
                  className="max-w-sm flex-1"
                  placeholder="مثلاً: فروش"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  required
                />
                <Button type="submit">
                  <Building2 className="h-4 w-4" />
                  افزودن واحد
                </Button>
              </form>
            </CardContent>
          </Card>

          <TableToolbar
            query={teamsTable.query}
            onQueryChange={teamsTable.setQuery}
            page={teamsTable.page}
            totalPages={teamsTable.totalPages}
            total={teamsTable.total}
            onPageChange={teamsTable.setPage}
            placeholder="جستجو در نام واحد..."
            onDark
          />

          <ResponsiveTable
            rowKey={(t) => t.id}
            rows={teamsTable.rows}
            emptyMessage={teamsTable.query ? "واحدی با این جستجو یافت نشد." : "هنوز واحدی تعریف نشده است."}
            columns={[
              {
                key: "name",
                label: "نام واحد",
                primary: true,
                render: (t) =>
                  editingTeamId === t.id ? (
                    <Input
                      value={editingTeamName}
                      onChange={(e) => setEditingTeamName(e.target.value)}
                      className="max-w-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveTeam(t);
                        }
                        if (e.key === "Escape") cancelEditTeam();
                      }}
                    />
                  ) : (
                    <span className="font-bold">{t.name}</span>
                  ),
              },
            ]}
            mobileActions={teamActions}
          />
        </>
      )}

      {tab === "users" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ایجاد کاربر جدید</CardTitle>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  ابتدا از تب «واحدهای سازمانی» حداقل یک واحد تعریف کنید.
                </p>
              ) : (
                <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="displayName">نام کامل</Label>
                    <Input
                      id="displayName"
                      value={form.displayName}
                      onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="username">نام کاربری</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="password">رمز عبور</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="department">واحد سازمانی</Label>
                    <Select
                      value={form.department}
                      onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="انتخاب واحد" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedTeams.map((t) => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={submitting}>
                      <UserPlus className="h-4 w-4" />
                      {submitting ? "در حال ایجاد..." : "ایجاد کاربر"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <TableToolbar
            query={userQuery}
            onQueryChange={(v) => {
              setUserPage(1);
              setUserQuery(v);
            }}
            page={usersResult?.page ?? 1}
            totalPages={usersResult?.totalPages ?? 1}
            total={usersResult?.total ?? 0}
            onPageChange={setUserPage}
            placeholder="جستجو در نام، نام کاربری یا واحد..."
            onDark
          />

          <ResponsiveTable
            rowKey={(u) => u.id}
            rows={users ?? []}
            emptyMessage={userQuery ? "کاربری با این جستجو یافت نشد." : "هنوز کاربری ایجاد نشده است."}
            columns={[
              {
                key: "name",
                label: "نام کامل",
                primary: true,
                render: (u) =>
                  editingUserId === u.id ? (
                    <Input
                      value={editingUserForm.displayName}
                      onChange={(e) =>
                        setEditingUserForm((f) => ({ ...f, displayName: e.target.value }))
                      }
                      className="max-w-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveUser(u);
                        }
                        if (e.key === "Escape") cancelEditUser();
                      }}
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{u.display_name}</span>
                  ),
              },
              {
                key: "status",
                label: "وضعیت",
                primary: true,
                render: (u) => (
                  <span className={u.is_active ? "font-semibold text-emerald-600" : "font-medium text-slate-500"}>
                    {u.is_active ? "فعال" : "غیرفعال"}
                  </span>
                ),
              },
              {
                key: "username",
                label: "نام کاربری",
                className: "text-slate-700",
                render: (u) => u.username,
              },
              {
                key: "department",
                label: "واحد سازمانی",
                className: "text-slate-700",
                render: (u) =>
                  editingUserId === u.id ? (
                    <Select
                      value={editingUserForm.department}
                      onValueChange={(v) => setEditingUserForm((f) => ({ ...f, department: v }))}
                    >
                      <SelectTrigger className="h-9 max-w-[10rem]">
                        <SelectValue placeholder="انتخاب واحد" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedTeams.map((t) => (
                          <SelectItem key={t.id} value={t.name}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    u.department
                  ),
              },
            ]}
            mobileActions={userActions}
          />
        </>
      )}
    </div>
  );
}
