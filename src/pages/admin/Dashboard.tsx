import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  paid: number;
  today: number;
  byService: { name: string; count: number }[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, status, created_at, services(name)");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const list = regs ?? [];
      const byServiceMap = new Map<string, number>();
      list.forEach((r: any) => {
        const n = r.services?.name ?? "未知";
        byServiceMap.set(n, (byServiceMap.get(n) ?? 0) + 1);
      });
      setStats({
        total: list.length,
        pending: list.filter((r: any) => r.status === "pending").length,
        approved: list.filter((r: any) => r.status === "approved").length,
        rejected: list.filter((r: any) => r.status === "rejected").length,
        paid: list.filter((r: any) => r.status === "paid").length,
        today: list.filter((r: any) => new Date(r.created_at) >= today).length,
        byService: Array.from(byServiceMap.entries()).map(([name, count]) => ({ name, count })),
      });
    })();
  }, []);

  const cards = stats
    ? [
        { label: "总报名数", value: stats.total },
        { label: "今日新增", value: stats.today },
        { label: "待处理", value: stats.pending },
        { label: "已通过", value: stats.approved },
        { label: "已付款", value: stats.paid },
        { label: "已拒绝", value: stats.rejected },
      ]
    : [];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold">概览</h1>
      <p className="mt-1 text-sm text-muted-foreground">SPARKS 报名与运营数据总览</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">各服务报名分布</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 320 }}>
          {stats && stats.byService.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byService}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Dashboard;
