import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { UserCheck, UserX, ShieldCheck } from "lucide-react";

interface PendingUser { id: string; email: string; created_at: string; }
interface AdminUser { user_id: string; email: string; role: string; granted_at: string; }

const AdminsManager = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useAdminAuth();
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  useEffect(() => {
    if (!loading && !isSuperAdmin) navigate("/admin");
  }, [loading, isSuperAdmin, navigate]);

  const load = async () => {
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.rpc("get_pending_users"),
      supabase.rpc("get_admin_users"),
    ]);
    if (p) setPending(p as PendingUser[]);
    if (a) setAdmins(a as AdminUser[]);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  const grant = async (userId: string, role: "admin" | "super_admin") => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return; }
    toast.success("已授权");
    load();
  };

  const revoke = async (userId: string) => {
    if (!confirm("确定撤销该管理员权限？")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("已撤销");
    load();
  };

  if (loading) return null;

  return (
    <AdminLayout>
      <div>
        <h1 className="font-display text-2xl font-bold">管理员管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">审核待授权用户，管理现有管理员权限</p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> 待授权用户
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-4">暂无待授权用户</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邮箱</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => grant(u.id, "admin")}>
                        授权为管理员
                      </Button>
                      <Button size="sm" onClick={() => grant(u.id, "super_admin")}>
                        <ShieldCheck className="h-4 w-4 mr-1" /> 授权为超级管理员
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> 现有管理员
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>授权时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.user_id}>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>
                    <Badge variant={a.role === "super_admin" ? "default" : "secondary"}>
                      {a.role === "super_admin" ? "超级管理员" : "管理员"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(a.granted_at).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => revoke(a.user_id)}>
                      <UserX className="h-4 w-4 text-destructive" />
                    </Button>
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

export default AdminsManager;
