import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAdminAuth = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const check = async (uid: string | null) => {
      setUserId(uid);
      if (!uid) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", ["admin", "super_admin"])
        .maybeSingle();
      setIsAdmin(!!data);
      setIsSuperAdmin(data?.role === "super_admin");
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      check(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => check(data.session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { loading, isAdmin, isSuperAdmin, userId };
};
