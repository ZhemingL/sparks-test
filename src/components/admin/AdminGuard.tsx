import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { loading, isAdmin } = useAdminAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">加载中...</div>;
  }
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default AdminGuard;
