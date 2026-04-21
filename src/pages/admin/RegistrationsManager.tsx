import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "pending" | "approved" | "rejected" | "paid" | "all";

interface Reg {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_gender: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  service_id: string | null;
  services: { name: string } | null;
}

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};
const statusLabel: Record<string, string> = {
  pending: "待处理",
  approved: "已通过",
  paid: "已付款",
  rejected: "已拒绝",
};

const RegistrationsManager = () => {
  const [regs, setRegs] = useState<Reg[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Reg | null>(null);
  const [details, setDetails] = useState<any[]>([]);

  const load = async () => {
    let query = supabase
      .from("registrations")
      .select("*, services(name)")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (serviceFilter !== "all") query = query.eq("service_id", serviceFilter);
    const { data } = await query;
    setRegs((data as any) ?? []);
  };

  useEffect(() => {
    supabase.from("services").select("id, name").then(({ data }) => setServices((data as any) ?? []));
  }, []);
  useEffect(() => {
    load();
  }, [statusFilter, serviceFilter]);

  const openDetails = async (r: Reg) => {
    setSelected(r);
    const { data } = await supabase
      .from("answers")
      .select("*, questions(text, type)")
      .eq("registration_id", r.id);
    setDetails((data as any) ?? []);
  };

  const updateStatus = async (id: string, s: string) => {
    const { error } = await supabase.from("registrations").update({ status: s as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("已更新");
    load();
    if (selected?.id === id) setSelected({ ...selected, status: s });
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold">报名管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">查看与管理所有报名记录</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="approved">已通过</SelectItem>
            <SelectItem value="paid">已付款</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-60"><SelectValue placeholder="服务" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部服务</SelectItem>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>联系方式</TableHead>
                <TableHead>服务</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regs.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetails(r)}>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell className="text-sm">
                    <div>{r.user_email}</div>
                    <div className="text-muted-foreground">{r.user_phone}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.services?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={statusColor[r.status] ?? ""}>{statusLabel[r.status] ?? r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">待处理</SelectItem>
                        <SelectItem value="approved">已通过</SelectItem>
                        <SelectItem value="paid">已付款</SelectItem>
                        <SelectItem value="rejected">已拒绝</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {regs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无记录</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>报名详情</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">姓名：</span>{selected.user_name}</p>
                  <p><span className="text-muted-foreground">性别：</span>{selected.user_gender ?? "—"}</p>
                  <p><span className="text-muted-foreground">邮箱：</span>{selected.user_email}</p>
                  <p><span className="text-muted-foreground">手机：</span>{selected.user_phone}</p>
                  <p><span className="text-muted-foreground">服务：</span>{selected.services?.name ?? "—"}</p>
                  <p><span className="text-muted-foreground">状态：</span>{statusLabel[selected.status] ?? selected.status}</p>
                  {selected.rejection_reason && (
                    <p className="text-destructive"><span className="text-muted-foreground">拒绝原因：</span>{selected.rejection_reason}</p>
                  )}
                </CardContent>
              </Card>

              <div>
                <h3 className="font-medium mb-2">问卷答案</h3>
                {details.length === 0 ? (
                  <p className="text-sm text-muted-foreground">无答案记录</p>
                ) : (
                  <div className="space-y-2">
                    {details.map((d) => (
                      <Card key={d.id}>
                        <CardContent className="p-3 text-sm space-y-1">
                          <p className="font-medium">{d.questions?.text ?? "（已删除问题）"}</p>
                          <p className="text-foreground/80">
                            {d.answer_value ?? (d.answer_options ?? []).join("、") ?? "—"}
                          </p>
                          {d.free_text && <p className="text-muted-foreground text-xs">补充：{d.free_text}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default RegistrationsManager;
