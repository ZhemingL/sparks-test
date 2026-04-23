import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { Bell } from "lucide-react";

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { userId, loading, isSuperAdmin } = useAdminAuth();
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("notification_settings")
      .select("email_notifications")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEmailNotifications(data.email_notifications);
      });
  }, [userId]);

  const handleToggle = async (val: boolean) => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_settings")
      .upsert({ user_id: userId, email_notifications: val, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setEmailNotifications(val);
    toast.success(val ? "邮件通知已开启" : "邮件通知已关闭");
  };

  useEffect(() => {
    if (!loading && !isSuperAdmin) navigate("/admin");
  }, [loading, isSuperAdmin, navigate]);

  if (loading) return null;

  return (
    <AdminLayout>
      <div>
        <h1 className="font-display text-2xl font-bold">通知设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理你的通知偏好</p>
      </div>

      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> 邮件通知
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">新管理员申请通知</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                有新用户注册时，发送邮件提醒到你的邮箱
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default NotificationSettings;
