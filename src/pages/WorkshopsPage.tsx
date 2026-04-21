import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import WorkshopCard, { Workshop, FormatEntry } from "@/components/WorkshopCard";
import { supabase } from "@/integrations/supabase/client";

const formatPrice = (p: number) => (p === 0 ? "免费" : `¥${p.toLocaleString()}`);

const parseFormats = (format: string | null): FormatEntry[] => {
  if (!format) return [];
  try {
    const parsed = JSON.parse(format);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ type: format, sessions: 0, duration: "" }];
};

const WorkshopsPage = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (data) {
        setWorkshops(
          data.map((s) => ({
            id: s.id,
            title: s.name,
            description: s.description ?? "",
            formats: parseFormats(s.format),
            schedule: s.schedule ?? "",
            extraInfo: s.extra_info ?? "",
            price: formatPrice(Number(s.price ?? 0)),
            discountPrice: s.discount_enabled && s.discount_price != null ? formatPrice(Number(s.discount_price)) : undefined,
            hasDiscount: s.discount_enabled ?? false,
            tags: s.tags ?? [],
            status: (s.status as Workshop["status"]) ?? "招募中",
          })),
        );
      }
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <section className="bg-secondary/30 py-20">
        <div className="container text-center">
          <h1 className="font-display text-4xl font-bold md:text-5xl">工作坊与团体课程</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            我们提供多种类型的工作坊和团体课程，满足不同阶段和需求的成人ADHD群体。
          </p>
          <div className="mt-4 mx-auto h-1 w-16 rounded-full bg-primary" />
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <SectionHeader title="全部课程" subtitle="选择适合你的课程，迈出改变的第一步" />
          {loading ? (
            <p className="text-center text-muted-foreground">加载中...</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workshops.map((w) => (
                <WorkshopCard key={w.id} workshop={w} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default WorkshopsPage;
