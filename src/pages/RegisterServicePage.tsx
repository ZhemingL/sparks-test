import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Heart, ArrowLeft } from "lucide-react";
import PersonalInfoStep, { PersonalInfo } from "@/components/questionnaire/PersonalInfoStep";
import QuestionRenderer, { Question, AnswerState } from "@/components/questionnaire/QuestionRenderer";

type Step = 1 | 2 | 3;
type Result = { kind: "approved"; registrationId: string } | { kind: "rejected"; reason: string };

const RegisterServicePage = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<{ id: string; name: string; price: number; discount_price: number | null; discount_enabled: boolean; status: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [segmentStart, setSegmentStart] = useState<string | null>(null);
  const [segmentHistory, setSegmentHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!serviceId) return;
    (async () => {
      const { data: svc } = await supabase
        .from("services")
        .select("id, name, price, discount_price, discount_enabled, status")
        .eq("id", serviceId)
        .maybeSingle();
      if (svc) setService(svc as any);

      const { data: q } = await supabase
        .from("questionnaires")
        .select("id")
        .eq("service_id", serviceId)
        .eq("is_active", true)
        .maybeSingle();

      if (q) {
        setQuestionnaireId(q.id);
        const { data: qs } = await supabase
          .from("questions")
          .select("*, question_options(*)")
          .eq("questionnaire_id", q.id)
          .order("sort_order");
        if (qs) setQuestions(qs as any);
      }
      setLoading(false);
    })();
  }, [serviceId]);

  const hasJumpLogic = questions.some((q) => q.jump_logic?.enabled);

  const buildSegment = (startId: string | null): Question[] => {
    if (!startId) return [];
    const startIdx = questions.findIndex((q) => q.id === startId);
    if (startIdx === -1) return [];
    const seg: Question[] = [];
    for (let i = startIdx; i < questions.length; i++) {
      seg.push(questions[i]);
      if (questions[i].jump_logic?.enabled) break;
    }
    return seg;
  };

  const getNextQId = (q: Question, answer: AnswerState): string | null => {
    if (!q.jump_logic?.enabled) {
      const idx = questions.findIndex((x) => x.id === q.id);
      return idx < questions.length - 1 ? questions[idx + 1].id : null;
    }
    const rules = q.jump_logic.rules ?? {};
    const key = q.type === "text_input" ? "__any__"
      : q.type === "multiple_choice" ? (answer.options?.[0] ?? "")
      : (answer.value ?? "");
    const target = key in rules ? rules[key] : null;
    if (target === "__end__") return null;
    if (target === null || target === undefined) {
      const idx = questions.findIndex((x) => x.id === q.id);
      return idx < questions.length - 1 ? questions[idx + 1].id : null;
    }
    return target;
  };

  const handleNextSegment = () => {
    const seg = buildSegment(segmentStart);
    for (const q of seg) {
      const a = answers[q.id] ?? {};
      if (q.is_required) {
        const empty = q.type === "multiple_choice" ? !(a.options?.length) : !a.value?.trim();
        if (empty) { toast.error(`请回答：${q.text}`); return; }
      }
      const hintOpt = q.question_options.find((o: any) =>
        (o.hint_title || o.hint_body) &&
        (q.type === "multiple_choice" ? a.options?.includes(o.value) : a.value === o.value)
      );
      if (hintOpt && !a.acknowledged) {
        toast.error(`请在「${q.text}」中点击"我了解并同意"后继续`);
        return;
      }
    }
    const pivot = seg[seg.length - 1];
    const nextStart = pivot?.jump_logic?.enabled
      ? getNextQId(pivot, answers[pivot.id] ?? {})
      : null;
    if (!nextStart) {
      handleSubmitQuestionnaire();
    } else {
      setSegmentHistory((h) => [...h, segmentStart!]);
      setSegmentStart(nextStart);
    }
  };

  const handlePrevSegment = () => {
    if (segmentHistory.length === 0) { setStep(1); return; }
    const prev = segmentHistory[segmentHistory.length - 1];
    setSegmentHistory((h) => h.slice(0, -1));
    setSegmentStart(prev);
  };

  const handleSubmitQuestionnaire = async () => {
    if (!personalInfo || !service) return;

    if (!hasJumpLogic) {
      for (const q of questions) {
        if (!q.is_required) continue;
        const a = answers[q.id];
        const empty = !a || (q.type === "multiple_choice" ? !(a.options?.length) : !a.value?.trim());
        if (empty) { toast.error(`请回答：${q.text}`); return; }
      }
      for (const q of questions) {
        const a = answers[q.id];
        if (!a) continue;
        const selected = q.question_options.filter((o: any) =>
          q.type === "multiple_choice" ? a.options?.includes(o.value) : a.value === o.value
        );
        if (selected.some((o: any) => o.hint_title || o.hint_body) && !a.acknowledged) {
          toast.error(`请在「${q.text}」中点击"我了解并同意"后继续`);
          return;
        }
      }
    }

    // Suitability check
    let exclusionReason: string | null = null;
    for (const q of questions) {
      const a = answers[q.id];
      if (!a) continue;
      const selected = q.question_options.filter((o) => {
        if (q.type === "multiple_choice") return a.options?.includes(o.value);
        return a.value === o.value;
      });
      if (selected.some((o) => o.is_exclusion)) {
        exclusionReason = q.hint_text || `根据你对「${q.text}」的回答，我们暂时无法接收你参加本课程。`;
        break;
      }
    }

    setSubmitting(true);
    try {
      const status = exclusionReason ? "rejected" : "pending";
      const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .insert({
          ...personalInfo,
          service_id: service.id,
          status,
          rejection_reason: exclusionReason,
        })
        .select("id")
        .single();
      if (regErr) throw regErr;

      const answerRows = Object.entries(answers).map(([qid, a]) => ({
        registration_id: reg.id,
        question_id: qid,
        answer_value: a.value ?? null,
        answer_options: a.options ?? null,
        free_text: a.free_text ?? null,
      }));
      if (answerRows.length) {
        const { error: ansErr } = await supabase.from("answers").insert(answerRows);
        if (ansErr) throw ansErr;
      }

      if (exclusionReason) {
        setResult({ kind: "rejected", reason: exclusionReason });
      } else {
        setResult({ kind: "approved", registrationId: reg.id });
      }
      setStep(3);
    } catch (e: any) {
      toast.error("提交失败：" + (e.message || "请稍后再试"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-20 text-center text-muted-foreground">加载中...</div>
      </Layout>
    );
  }

  if (service && service.status !== "招募中") {
    const messages: Record<string, string> = {
      "即将开始": "本课程尚未开放报名，敬请期待。",
      "已满": "本课程名额已满，感谢你的关注。",
      "暂停": "本课程报名暂时暂停，请稍后再来。",
    };
    return (
      <Layout>
        <div className="container py-20 max-w-lg mx-auto text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-bold">{service.name}</h2>
          <p className="text-muted-foreground">{messages[service.status] ?? "此课程当前不接受报名。"}</p>
          <Link to="/workshops">
            <Button variant="outline" className="rounded-full mt-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> 返回课程列表
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (!service) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">未找到该课程</p>
          <Link to="/workshops">
            <Button variant="outline" className="mt-4 rounded-full">返回课程列表</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="bg-secondary/30 py-12">
        <div className="container">
          <Link to="/workshops" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> 返回课程列表
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">{service.name}</h1>
          <p className="mt-2 text-muted-foreground">报名前请完成简短的入组评估</p>

          {/* Stepper */}
          <div className="mt-6 flex items-center gap-3">
            {([1, 2, 3] as const).map((n, i) => (
              <div key={n} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n}
                </div>
                <span className={`text-sm ${step >= n ? "text-foreground" : "text-muted-foreground"}`}>
                  {n === 1 ? "个人信息" : n === 2 ? "问卷评估" : "提交结果"}
                </span>
                {i < 2 && <div className="h-px w-8 bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container max-w-3xl">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>第 1 步：个人信息</CardTitle>
              </CardHeader>
              <CardContent>
                <PersonalInfoStep
                  defaultValues={personalInfo ?? undefined}
                  onSubmit={(data) => {
                    setPersonalInfo(data);
                    if (hasJumpLogic && questions.length > 0) {
                      setSegmentStart(questions[0].id);
                      setSegmentHistory([]);
                    }
                    setStep(2);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>第 2 步：问卷评估</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">本课程暂无入组问卷，可直接提交报名。</p>
                ) : hasJumpLogic ? (
                  buildSegment(segmentStart).map((q) => (
                    <QuestionRenderer
                      key={q.id}
                      question={q}
                      answer={answers[q.id] ?? {}}
                      onChange={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
                    />
                  ))
                ) : (
                  questions.map((q) => (
                    <QuestionRenderer
                      key={q.id}
                      question={q}
                      answer={answers[q.id] ?? {}}
                      onChange={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
                    />
                  ))
                )}
                <div className="flex gap-3 pt-2">
                  {hasJumpLogic ? (
                    <>
                      <Button variant="outline" className="rounded-full" onClick={handlePrevSegment}>上一步</Button>
                      <Button className="flex-1 rounded-full" disabled={submitting} onClick={handleNextSegment}>
                        {submitting ? "提交中..." : "下一步"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="rounded-full" onClick={() => setStep(1)}>上一步</Button>
                      <Button className="flex-1 rounded-full" disabled={submitting} onClick={handleSubmitQuestionnaire}>
                        {submitting ? "提交中..." : "提交报名"}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && result?.kind === "approved" && (
            <Card className="border-primary/30">
              <CardContent className="space-y-5 pt-8 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
                <h2 className="text-2xl font-bold">报名提交成功！</h2>
                <p className="text-muted-foreground">
                  我们已收到你的报名信息，工作人员会在 1-2 个工作日内通过邮件或电话与你联系，确认入组及付款事宜。
                </p>
                <div className="rounded-lg bg-secondary/50 p-4 text-left text-sm">
                  <p className="font-medium mb-2">付款说明</p>
                  <p className="text-muted-foreground">
                    课程费用：{service.discount_enabled && service.discount_price != null ? (
                      <span className="inline-flex items-baseline gap-1.5">
                        <span className="line-through text-sm">{service.price === 0 ? "免费" : `¥${Number(service.price).toLocaleString()}`}</span>
                        <span className="font-medium text-foreground">{service.discount_price === 0 ? "免费" : `¥${Number(service.discount_price).toLocaleString()}`}</span>
                      </span>
                    ) : (
                      service.price === 0 ? "免费" : `¥${Number(service.price).toLocaleString()}`
                    )}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    在线支付功能即将上线。当前请等待客服联系，通过微信完成付款。
                  </p>
                </div>
                <Link to="/workshops">
                  <Button variant="outline" className="rounded-full">查看其他课程</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {step === 3 && result?.kind === "rejected" && (
            <Card className="border-destructive/20">
              <CardContent className="space-y-5 pt-8 text-center">
                <Heart className="mx-auto h-16 w-16 text-primary" />
                <h2 className="text-2xl font-bold">感谢你的信任</h2>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 text-left">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">目前我们的项目可能不太适合你当下的情况</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-line">{result.reason}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  如果你有任何疑问，欢迎通过微信联系我们的工作人员。我们会尽力为你提供更合适的资源建议。
                </p>
                <Link to="/">
                  <Button variant="outline" className="rounded-full">返回首页</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default RegisterServicePage;
