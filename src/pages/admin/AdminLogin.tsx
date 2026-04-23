import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && isAdmin) navigate("/admin");
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("has_any_admin");
      setHasAdmin(!!data);
      if (!data) setMode("signup");
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("登录失败：" + error.message);
      return;
    }
    const { data: sess } = await supabase.auth.getUser();
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.user!.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!role) {
      toast.error("此账号无管理员权限");
      await supabase.auth.signOut();
      return;
    }
    navigate("/admin");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    if (error) {
      const { data: isPending } = await supabase.rpc("is_pending_user", { p_email: email });
      if (isPending) {
        toast.success("账号已注册，请等待超级管理员在后台审批");
      } else {
        toast.error("注册失败：" + error.message);
      }
      setBusy(false);
      return;
    }
    if (!data.user) {
      setBusy(false);
      toast.error("注册失败：未知错误");
      return;
    }
    const { data: adminExists } = await supabase.rpc("has_any_admin");
    if (!adminExists) {
      const { error: roleErr } = await supabase.rpc("create_first_admin", { p_user_id: data.user.id });
      setBusy(false);
      if (roleErr) {
        toast.error("授予管理员权限失败：" + roleErr.message);
        return;
      }
      toast.success("超级管理员账号创建成功，请登录");
    } else {
      setBusy(false);
      toast.success("注册成功，请等待超级管理员在后台审批后再登录");
    }
    setMode("login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-display font-bold">SPARKS 管理后台</span>
          </div>
          <CardTitle className="pt-2">{mode === "login" ? "管理员登录" : "管理员账号申请"}</CardTitle>
          {hasAdmin === false && mode === "signup" && (
            <p className="text-xs text-muted-foreground">系统未检测到管理员，首次访问将创建管理员账号。</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={busy}>
              {busy ? "处理中..." : mode === "login" ? "登录" : "创建并授予管理员"}
            </Button>
            {hasAdmin && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "申请管理员账号" : "返回登录"}
              </button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
