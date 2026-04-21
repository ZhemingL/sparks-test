import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableQuestion from "@/components/admin/SortableQuestion";

type QType = "yes_no" | "single_choice" | "multiple_choice" | "text_input" | "dropdown" | "likert";

interface Option {
  id?: string;
  label: string;
  value: string;
  is_exclusion: boolean;
  allow_free_text: boolean;
  hint_title: string;
  hint_body: string;
  sort_order: number;
  _hintOpen?: boolean;
}

interface Question {
  id: string;
  sort_order: number;
  type: QType;
  text: string;
  is_required: boolean;
  hint_text: string | null;
  hint_trigger_value: string | null;
  jump_logic: any;
  question_options: Option[];
}

const YES_NO_OPTIONS: Option[] = [
  { label: "是", value: "yes", is_exclusion: false, allow_free_text: false, hint_title: "", hint_body: "", sort_order: 1 },
  { label: "否", value: "no", is_exclusion: false, allow_free_text: false, hint_title: "", hint_body: "", sort_order: 2 },
];

const QuestionnaireBuilder = () => {
  const { id: serviceId } = useParams<{ id: string }>();
  const [serviceName, setServiceName] = useState("");
  const [questionnaire, setQuestionnaire] = useState<{ id: string; title: string; description: string | null } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<Partial<Question> | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    if (!serviceId) return;
    const { data: svc } = await supabase.from("services").select("name").eq("id", serviceId).maybeSingle();
    if (svc) setServiceName(svc.name);

    let { data: q } = await supabase.from("questionnaires").select("*").eq("service_id", serviceId).maybeSingle();
    if (!q) {
      const { data: created } = await supabase
        .from("questionnaires")
        .insert({ service_id: serviceId, title: `${svc?.name ?? "服务"}入组问卷` })
        .select().single();
      q = created!;
    }
    setQuestionnaire(q as any);

    const { data: qs } = await supabase
      .from("questions").select("*, question_options(*)").eq("questionnaire_id", q!.id).order("sort_order");
    setQuestions((qs as any) ?? []);
  };

  useEffect(() => { load(); }, [serviceId]);

  const saveQuestionnaireMeta = async () => {
    if (!questionnaire) return;
    const { error } = await supabase.from("questionnaires")
      .update({ title: questionnaire.title, description: questionnaire.description }).eq("id", questionnaire.id);
    if (error) return toast.error(error.message);
    toast.success("已保存");
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex((q) => q.id === active.id);
    const newIdx = questions.findIndex((q) => q.id === over.id);
    const next = arrayMove(questions, oldIdx, newIdx);
    setQuestions(next);
    await Promise.all(next.map((q, i) => supabase.from("questions").update({ sort_order: i + 1 }).eq("id", q.id)));
  };

  const newQuestion = (): Partial<Question> => ({
    type: "single_choice",
    text: "",
    is_required: true,
    hint_text: null,
    hint_trigger_value: null,
    jump_logic: {},
    question_options: [],
  });

  const handleTypeChange = (v: QType) => {
    if (!editing) return;
    if (v === "yes_no") {
      setEditing({ ...editing, type: v, question_options: YES_NO_OPTIONS.map(o => ({ ...o })), hint_text: null });
    } else if (v === "likert") {
      setEditing({ ...editing, type: v, question_options: [], hint_text: JSON.stringify({ size: 5, min: "", max: "" }), jump_logic: {} });
    } else if (editing.type === "yes_no" || editing.type === "likert") {
      setEditing({ ...editing, type: v, question_options: [], hint_text: null });
    } else {
      setEditing({ ...editing, type: v });
    }
  };

  const getLikertConfig = (): { size: number; min: string; max: string } => {
    try { return JSON.parse(editing?.hint_text ?? "{}"); } catch { return { size: 5, min: "", max: "" }; }
  };
  const setLikertConfig = (cfg: { size: number; min: string; max: string }) => {
    if (!editing) return;
    setEditing({ ...editing, hint_text: JSON.stringify(cfg) });
  };

  const updateOption = (i: number, patch: Partial<Option>) => {
    if (!editing) return;
    const next = [...(editing.question_options ?? [])];
    next[i] = { ...next[i], ...patch };
    setEditing({ ...editing, question_options: next });
  };

  const saveQuestion = async () => {
    if (!editing || !questionnaire) return;
    if (!editing.text?.trim()) return toast.error("请填写问题文本");

    const payload: any = {
      questionnaire_id: questionnaire.id,
      type: editing.type,
      text: editing.text,
      is_required: editing.is_required ?? true,
      hint_text: editing.hint_text ?? null,
      hint_trigger_value: null,
      jump_logic: editing.jump_logic ?? {},
      sort_order: editing.sort_order ?? questions.length + 1,
    };

    let qid = editing.id;
    if (qid) {
      const { error } = await supabase.from("questions").update(payload).eq("id", qid);
      if (error) return toast.error(error.message);
      await supabase.from("question_options").delete().eq("question_id", qid);
    } else {
      const { data, error } = await supabase.from("questions").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      qid = data.id;
    }

    const opts = editing.question_options ?? [];
    if (opts.length) {
      const { error } = await supabase.from("question_options").insert(
        opts.map((o, i) => ({
          question_id: qid,
          label: o.label,
          value: o.value || o.label,
          is_exclusion: o.is_exclusion,
          allow_free_text: o.allow_free_text,
          hint_title: o.hint_title || null,
          hint_body: o.hint_body || null,
          sort_order: i + 1,
        })),
      );
      if (error) return toast.error(error.message);
    }

    toast.success("已保存");
    setEditing(null);
    load();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("确定删除此问题？")) return;
    await supabase.from("questions").delete().eq("id", id);
    load();
  };

  const isYesNo = editing?.type === "yes_no";
  const showOptions = editing && !["text_input", "likert"].includes(editing.type ?? "");
  const showJumpLogic = editing && editing.type !== "likert";

  return (
    <AdminLayout>
      <Link to="/admin/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 返回服务列表
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold">问卷构建器</h1>
      <p className="mt-1 text-sm text-muted-foreground">{serviceName}</p>

      {questionnaire && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">问卷信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input value={questionnaire.title} onChange={(e) => setQuestionnaire({ ...questionnaire, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea rows={2} value={questionnaire.description ?? ""} onChange={(e) => setQuestionnaire({ ...questionnaire, description: e.target.value })} />
            </div>
            <Button onClick={saveQuestionnaireMeta} variant="outline">保存问卷信息</Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-medium">问题列表（拖拽排序）</h2>
        <Button onClick={() => setEditing(newQuestion())} className="rounded-full">
          <Plus className="h-4 w-4 mr-1" /> 添加问题
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            {questions.map((q) => (
              <SortableQuestion
                key={q.id} id={q.id} text={q.text} type={q.type} required={q.is_required}
                optionsCount={q.question_options?.length ?? 0}
                hasExclusion={q.question_options?.some((o) => o.is_exclusion) ?? false}
                onEdit={() => setEditing({ ...q })} onDelete={() => deleteQuestion(q.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">还没有问题，点击「添加问题」开始构建</p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "编辑问题" : "新建问题"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>问题文本 *</Label>
                <Textarea rows={2} value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select value={editing.type} onValueChange={(v) => handleTypeChange(v as QType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes_no">是 / 否</SelectItem>
                      <SelectItem value="single_choice">单选</SelectItem>
                      <SelectItem value="multiple_choice">多选</SelectItem>
                      <SelectItem value="dropdown">下拉选择</SelectItem>
                      <SelectItem value="text_input">文本输入</SelectItem>
                      <SelectItem value="likert">Likert 量表</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editing.is_required ?? true} onCheckedChange={(c) => setEditing({ ...editing, is_required: c })} />
                  <Label>必填</Label>
                </div>
              </div>

              {showOptions && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>选项</Label>
                    {!isYesNo && (
                      <Button type="button" size="sm" variant="outline" onClick={() =>
                        setEditing({
                          ...editing,
                          question_options: [...(editing.question_options ?? []),
                            { label: "", value: "", is_exclusion: false, allow_free_text: false, hint_title: "", hint_body: "", sort_order: (editing.question_options?.length ?? 0) + 1 }
                          ],
                        })
                      }>
                        <Plus className="h-4 w-4 mr-1" /> 添加选项
                      </Button>
                    )}
                  </div>
                  {isYesNo && (
                    <p className="text-xs text-muted-foreground">是/否题已自动生成选项，可为每个选项配置提示。</p>
                  )}
                  <div className="space-y-3">
                    {(editing.question_options ?? []).map((opt, i) => (
                      <div key={i} className="rounded-md border overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 p-3">
                          {isYesNo ? (
                            <span className="font-medium text-sm w-8">{opt.label}</span>
                          ) : (
                            <div className="flex flex-1 gap-3 min-w-0">
                              <div className="flex-1 min-w-[120px] space-y-1">
                                <p className="text-xs text-muted-foreground">标签（用户看到的文字）</p>
                                <Input
                                  value={opt.label}
                                  onChange={(e) => updateOption(i, { label: e.target.value })}
                                />
                              </div>
                              <div className="w-32 space-y-1">
                                <p className="text-xs text-muted-foreground">值编码（留空=同标签）</p>
                                <Input
                                  value={opt.value}
                                  onChange={(e) => updateOption(i, { value: e.target.value })}
                                />
                              </div>
                            </div>
                          )}
                          <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                            <Switch checked={opt.is_exclusion} onCheckedChange={(c) => updateOption(i, { is_exclusion: c })} />
                            排除
                          </label>
                          {!isYesNo && (
                            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                              <Switch checked={opt.allow_free_text} onCheckedChange={(c) => updateOption(i, { allow_free_text: c })} />
                              补充说明
                            </label>
                          )}
                          <Button
                            type="button" size="sm" variant="ghost"
                            className="text-xs gap-1 ml-auto"
                            onClick={() => updateOption(i, { _hintOpen: !opt._hintOpen })}
                          >
                            提示 {opt._hintOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                          {!isYesNo && (
                            <Button size="icon" variant="ghost" onClick={() => {
                              const next = (editing.question_options ?? []).filter((_, idx) => idx !== i);
                              setEditing({ ...editing, question_options: next });
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        {opt._hintOpen && (
                          <div className="border-t bg-muted/30 p-3 space-y-2">
                            <div className="space-y-1">
                              <Label className="text-xs">提示标题</Label>
                              <Input
                                placeholder="例如：请注意"
                                value={opt.hint_title ?? ""}
                                onChange={(e) => updateOption(i, { hint_title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">提示正文（支持 HTML）</Label>
                              <Textarea
                                rows={4}
                                placeholder={'例如：<p>这是一段说明</p><ul><li>要点一</li></ul>'}
                                value={opt.hint_body ?? ""}
                                onChange={(e) => updateOption(i, { hint_body: e.target.value })}
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {editing?.type === "likert" && (
                <div className="space-y-3 rounded-md border p-3">
                  <Label>量表配置</Label>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">量表长度</p>
                    <div className="flex gap-2 flex-wrap">
                      {[3, 5, 7, 9, 10].map((n) => {
                        const cfg = getLikertConfig();
                        return (
                          <Button key={n} type="button" size="sm"
                            variant={cfg.size === n ? "default" : "outline"}
                            onClick={() => setLikertConfig({ ...cfg, size: n })}
                          >{n} 点</Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">左端标签（最低分）</Label>
                      <Input
                        placeholder="例：非常不同意"
                        value={getLikertConfig().min}
                        onChange={(e) => setLikertConfig({ ...getLikertConfig(), min: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">右端标签（最高分）</Label>
                      <Input
                        placeholder="例：非常同意"
                        value={getLikertConfig().max}
                        onChange={(e) => setLikertConfig({ ...getLikertConfig(), max: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {showJumpLogic && <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing?.jump_logic?.enabled ?? false}
                    onCheckedChange={(c) => editing && setEditing({
                      ...editing,
                      jump_logic: { enabled: c, rules: editing.jump_logic?.rules ?? {} },
                    })}
                  />
                  <Label>启用跳转逻辑</Label>
                </div>
                {editing?.jump_logic?.enabled && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-muted-foreground">为每个选项设置跳转目标（不设则进入下一题）</p>
                    <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                      ⚠️ 请勿跳转到当前题之前的题目，否则会导致用户陷入无限循环。
                    </p>
                    {(editing.type === "text_input"
                      ? [{ label: "回答后", value: "__any__" }]
                      : editing.type === "yes_no"
                      ? YES_NO_OPTIONS
                      : editing.question_options ?? []
                    ).map((opt) => {
                      const key = opt.value || opt.label;
                      const currentTarget = editing.jump_logic?.rules?.[key] ?? "__next__";
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-sm w-20 shrink-0 text-muted-foreground">选「{opt.label}」</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Select
                            value={currentTarget === null ? "__next__" : currentTarget}
                            onValueChange={(v) => editing && setEditing({
                              ...editing,
                              jump_logic: {
                                ...editing.jump_logic,
                                rules: { ...(editing.jump_logic?.rules ?? {}), [key]: v === "__next__" ? null : v },
                              },
                            })}
                          >
                            <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__next__">下一题（默认）</SelectItem>
                              <SelectItem value="__end__">结束问卷</SelectItem>
                              {questions.filter((q) => q.id !== editing.id).map((q) => (
                                <SelectItem key={q.id} value={q.id}>
                                  第{questions.findIndex((x) => x.id === q.id) + 1}题：{q.text.length > 24 ? q.text.slice(0, 24) + "…" : q.text}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
            <Button onClick={saveQuestion}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default QuestionnaireBuilder;
