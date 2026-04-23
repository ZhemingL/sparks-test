import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return htmlResponse("无效链接", "缺少 token 参数。", "error");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Look up the token
  const { data: record, error } = await supabase
    .from("admin_action_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !record) {
    return htmlResponse("无效链接", "此链接不存在或已失效。", "error");
  }

  if (record.used) {
    return htmlResponse("已处理", "此链接已被使用过，请勿重复点击。", "warn");
  }

  if (new Date(record.expires_at) < new Date()) {
    return htmlResponse("链接已过期", "此链接已超过 24 小时有效期，请前往后台手动审核。", "error");
  }

  // Mark token as used
  await supabase
    .from("admin_action_tokens")
    .update({ used: true })
    .eq("token", token);

  if (record.action === "approve") {
    const { error: grantError } = await supabase
      .from("user_roles")
      .insert({ user_id: record.target_user_id, role: "admin" });

    if (grantError) {
      return htmlResponse("操作失败", grantError.message, "error");
    }
    return htmlResponse("已批准 ✅", "该用户已成功授权为管理员。", "success");
  }

  if (record.action === "reject") {
    // Delete the user account
    const { error: deleteError } = await supabase.auth.admin.deleteUser(record.target_user_id);
    if (deleteError) {
      return htmlResponse("操作失败", deleteError.message, "error");
    }
    return htmlResponse("已拒绝 ❌", "该用户注册申请已被拒绝，账号已删除。", "success");
  }

  return htmlResponse("未知操作", "无效的操作类型。", "error");
});

function htmlResponse(title: string, message: string, type: "success" | "error" | "warn") {
  const colors = {
    success: "#16a34a",
    error: "#dc2626",
    warn: "#d97706",
  };
  const color = colors[type];
  const html = `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title} — SPARKS 心火</title>
      <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
        .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
        h1 { font-size: 22px; color: ${color}; margin-bottom: 12px; }
        p { color: #555; font-size: 15px; }
        a { display: inline-block; margin-top: 24px; color: #000; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="${SITE_URL}/admin/admins">返回后台</a>
      </div>
    </body>
    </html>
  `;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
