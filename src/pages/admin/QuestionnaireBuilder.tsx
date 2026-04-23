import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
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
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, ImagePlus, X } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableQuestion from "@/components/admin/SortableQuestion";

type QType = "yes_no" | "single_choice" | "multiple_choice" | "text_input" | "dropdown" | "likert" | "text_display" | "section_cover";

interface Option {
  id?: string;
  label: string;
  value: string;
  is_exclusion: boolean;
  allow_free_text: boolean;
  hint_title: string;
  hint_body: string;
  hint_button: string;
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
  { label: "是", value: "yes", is_exclusion: false, allow_free_text: false, hint_title: "", hint_body: "", hint_button: "", sort_order: 1 },
  { label: "否", value: "no", is_exclusion: false, allow_free_text: false, hint_title: "", hint_body: "", hint_button: "", sort_order: 2 },
];

const QuestionnaireBuilder = () => {
  const { id: serviceId } = useParams<{ id: string }>();
  const [serviceName, setServiceName] = useState("");
  const [questionnaire, setQuestionnaire] = useState<{
    id: string; title: string; description: string | null; cover_image_url: string | null;
    consent_enabled: boolean; consent_statement: string | null; consent_link_text: string | null; consent_body: string | null;
  } | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState<{ id: string; thumb: string; regular: string; download_location: string; photographer: string; photographer_url: string }[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [showUnsplash, setShowUnsplash] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<typeof unsplashResults[0] | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
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
      .update({ title: questionnaire.title, description: questionnaire.description, cover_image_url: questionnaire.cover_image_url, consent_enabled: questionnaire.consent_enabled, consent_statement: questionnaire.consent_statement, consent_link_text: questionnaire.consent_link_text, consent_body: questionnaire.consent_body })
      .eq("id", questionnaire.id);
    if (error) return toast.error(error.message);
    toast.success("已保存");
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const url = URL.createObjectURL(e.target.files[0]);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropSrc(url);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const searchUnsplash = async () => {
    if (!unsplashQuery.trim()) return;
    setUnsplashLoading(true);
    try {
      const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
      if (!key) { toast.error("未找到 VITE_UNSPLASH_ACCESS_KEY，请检查 .env 文件"); setUnsplashLoading(false); return; }
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=12&client_id=${key}`
      );
      const json = await res.json();
      if (!res.ok) { toast.error(`Unsplash 错误 ${res.status}：${json.errors?.[0] ?? res.statusText}`); setUnsplashLoading(false); return; }
      const results = (json.results ?? []).map((p: any) => ({
        id: p.id,
        thumb: p.urls.small,
        regular: p.urls.regular,
        download_location: p.links.download_location,
        photographer: p.user.name,
        photographer_url: p.user.links.html,
      }));
      setUnsplashResults(results);
      if (results.length === 0) toast.info("没有找到相关图片，试试其他关键词");
    } catch (e: any) { toast.error("Unsplash 搜索失败：" + e.message); }
    setUnsplashLoading(false);
  };

  const selectUnsplashPhoto = (photo: typeof unsplashResults[0]) => {
    fetch(`${photo.download_location}&client_id=${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`);
    setPreviewPhoto(null);
    setShowUnsplash(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropSrc(photo.regular);
  };

  const onCropComplete = useCallback((_: unknown, pixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const confirmCrop = async () => {
    if (!questionnaire || !cropSrc || !croppedAreaPixels) return;
    setUploadingCover(true);
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => { image.onload = () => res(); image.onerror = rej; image.src = cropSrc; });
      const canvas = document.createElement("canvas");
      const TARGET_W = 1400, TARGET_H = 280;
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, TARGET_W, TARGET_H);
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(), "image/jpeg", 0.92));
      const path = `${questionnaire.id}/cover-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("questionnaire-covers").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("questionnaire-covers").getPublicUrl(path);
      const updated = { ...questionnaire, cover_image_url: publicUrl };
      setQuestionnaire(updated);
      await supabase.from("questionnaires").update({ cover_image_url: publicUrl }).eq("id", questionnaire.id);
      setCropSrc(null);
      toast.success("封面图已保存");
    } catch (e: any) {
      toast.error("保存失败：" + (e.message ?? e));
    }
    setUploadingCover(false);
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
      setEditing({ ...editing, type: v, question_options: YES_NO_OPTIONS.map(o => ({ ...o })), hint_text: null, is_required: true });
    } else if (v === "likert") {
      setEditing({ ...editing, type: v, question_options: [], hint_text: JSON.stringify({ size: 5, min: "", max: "" }), jump_logic: {} });
    } else if (v === "text_display") {
      setEditing({ ...editing, type: v, question_options: [], hint_text: JSON.stringify({ body: "", button_enabled: false, button_label: "" }), is_required: false, jump_logic: {} });
    } else if (v === "section_cover") {
      setEditing({ ...editing, type: v, question_options: [], hint_text: JSON.stringify({ body: "", button_label: "" }), is_required: false, jump_logic: {} });
    } else if (editing.type === "yes_no" || editing.type === "likert" || editing.type === "text_display" || editing.type === "section_cover") {
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

  const getTextDisplayConfig = (): { body: string; button_enabled: boolean; button_label: string } => {
    try { return { body: "", button_enabled: false, button_label: "", ...JSON.parse(editing?.hint_text ?? "{}") }; } catch { return { body: "", button_enabled: false, button_label: "" }; }
  };
  const setTextDisplayConfig = (cfg: { body: string; button_enabled: boolean; button_label: string }) => {
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
          hint_button: o.hint_button || null,
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
  const showOptions = editing && !["text_input", "likert", "text_display", "section_cover"].includes(editing.type ?? "");
  const showJumpLogic = editing && !["likert", "text_display", "section_cover"].includes(editing.type ?? "");

  return (
    <AdminLayout>
      <Link to="/admin/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 返回服务列表
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold">问卷构建器</h1>
      <p className="mt-1 text-sm text-muted-foreground">{serviceName}</p>

      {questionnaire && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">问卷封面（留空则不显示封面）</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>封面图 Banner</Label>
              <div className="space-y-2">
                {questionnaire.cover_image_url && (
                  <div className="relative w-full overflow-hidden rounded-lg border">
                    <img src={questionnaire.cover_image_url} alt="封面图" className="w-full object-cover" style={{ aspectRatio: "5/1" }} />
                    <button
                      type="button"
                      className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                      onClick={async () => {
                        const updated = { ...questionnaire, cover_image_url: null };
                        setQuestionnaire(updated);
                        await supabase.from("questionnaires").update({ cover_image_url: null }).eq("id", questionnaire.id);
                        toast.success("封面图已移除");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingCover} onClick={() => coverInputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    {uploadingCover ? "上传中..." : "上传图片"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowUnsplash((v) => !v)}>
                    🔍 从 Unsplash 搜索
                  </Button>
                </div>
                {showUnsplash && (
                  <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                    <div className="flex gap-2">
                      <Input
                        placeholder="搜索图片关键词，例如：nature, city..."
                        value={unsplashQuery}
                        onChange={(e) => setUnsplashQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchUnsplash()}
                        className="flex-1"
                      />
                      <Button type="button" size="sm" onClick={searchUnsplash} disabled={unsplashLoading}>
                        {unsplashLoading ? "搜索中..." : "搜索"}
                      </Button>
                    </div>
                    {unsplashResults.length > 0 && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {unsplashResults.map((photo) => (
                            <button
                              key={photo.id}
                              type="button"
                              className={`relative group overflow-hidden rounded-md border transition-all hover:ring-2 hover:ring-primary ${previewPhoto?.id === photo.id ? "ring-2 ring-primary" : ""}`}
                              onClick={() => setPreviewPhoto(previewPhoto?.id === photo.id ? null : photo)}
                            >
                              <img src={photo.thumb} alt={photo.photographer} className="w-full h-20 object-cover" />
                              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-white text-[10px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                {photo.photographer}
                              </div>
                            </button>
                          ))}
                        </div>
                        {previewPhoto && (
                          <div className="rounded-lg border overflow-hidden bg-background shadow-md">
                            <img src={previewPhoto.regular} alt={previewPhoto.photographer} className="w-full object-cover max-h-48" />
                            <div className="flex items-center justify-between px-3 py-2">
                              <a
                                href={`${previewPhoto.photographer_url}?utm_source=sparks&utm_medium=referral`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-muted-foreground hover:text-foreground truncate"
                              >
                                📷 {previewPhoto.photographer} / Unsplash
                              </a>
                              <Button size="sm" className="ml-3 shrink-0 rounded-full" onClick={() => selectUnsplashPhoto(previewPhoto)}>
                                使用这张
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Photos from <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="underline">Unsplash</a>
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>标题</Label>
              <Input placeholder="留空则不显示标题" value={questionnaire.title} onChange={(e) => setQuestionnaire({ ...questionnaire, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>正文</Label>
              <RichTextEditor
                value={questionnaire.description ?? ""}
                onChange={(html) => setQuestionnaire({ ...questionnaire, description: html })}
                placeholder="在这里输入封面页正文内容..."
              />
            </div>
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={questionnaire.consent_enabled}
                  onCheckedChange={(c) => setQuestionnaire({ ...questionnaire, consent_enabled: c })}
                />
                <Label className="font-medium">启用知情同意</Label>
              </div>
              {questionnaire.consent_enabled && (
                <div className="space-y-3 pl-1">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      陈述文字 <span className="text-muted-foreground font-normal">— 选中文字后点「插入知情同意书链接」按钮</span>
                    </Label>
                    <RichTextEditor
                      value={questionnaire.consent_statement ?? ""}
                      onChange={(html) => setQuestionnaire({ ...questionnaire, consent_statement: html })}
                      placeholder="例：我已阅读并同意《知情同意书》中的相关条款"
                      showConsentLink
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">知情同意书正文（点击链接后展示）</Label>
                    <RichTextEditor
                      value={questionnaire.consent_body ?? ""}
                      onChange={(html) => setQuestionnaire({ ...questionnaire, consent_body: html })}
                      placeholder="在此输入完整的知情同意书内容..."
                    />
                  </div>
                </div>
              )}
            </div>
            <Button onClick={saveQuestionnaireMeta} variant="outline">保存</Button>
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
                <Label>{editing.type === "text_display" ? "标题" : "问题文本 *"}</Label>
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
                      <SelectItem value="text_display">纯文本</SelectItem>
                      <SelectItem value="section_cover">分页封面</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editing.type !== "text_display" && (
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={editing.is_required ?? true} onCheckedChange={(c) => setEditing({ ...editing, is_required: c })} />
                    <Label>必填</Label>
                  </div>
                )}
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
                            { label: "", value: "", is_exclusion: false, allow_free_text: false, hint_title: "", hint_body: "", hint_button: "", sort_order: (editing.question_options?.length ?? 0) + 1 }
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
                            <div className="space-y-1">
                              <Label className="text-xs">按钮文字（留空默认"我知道了"）</Label>
                              <Input
                                placeholder="例如：我了解，继续"
                                value={opt.hint_button ?? ""}
                                onChange={(e) => updateOption(i, { hint_button: e.target.value })}
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

              {editing?.type === "text_display" && (() => {
                const cfg = getTextDisplayConfig();
                return (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">正文（支持 HTML）</Label>
                      <Textarea
                        rows={6}
                        placeholder={"例如：<p>这是一段说明</p><ul><li>要点一</li></ul>"}
                        value={cfg.body}
                        onChange={(e) => setTextDisplayConfig({ ...cfg, body: e.target.value })}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cfg.button_enabled}
                        onCheckedChange={(c) => setTextDisplayConfig({ ...cfg, button_enabled: c })}
                      />
                      <Label>启用确认按钮（需点击才能继续）</Label>
                    </div>
                    {cfg.button_enabled && (
                      <div className="space-y-1">
                        <Label className="text-xs">按钮文字（留空默认"我知道了"）</Label>
                        <Input
                          placeholder="我知道了"
                          value={cfg.button_label}
                          onChange={(e) => setTextDisplayConfig({ ...cfg, button_label: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {editing?.type === "section_cover" && (() => {
                const raw = (() => { try { return JSON.parse(editing.hint_text ?? "{}"); } catch { return {}; } })();
                const cfg = { body: "", button_label: "", ...raw };
                const setCfg = (patch: { body?: string; button_label?: string }) =>
                  editing && setEditing({ ...editing, hint_text: JSON.stringify({ ...cfg, ...patch }) });
                return (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">正文（支持 HTML）</Label>
                      <Textarea
                        rows={6}
                        placeholder={"例如：<p>这是本节的介绍</p>"}
                        value={cfg.body}
                        onChange={(e) => setCfg({ body: e.target.value })}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">按钮文字（留空默认"下一步"）</Label>
                      <Input
                        placeholder="下一步"
                        value={cfg.button_label}
                        onChange={(e) => setCfg({ button_label: e.target.value })}
                      />
                    </div>
                  </div>
                );
              })()}

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

      <Dialog open={!!cropSrc} onOpenChange={(o) => { if (!o) setCropSrc(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>裁剪封面图 <span className="text-xs font-normal text-muted-foreground ml-1">（3:1 宽幅比例）</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ height: 280 }}>
              {cropSrc && (
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={5}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-muted-foreground w-10 shrink-0">缩放</span>
              <input
                type="range" min={1} max={3} step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">{zoom.toFixed(1)}x</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropSrc(null)}>取消</Button>
            <Button onClick={confirmCrop} disabled={uploadingCover}>
              {uploadingCover ? "保存中..." : "确认裁剪"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default QuestionnaireBuilder;
