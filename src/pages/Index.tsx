import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import WorkshopCard, { Workshop, FormatEntry } from "@/components/WorkshopCard";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Heart, Sparkles, ArrowRight } from "lucide-react";

const formatPrice = (p: number) => (p === 0 ? "免费" : `¥${p.toLocaleString()}`);

const parseFormats = (format: string | null): FormatEntry[] => {
  if (!format) return [];
  try {
    const parsed = JSON.parse(format);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ type: format, sessions: 0, duration: "" }];
};

const benefits = [
  {
    icon: Brain,
    title: "科学循证",
    description: "基于认知行为疗法（CBT）和多种心理社会模型，经过实证研究验证的干预方法。",
  },
  {
    icon: Heart,
    title: "温暖社群",
    description: "在安全包容的环境中，与同样经历的伙伴互相支持、共同成长。",
  },
  {
    icon: Sparkles,
    title: "实用技能",
    description: "聚焦日常生活和工作中的实际挑战，学习可立即应用的策略和工具。",
  },
];

const HomePage = () => {
  const [featuredWorkshops, setFeaturedWorkshops] = useState<Workshop[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(2);
      if (data) {
        setFeaturedWorkshops(
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
          }))
        );
      }
    })();
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary px-4 py-20 md:py-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-10 top-10 text-6xl">✦</div>
          <div className="absolute bottom-20 right-20 text-8xl">☺</div>
          <div className="absolute right-40 top-20 text-5xl">✧</div>
          <div className="absolute bottom-10 left-1/3 text-7xl">◡</div>
        </div>
        <div className="container relative text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center rounded-full bg-primary-foreground/20 px-4 py-1.5 text-sm text-primary-foreground">
              ✨ 面向中国成人ADHD的专业支持项目
            </div>
            <h1 className="mb-6 font-display text-4xl font-bold text-primary-foreground md:text-6xl">
              点燃你的
              <span className="relative">
                心火
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6C50 2 150 2 198 6" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
                </svg>
              </span>
            </h1>
            <p className="mb-8 text-lg text-primary-foreground/90 md:text-xl">
              SPARKS 心火是基于CBT框架和心理社会模型的成人ADHD支持项目。<br className="hidden md:block" />
              通过系列工作坊和团体课程，帮助你提升功能、改善生活质量。
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/workshops">
                <Button size="lg" variant="secondary" className="rounded-full text-base">
                  了解工作坊 <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="rounded-full border-primary-foreground/30 text-base text-primary-foreground hover:bg-primary-foreground/10">
                  立即报名
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container">
          <SectionHeader title="为什么选择 SPARKS" subtitle="我们以科学、温暖和实用为核心理念" />
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map((b) => (
              <Card key={b.title} className="border-none bg-secondary/50 text-center">
                <CardContent className="pt-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <b.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Workshops */}
      <section className="bg-secondary/30 py-20">
        <div className="container">
          <SectionHeader title="近期工作坊" subtitle="选择适合你的课程，开始改变之旅" />
          <div className="grid gap-6 md:grid-cols-2">
            {featuredWorkshops.map((w) => (
              <WorkshopCard key={w.id} workshop={w} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/workshops">
              <Button variant="outline" className="rounded-full">
                查看全部工作坊 <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-3xl bg-primary p-10 text-center md:p-16">
            <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              准备好开始了吗？
            </h2>
            <p className="mb-8 text-primary-foreground/80">
              加入SPARKS心火社群，和我们一起探索属于你的可能性。
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="rounded-full text-base">
                立即报名 <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
