import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Target, Shield } from "lucide-react";

const values = [
  { icon: BookOpen, title: "循证基础", desc: "所有干预方法基于认知行为疗法（CBT）及经验证的心理社会模型。" },
  { icon: Users, title: "社群支持", desc: "提供安全、包容、理解的团体环境，让参与者感受到归属感。" },
  { icon: Target, title: "聚焦实用", desc: "课程内容紧密贴合日常生活，提供可操作的工具和策略。" },
  { icon: Shield, title: "专业团队", desc: "由临床心理学和精神医学背景的专业人士带领课程。" },
];

const methodologies = [
  { name: "认知行为疗法 (CBT)", desc: "识别和改变不适应的思维模式与行为习惯，建立更有效的应对策略。" },
  { name: "正念训练", desc: "通过正念练习提升注意力觉察和情绪调节能力。" },
  { name: "动机式访谈", desc: "激发内在动机，帮助参与者克服改变中的矛盾心理。" },
  { name: "心理教育", desc: "提供关于ADHD的科学知识，减少病耻感，增强自我理解。" },
];

const AboutPage = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-secondary/30 py-20">
        <div className="container text-center">
          <h1 className="font-display text-4xl font-bold md:text-5xl">关于 SPARKS 心火</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            SPARKS（心火）是面向中国成人ADHD群体的心理社会支持项目。
            我们相信每一个ADHD大脑都拥有独特的力量，值得被理解和支持。
          </p>
          <div className="mt-4 mx-auto h-1 w-16 rounded-full bg-primary" />
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-center text-3xl font-bold">我们的使命</h2>
            <div className="rounded-2xl bg-primary/5 p-8 text-center">
              <p className="text-lg leading-relaxed text-foreground/80">
                通过科学循证的方法和温暖的社群支持，帮助中国成人ADHD群体提升执行功能、
                改善情绪调节、增强人际关系，最终实现更高的生活质量和自我效能感。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary/30 py-20">
        <div className="container">
          <SectionHeader title="核心理念" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <Card key={v.title} className="border-none bg-background text-center">
                <CardContent className="pt-8">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <v.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-20">
        <div className="container">
          <SectionHeader title="我们的方法" subtitle="基于多种经过实证检验的心理社会模型" />
          <div className="mx-auto max-w-3xl space-y-4">
            {methodologies.map((m) => (
              <div key={m.name} className="rounded-xl border p-6">
                <h3 className="mb-2 font-semibold text-primary">{m.name}</h3>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AboutPage;
