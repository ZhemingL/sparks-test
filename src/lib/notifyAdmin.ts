import emailjs from "@emailjs/browser";
import { supabase } from "@/integrations/supabase/client";

export async function notifyAdminNewUser(email: string) {
  console.log("[notify] start for", email);

  const { data: superAdmins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "super_admin");

  console.log("[notify] superAdmins:", superAdmins);
  if (!superAdmins?.length) { console.log("[notify] no super admins"); return; }

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("user_id")
    .in("user_id", superAdmins.map((r) => r.user_id))
    .eq("email_notifications", true);

  console.log("[notify] settings:", settings);
  if (!settings?.length) { console.log("[notify] no notifications enabled"); return; }

  // Generate approve/reject token URLs
  const { data: tokens, error: tokenErr } = await supabase.rpc("create_notification_tokens", { p_email: email });
  console.log("[notify] tokens:", tokens, tokenErr);
  if (!tokens) return;

  const { data: adminEmails, error: adminErr } = await supabase.rpc("get_admin_users");
  console.log("[notify] adminEmails:", adminEmails, adminErr);
  if (!adminEmails?.length) return;

  const enabledIds = new Set(settings.map((s: any) => s.user_id));
  const toNotify = (adminEmails as any[]).filter(
    (a) => enabledIds.has(a.user_id) && a.role === "super_admin"
  );
  console.log("[notify] toNotify:", toNotify);

  for (const admin of toNotify) {
    try {
      const result = await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_email: admin.email,
          user_email: email,
          created_at: new Date().toLocaleString("zh-CN"),
          approve_url: tokens.approve_url,
          reject_url: tokens.reject_url,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );
      console.log("[notify] emailjs result:", result);
    } catch (e) {
      console.error("[notify] emailjs error:", e);
    }
  }
}
