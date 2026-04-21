import Layout from "@/components/Layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const faqData = [
  {
    category: "关于ADHD",
    items: [
      {
        q: "什么是成人ADHD？",
        a: "注意力缺陷多动障碍（ADHD）是一种神经发育障碍，不仅影响儿童，也影响成人。成人ADHD的主要表现包括注意力难以集中、冲动行为、时间管理困难、执行功能受损等。据研究，约有2.5%-5%的成人受到ADHD的影响。",
      },
      {
        q: "我没有正式诊断，可以参加吗？",
        a: "可以。我们的工作坊欢迎已确诊和疑似ADHD的成人参加。课程中的策略和工具对任何有执行功能挑战的人都有帮助。但我们建议同时寻求专业的诊断和医疗支持。",
      },
      {
        q: "ADHD可以被治愈吗？",
        a: "ADHD是一种终身性的神经发育差异，目前不能被\"治愈\"，但可以通过药物治疗、心理干预和行为策略来有效管理。我们的课程旨在帮助你建立这些管理策略。",
      },
    ],
  },
  {
    category: "关于课程",
    items: [
      {
        q: "课程是什么形式的？",
        a: "我们的课程以线上小组形式为主，通过视频会议平台进行。每个小组通常6-12人，确保每位参与者都能获得充分的互动和关注。部分工作坊也会提供线下选项。",
      },
      {
        q: "我需要准备什么？",
        a: "你只需要一台能上网的电脑或手机、一个安静的私密空间，以及一颗开放的心。课程材料会在开课前发送给你。",
      },
      {
        q: "课程有回放吗？",
        a: "考虑到团体课程的互动性和隐私保护，通常不提供完整回放。但课程结束后会提供要点总结和练习资料供复习。",
      },
      {
        q: "如果中途无法参加怎么办？",
        a: "我们理解ADHD人群可能面临计划变更的挑战。如果你需要缺席某次课程，请提前告知，我们会提供该次课程的要点总结。",
      },
    ],
  },
  {
    category: "关于报名",
    items: [
      {
        q: "如何报名？",
        a: "你可以通过本网站的报名页面填写信息，或者添加我们的微信客服直接报名。提交后我们会在1-2个工作日内与你联系确认。",
      },
      {
        q: "可以退款吗？",
        a: "课程开始前7天可以申请全额退款。开课后如因特殊原因需要退出，可以协商转到下一期课程。具体退款政策请咨询客服。",
      },
      {
        q: "有优惠或减免吗？",
        a: "我们提供早鸟价和多课程组合优惠。对于经济困难的参与者，部分课程提供有限的减免名额，请联系客服了解详情。",
      },
    ],
  },
];

const FAQPage = () => {
  return (
    <Layout>
      <section className="bg-secondary/30 py-20">
        <div className="container text-center">
          <h1 className="font-display text-4xl font-bold md:text-5xl">常见问题</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            关于ADHD、我们的课程和报名流程，这里有你可能想了解的答案。
          </p>
          <div className="mt-4 mx-auto h-1 w-16 rounded-full bg-primary" />
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl space-y-10">
            {faqData.map((section) => (
              <div key={section.category}>
                <h2 className="mb-4 text-xl font-semibold text-primary">{section.category}</h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {section.items.map((item, i) => (
                    <AccordionItem key={i} value={`${section.category}-${i}`} className="rounded-xl border px-4">
                      <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="container text-center">
          <p className="mb-4 text-muted-foreground">没有找到你的问题？</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button className="rounded-full">
                联系我们 <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FAQPage;
