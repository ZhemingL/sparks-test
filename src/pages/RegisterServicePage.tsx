import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Heart, ArrowLeft } from "lucide-react";
import PersonalInfoStep, { PersonalInfo } from "@/components/questionnaire/PersonalInfoStep";
import QuestionRenderer, { Question, AnswerState, PhoneInput } from "@/components/questionnaire/QuestionRenderer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const [questionnaireMeta, setQuestionnaireMeta] = useState<{ title: string; description: string | null; cover_image_url: string | null; consent_enabled: boolean; consent_items: { statement: string; body: string }[] } | null>(null);
  const [coverDismissed, setCoverDismissed] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState<Record<number, boolean>>({});
  const [showConsentDoc, setShowConsentDoc] = useState<number | null>(null);

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
        .select("id, title, description, cover_image_url, consent_enabled, consent_items, consent_statement, consent_body")
        .eq("service_id", serviceId)
        .eq("is_active", true)
        .maybeSingle();

      if (q) {
        setQuestionnaireId(q.id);
        if (q.title || q.description || q.cover_image_url || q.consent_enabled) {
          const rawItems: { statement: string; body: string }[] = (q as any).consent_items ?? [];
          const consentItems = rawItems.length === 0 && (q as any).consent_statement
            ? [{ statement: (q as any).consent_statement ?? "", body: (q as any).consent_body ?? "" }]
            : rawItems;
          setQuestionnaireMeta({ title: q.title, description: q.description ?? null, cover_image_url: q.cover_image_url ?? null, consent_enabled: !!q.consent_enabled, consent_items: consentItems });
        }
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
  const hasSectionCover = questions.some((q) => q.type === "section_cover");
  const hasPersonalInfoQuestions = questions.some((q) => q.type === "personal_info" || q.type === "pii_field");
  const hasPageBreaks = questions.some((q) => q.type === "page_break");

  const piPageBreak = (q: Question) => {
    if (q.type !== "personal_info") return false;
    try { return !!JSON.parse(q.hint_text ?? "{}").page_break; } catch { return false; }
  };

  const hasPersonalInfoPages = questions.some(piPageBreak);
  const useSegments = hasJumpLogic || hasSectionCover || hasPageBreaks || hasPersonalInfoPages;

  const pageList = questions
    .filter((q) => q.type === "page_break" || piPageBreak(q))
    .map((q) => {
      if (q.type === "page_break") return { id: q.id, title: q.text || "页面" };
      let cfg = { page_break_title: "" };
      try { cfg = { ...cfg, ...JSON.parse(q.hint_text ?? "{}") }; } catch {}
      return { id: q.id, title: cfg.page_break_title || q.text || "基础信息" };
    });

  useEffect(() => {
    if (loading || step !== 1) return;
    if (!hasPersonalInfoQuestions) return;
    if (!coverDismissed && questionnaireMeta) return;
    if (useSegments && questions.length > 0) { setSegmentStart(questions[0].id); setSegmentHistory([]); }
    setStep(2);
  }, [loading, step, coverDismissed, questionnaireMeta, hasPersonalInfoQuestions]);

  const extractPersonalInfo = () => {
    const info: Record<string, string> = { name: "", email: "", phone: "" };
    for (const q of questions) {
      const a = answers[q.id];
      if (!a) continue;
      if (q.type === "personal_info") {
        try { Object.assign(info, JSON.parse(a.value ?? "{}")); } catch {}
      }
      if (q.type === "pii_field") {
        let cfg = { field: "" };
        try { cfg = { ...cfg, ...JSON.parse(q.hint_text ?? "{}") }; } catch {}
        if (cfg.field && a.value) info[cfg.field] = a.value;
      }
    }
    return info;
  };

  const buildSegment = (startId: string | null): Question[] => {
    if (!startId) return [];
    let startIdx = questions.findIndex((q) => q.id === startId);
    if (startIdx === -1) return [];
    // page_break questions are transparent dividers — skip them
    while (startIdx < questions.length && questions[startIdx].type === "page_break") startIdx++;
    if (startIdx >= questions.length) return [];
    if (questions[startIdx].type === "section_cover") return [questions[startIdx]];
    if (piPageBreak(questions[startIdx])) return [questions[startIdx]];
    const seg: Question[] = [];
    for (let i = startIdx; i < questions.length; i++) {
      seg.push(questions[i]);
      if (questions[i].jump_logic?.enabled) break;
      const next = i + 1 < questions.length ? questions[i + 1] : null;
      if (next && (["section_cover", "page_break"].includes(next.type) || piPageBreak(next))) break;
    }
    return seg;
  };

  const currentSegment = useSegments ? buildSegment(segmentStart) : questions;
  const isSectionCoverSegment = currentSegment.length === 1 && currentSegment[0]?.type === "section_cover";
  const isPersonalInfoSegment = currentSegment.length === 1 && !!currentSegment[0] && piPageBreak(currentSegment[0]);

  const currentPageIdx = (() => {
    if (!useSegments || pageList.length === 0) return -1;
    const firstQ = currentSegment[0];
    if (!firstQ) return -1;
    const firstIdx = questions.findIndex((q) => q.id === firstQ.id);
    if (firstIdx === -1) return -1;
    for (let i = firstIdx; i >= 0; i--) {
      const idx = pageList.findIndex((p) => p.id === questions[i].id);
      if (idx !== -1) return idx;
    }
    return -1;
  })();

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
      if (q.type === "section_cover") {
        if (!a.acknowledged) { toast.error("请点击按钮后继续"); return; }
        continue;
      }
      if (q.is_required) {
        const empty = q.type === "multiple_choice" ? !(a.options?.length) : !a.value?.trim();
        if (empty) { toast.error(`请回答：${q.text}`); return; }
      }
      if (q.type === "text_display") {
        let cfg = { button_enabled: false };
        try { cfg = { ...cfg, ...JSON.parse(q.hint_text ?? "{}") }; } catch {}
        if (cfg.button_enabled && !a.acknowledged) {
          toast.error(`请在「${q.text}」中点击按钮后继续`);
          return;
        }
        continue;
      }
      if (q.type === "consent") {
        if (q.is_required && !a.acknowledged) {
          toast.error(`请先勾选同意「${q.text || "协议"}」`);
          return;
        }
        continue;
      }
      if (q.type === "personal_info") {
        if (q.is_required) {
          let data: Record<string, string> = {};
          try { data = JSON.parse(a.value ?? "{}"); } catch {}
          let cfg = { fields: ["name", "email", "phone"] };
          try { cfg = { ...cfg, ...JSON.parse(q.hint_text ?? "{}") }; } catch {}
          const missing = cfg.fields.find((f) => !data[f]?.trim());
          if (missing) { toast.error(`请在「${q.text || "基础信息"}」中填写所有必填项`); return; }
        }
        continue;
      }
      if (q.type === "pii_field") {
        if (q.is_required && !a.value?.trim()) {
          toast.error(`请填写：${q.text}`);
          return;
        }
        continue;
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
    let nextStart = pivot ? getNextQId(pivot, answers[pivot.id] ?? {}) : null;
    // Skip bare page_break questions (personal_info with page_break handled as solo segment, not skipped)
    while (nextStart) {
      const nq = questions.find((q) => q.id === nextStart);
      if (nq?.type !== "page_break") break;
      const ni = questions.findIndex((q) => q.id === nextStart);
      nextStart = ni < questions.length - 1 ? questions[ni + 1].id : null;
    }
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
    if (!service) return;
    if (!personalInfo && !hasPersonalInfoQuestions) { toast.error("请先填写个人信息"); return; }

    if (!hasJumpLogic) {
      for (const q of questions) {
        if (!q.is_required) continue;
        if (["text_display", "section_cover", "consent", "page_break"].includes(q.type)) continue;
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
        if (q.type === "text_display") {
          let cfg = { button_enabled: false };
          try { cfg = { ...cfg, ...JSON.parse(q.hint_text ?? "{}") }; } catch {}
          if (cfg.button_enabled && !a?.acknowledged) {
            toast.error(`请在「${q.text}」中点击按钮后继续`);
            return;
          }
          continue;
        }
        if (q.type === "consent") {
          if (q.is_required && !a.acknowledged) {
            toast.error(`请先勾选同意「${q.text || "协议"}」`);
            return;
          }
          continue;
        }
        if (q.type === "personal_info" || q.type === "pii_field") continue;
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
      const regInfo = hasPersonalInfoQuestions ? extractPersonalInfo() : personalInfo ?? {};
      const status = exclusionReason ? "rejected" : "pending";
      const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .insert({
          ...regInfo,
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
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            {(() => {
              const items: { label: string; active: boolean }[] = [];
              if (pageList.length === 0) {
                items.push(
                  { label: "个人信息", active: step >= 1 },
                  { label: "问卷评估", active: step >= 2 },
                  { label: "提交结果", active: step >= 3 },
                );
              } else {
                if (!hasPersonalInfoQuestions) items.push({ label: "个人信息", active: step >= 1 });
                pageList.forEach((page, idx) => {
                  items.push({
                    label: page.title,
                    active: step === 3 || (step === 2 && currentPageIdx >= idx),
                  });
                });
                items.push({ label: "提交结果", active: step === 3 });
              }
              return items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${item.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </div>
                  <span className={`text-sm ${item.active ? "text-foreground" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                  {i < items.length - 1 && <div className="h-px w-8 bg-border" />}
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container max-w-3xl">
          {step === 1 && !coverDismissed && questionnaireMeta && (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              {questionnaireMeta.cover_image_url && (
                <img
                  src={questionnaireMeta.cover_image_url}
                  alt=""
                  className="w-full object-cover"
                  style={{ aspectRatio: "5/1" }}
                />
              )}
              <div className="px-8 pt-5 pb-10 md:px-16 md:pt-7 md:pb-12 space-y-4 text-center">
                {questionnaireMeta.title && (
                  <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">
                    {questionnaireMeta.title}
                  </h1>
                )}
                {questionnaireMeta.description && (
                  <div
                    className="prose prose-base max-w-2xl mx-auto text-left text-foreground/80"
                    dangerouslySetInnerHTML={{ __html: questionnaireMeta.description }}
                  />
                )}
                {questionnaireMeta.consent_enabled && questionnaireMeta.consent_items?.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 max-w-md mx-auto text-left">
                    <Checkbox
                      id={`consent-${i}`}
                      checked={!!consentAccepted[i]}
                      onCheckedChange={(c) => setConsentAccepted((prev) => ({ ...prev, [i]: !!c }))}
                      className="mt-0.5 shrink-0"
                    />
                    <div
                      className="text-sm text-foreground/80 prose prose-sm max-w-none leading-relaxed cursor-pointer"
                      onClick={(e) => {
                        const el = e.target as HTMLElement;
                        if (el.tagName === "A" && el.getAttribute("href") === "#consent-doc") {
                          e.preventDefault();
                          setShowConsentDoc(i);
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: item.statement || "我已阅读并同意" }}
                    />
                  </div>
                ))}
                <div className="pt-2">
                  <Button
                    size="lg"
                    className="rounded-full px-12"
                    disabled={questionnaireMeta.consent_enabled && !questionnaireMeta.consent_items?.every((_, i) => consentAccepted[i])}
                    onClick={() => {
                      const allAccepted = !questionnaireMeta.consent_enabled || questionnaireMeta.consent_items?.every((_, i) => consentAccepted[i]);
                      if (!allAccepted) { toast.error("请先勾选所有协议"); return; }
                      setCoverDismissed(true);
                      if (hasPersonalInfoQuestions) {
                        if (useSegments && questions.length > 0) { setSegmentStart(questions[0].id); setSegmentHistory([]); }
                        setStep(2);
                      }
                    }}
                  >
                    开始填写
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Dialog open={showConsentDoc !== null} onOpenChange={(o) => { if (!o) setShowConsentDoc(null); }}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>用户协议</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-1">
                {showConsentDoc !== null && questionnaireMeta?.consent_items?.[showConsentDoc]?.body ? (
                  <div
                    className="prose prose-sm max-w-none text-foreground/80"
                    dangerouslySetInnerHTML={{ __html: questionnaireMeta.consent_items[showConsentDoc].body }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">暂无内容</p>
                )}
              </div>
              <div className="border-t pt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowConsentDoc(null)}>关闭</Button>
                <Button onClick={() => {
                  if (showConsentDoc !== null) setConsentAccepted((prev) => ({ ...prev, [showConsentDoc]: true }));
                  setShowConsentDoc(null);
                }}>
                  我已阅读，同意
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {step === 1 && (coverDismissed || !questionnaireMeta) && !hasPersonalInfoQuestions && (
            <Card>
              <CardHeader>
                <CardTitle>第 1 步：个人信息</CardTitle>
              </CardHeader>
              <CardContent>
                <PersonalInfoStep
                  defaultValues={personalInfo ?? undefined}
                  onSubmit={(data) => {
                    setPersonalInfo(data);
                    if (useSegments && questions.length > 0) {
                      setSegmentStart(questions[0].id);
                      setSegmentHistory([]);
                    }
                    setStep(2);
                  }}
                />
              </CardContent>
            </Card>
          )}


          {step === 2 && isSectionCoverSegment && (() => {
            const q = currentSegment[0];
            let cfg = { body: "", button_label: "", banner_url: "" };
            try { cfg = { ...cfg, ...JSON.parse(q.hint_text ?? "{}") }; } catch {}
            return (
              <Card className="overflow-hidden">
                {cfg.banner_url && (
                  <img src={cfg.banner_url} alt="" className="w-full object-cover" style={{ aspectRatio: "5/1" }} />
                )}
                <CardContent className="py-12 text-center space-y-6">
                  {q.text && <h2 className="font-display text-3xl font-bold">{q.text}</h2>}
                  {cfg.body && (
                    <div
                      className="text-sm text-foreground/80 prose prose-sm max-w-2xl mx-auto text-left"
                      dangerouslySetInnerHTML={{ __html: cfg.body }}
                    />
                  )}
                  <div className="flex gap-3 justify-center pt-2">
                    <Button variant="outline" className="rounded-full" onClick={handlePrevSegment}>上一步</Button>
                    <Button className="rounded-full" onClick={() => {
                      const updated = { ...answers, [q.id]: { acknowledged: true } };
                      setAnswers(updated);
                      const idx = questions.findIndex((x) => x.id === q.id);
                      let nextId: string | null = idx < questions.length - 1 ? questions[idx + 1].id : null;
                      while (nextId) {
                        const nq = questions.find((x) => x.id === nextId);
                        if (nq?.type !== "page_break") break;
                        const ni = questions.findIndex((x) => x.id === nextId);
                        nextId = ni < questions.length - 1 ? questions[ni + 1].id : null;
                      }
                      if (!nextId) handleSubmitQuestionnaire();
                      else { setSegmentHistory((h) => [...h, segmentStart!]); setSegmentStart(nextId); }
                    }}>
                      {cfg.button_label || "下一步"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {step === 2 && isPersonalInfoSegment && (() => {
            const q = currentSegment[0];
            let cfg: { fields: string[]; page_break_title: string } = { fields: ["name", "email", "phone"], page_break_title: "" };
            try { cfg = { ...cfg, ...JSON.parse(q.hint_text ?? "{}") }; } catch {}
            const update = (field: string, val: string) => {
              setAnswers((prev) => {
                let d: Record<string, string> = {};
                try { d = JSON.parse(prev[q.id]?.value ?? "{}"); } catch {}
                return { ...prev, [q.id]: { ...prev[q.id], value: JSON.stringify({ ...d, [field]: val }) } };
              });
            };
            let data: Record<string, string> = {};
            try { data = JSON.parse(answers[q.id]?.value ?? "{}"); } catch {}
            const stepLabel = currentPageIdx >= 0
              ? `第 ${currentPageIdx + 1} 步：${pageList[currentPageIdx].title}`
              : cfg.page_break_title || q.text || "基础信息";
            return (
              <Card>
                <CardHeader><CardTitle>{stepLabel}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {cfg.fields.includes("name") && (
                    <div className="space-y-1">
                      <Label>姓名{q.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input value={data.name ?? ""} onChange={(e) => update("name", e.target.value)} placeholder="请填写姓名" />
                    </div>
                  )}
                  {cfg.fields.includes("email") && (
                    <div className="space-y-1">
                      <Label>邮箱{q.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input type="email" value={data.email ?? ""} onChange={(e) => update("email", e.target.value)} placeholder="请填写邮箱" />
                    </div>
                  )}
                  {cfg.fields.includes("phone") && (
                    <div className="space-y-1">
                      <Label>手机号码{q.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                      <PhoneInput value={data.phone ?? ""} onChange={(v) => update("phone", v)} />
                    </div>
                  )}
                  {cfg.fields.includes("gender") && (
                    <div className="space-y-1">
                      <Label>性别{q.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                      <RadioGroup value={data.gender ?? ""} onValueChange={(v) => update("gender", v)} className="flex gap-6">
                        {[{ v: "male", l: "男" }, { v: "female", l: "女" }, { v: "other", l: "其他" }].map((o) => (
                          <div key={o.v} className="flex items-center gap-2">
                            <RadioGroupItem value={o.v} id={`pi-${q.id}-${o.v}`} />
                            <Label htmlFor={`pi-${q.id}-${o.v}`} className="font-normal cursor-pointer">{o.l}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                  {cfg.fields.includes("birth_year") && (
                    <div className="space-y-1">
                      <Label>出生年份{q.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input type="number" placeholder="例：1990" min="1900" max="2020" value={data.birth_year ?? ""} onChange={(e) => update("birth_year", e.target.value)} className="max-w-xs" />
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="rounded-full" onClick={handlePrevSegment}>上一步</Button>
                    <Button className="flex-1 rounded-full" onClick={handleNextSegment}>下一步</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {step === 2 && !isSectionCoverSegment && !isPersonalInfoSegment && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {currentPageIdx >= 0 && pageList.length > 0
                    ? `第 ${currentPageIdx + 1} 步：${pageList[currentPageIdx].title}`
                    : "第 2 步：问卷评估"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">本课程暂无入组问卷，可直接提交报名。</p>
                ) : (
                  currentSegment.map((q) => (
                    <QuestionRenderer
                      key={q.id}
                      question={q}
                      answer={answers[q.id] ?? {}}
                      onChange={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
                    />
                  ))
                )}
                <div className="flex gap-3 pt-2">
                  {useSegments ? (
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
