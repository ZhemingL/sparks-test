import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ServiceStat {
  id: string;
  name: string;
  total: number;
  rejected: number;
  paid: number;
}

const Analytics = () => {
  const [serviceStats, setServiceStats] = useState<ServiceStat[]>([]);
  const [overallRejection, setOverallRejection] = useState(0);
  const [answerLog, setAnswerLog] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: services } = await supabase.from("services").select("id, name");
      const { data: regs } = await supabase.from("registrations").select("service_id, status");

      const stats: ServiceStat[] = (services ?? []).map((s) => {
        const list = (regs ?? []).filter((r) => r.service_id === s.id);
        return {
          id: s.id,
          name: s.name,
          total: list.length,
          rejected: list.filter((r) => r.status === "rejected").length,
          paid: list.filter((r) => r.status === "paid").length,
        };
      });
      setServiceStats(stats);

      const total = (regs ?? []).length;
      const rej = (regs ?? []).filter((r) => r.status === "rejected").length;
      setOverallRejection(total ? Math.round((rej / total) * 100) : 0);

      const { data: log } = await supabase
        .from("answers")
        .select("created_at, answer_value, free_text, questions(text), registrations(user_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      setAnswerLog((log as any) ?? []);
    })();
  }, []);

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold">数据分析</h1>
      <p className="mt-1 text-sm text-muted-foreground">报名统计与问卷答卷流水</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">总服务数</p>
            <p className="mt-1 text-2xl font-bold">{serviceStats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">总报名数</p>
            <p className="mt-1 text-2xl font-bold">{serviceStats.reduce((s, x) => s + x.total, 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">总体拒绝率</p>
            <p className="mt-1 text-2xl font-bold">{overallRejection}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">各服务报名数</CardTitle></CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">服务统计明细</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>服务</TableHead>
                <TableHead>报名总数</TableHead>
                <TableHead>已付款</TableHead>
                <TableHead>已拒绝</TableHead>
                <TableHead>拒绝率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceStats.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.total}</TableCell>
                  <TableCell>{s.paid}</TableCell>
                  <TableCell>{s.rejected}</TableCell>
                  <TableCell>{s.total ? Math.round((s.rejected / s.total) * 100) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">最新答卷流水（50 条）</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>问题</TableHead>
                <TableHead>答案</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {answerLog.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell>{a.registrations?.user_name ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{a.questions?.text ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {a.answer_value ?? a.free_text ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Analytics;
