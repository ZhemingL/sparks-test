import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ClipboardList, BarChart3, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const navItems = [
  { to: "/admin", label: "概览", icon: LayoutDashboard, end: true },
  { to: "/admin/services", label: "服务管理", icon: Package },
  { to: "/admin/registrations", label: "报名管理", icon: ClipboardList },
  { to: "/admin/analytics", label: "数据分析", icon: BarChart3 },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchPending = async () => {
      const { data } = await supabase.rpc("get_pending_users");
      setPendingCount(data?.length ?? 0);
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60000);
    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="w-60 border-r bg-background flex flex-col">
        <div className="border-b p-5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-display font-bold">SPARKS</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSuperAdmin ? "超级管理员" : "管理后台"}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          {isSuperAdmin && (
            <NavLink
              to="/admin/admins"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
                }`
              }
            >
              <Users className="h-4 w-4" />
              管理员管理
              {pendingCount > 0 && (
                <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
              )}
            </NavLink>
          )}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> 退出登录
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default AdminLayout;
