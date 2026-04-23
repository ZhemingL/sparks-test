import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const rawText = await req.text();
    console.log("notify-admin raw body:", rawText);
    if (!rawText) {
      return new Response(JSON.stringify({ error: "empty body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = JSON.parse(rawText);
    console.log("notify-admin parsed body:", JSON.stringify(body));

    const { email, created_at } = body;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the target user by email
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) { console.error("listUsers error:", usersError); }
    const targetUser = usersData?.users.find((u) => u.email === email);
    console.log("targetUser:", targetUser?.id ?? "not found");
    if (!targetUser) {
      return new Response(JSON.stringify({ message: "user not found" }), { status: 200, headers: corsHeaders });
    }

    // Get all super admins
    const { data: superAdmins, error: saError } = await supabase
      .from("user_roles").select("user_id").eq("role", "super_admin");
    if (saError) { console.error("superAdmins error:", saError); }
    console.log("superAdmins:", superAdmins?.length ?? 0);
    if (!superAdmins?.length) {
      return new Response(JSON.stringify({ message: "no super admins" }), { status: 200, headers: corsHeaders });
    }

    const userIds = superAdmins.map((r: any) => r.user_id);

    // Check which ones have email notifications enabled
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings").select("user_id").in("user_id", userIds).eq("email_notifications", true);
    if (settingsError) { console.error("settings error:", settingsError); }
    console.log("settings with notifications:", settings?.length ?? 0);
    if (!settings?.length) {
      return new Response(JSON.stringify({ message: "no notifications enabled" }), { status: 200, headers: corsHeaders });
    }

    // Generate approve and reject tokens
    const { data: approveToken, error: atErr } = await supabase
      .from("admin_action_tokens").insert({ target_user_id: targetUser.id, action: "approve" }).select("token").single();
    if (atErr) { console.error("approveToken error:", atErr); }

    const { data: rejectToken, error: rtErr } = await supabase
      .from("admin_action_tokens").insert({ target_user_id: targetUser.id, action: "reject" }).select("token").single();
    if (rtErr) { console.error("rejectToken error:", rtErr); }

    const approveUrl = `${SUPABASE_URL}/functions/v1/handle-admin-action?token=${approveToken?.token}`;
    const rejectUrl = `${SUPABASE_URL}/functions/v1/handle-admin-action?token=${rejectToken?.token}`;

    // Get emails of super admins with notifications enabled
    const enabledIds = new Set(settings.map((s: any) => s.user_id));
    const notifyEmails = (usersData?.users ?? [])
      .filter((u) => enabledIds.has(u.id)).map((u) => u.email).filter(Boolean) as string[];
    console.log("notifyEmails:", notifyEmails);

    // Send email via Resend
    const results = await Promise.all(
      notifyEmails.map(async (to) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "SPARKS 心火 <onboarding@resend.dev>",
            to,
            subject: "新的管理员注册申请",
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2 style="font-size:18px;">新的管理员注册申请</h2>
                <p><strong>邮箱：</strong>${email}</p>
                <p><strong>注册时间：</strong>${new Date(created_at).toLocaleString("zh-CN")}</p>
                <p style="color:#666;font-size:13px;">链接有效期 24 小时，点击后立即生效。</p>
                <div style="margin-top:24px;">
                  <a href="${approveUrl}" style="background:#16a34a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-right:12px;">✅ 批准</a>
                  <a href="${rejectUrl}" style="background:#dc2626;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">❌ 拒绝</a>
                </div>
                <p style="margin-top:24px;"><a href="${SITE_URL}/admin/admins" style="color:#666;font-size:12px;">或前往后台手动审核</a></p>
                <p style="color:#999;font-size:11px;margin-top:32px;">此邮件由 SPARKS 心火 后台自动发送</p>
              </div>
            `,
          }),
        });
        const resBody = await res.json();
        console.log("Resend response for", to, ":", JSON.stringify(resBody));
        return resBody;
      })
    );

    return new Response(JSON.stringify({ ok: true, notified: notifyEmails.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
