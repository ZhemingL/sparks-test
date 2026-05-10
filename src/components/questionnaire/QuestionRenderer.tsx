import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Info } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+86", label: "🇨🇳 +86 中国" },
  { code: "+852", label: "🇭🇰 +852 香港" },
  { code: "+886", label: "🇹🇼 +886 台湾" },
  { code: "+44", label: "🇬🇧 +44 英国" },
  { code: "+1", label: "🇺🇸 +1 美国/加拿大" },
  { code: "+61", label: "🇦🇺 +61 澳大利亚" },
  { code: "+65", label: "🇸🇬 +65 新加坡" },
  { code: "+49", label: "🇩🇪 +49 德国" },
  { code: "+33", label: "🇫🇷 +33 法国" },
  { code: "+81", label: "🇯🇵 +81 日本" },
];

const PhoneInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const parts = value.split(" ");
  const detectedCode = COUNTRY_CODES.find((c) => parts[0] === c.code);
  const code = detectedCode?.code ?? "+86";
  const number = detectedCode ? parts.slice(1).join(" ") : value;
  return (
    <div className="flex gap-2">
      <Select value={code} onValueChange={(c) => onChange(`${c} ${number}`)}>
        <SelectTrigger className="w-36 shrink-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        placeholder="手机号码"
        value={number}
        onChange={(e) => onChange(`${code} ${e.target.value}`)}
        className="flex-1"
      />
    </div>
  );
};

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  is_exclusion: boolean;
  allow_free_text: boolean;
  hint_title: string | null;
  hint_body: string | null;
  hint_button: string | null;
  sort_order: number;
}

export interface Question {
  id: string;
  type: "yes_no" | "single_choice" | "multiple_choice" | "text_input" | "personal_info" | "dropdown" | "likert" | "text_display" | "section_cover" | "consent" | "pii_field" | "page_break";
  text: string;
  is_required: boolean;
  hint_text: string | null;
  hint_trigger_value: string | null;
  jump_logic: { enabled?: boolean; rules?: Record<string, string | null> } | null;
  question_options: QuestionOption[];
}

export interface AnswerState {
  value?: string;
  options?: string[];
  free_text?: string;
  acknowledged?: boolean;
}

interface Props {
  question: Question;
  answer: AnswerState;
  onChange: (a: AnswerState) => void;
}

const QuestionRenderer = ({ question, answer, onChange }: Props) => {
  const [showConsentDoc, setShowConsentDoc] = useState(false);

  const fallbackYesNo: QuestionOption[] = [
    { id: "_yes", label: "是", value: "yes", is_exclusion: false, allow_free_text: false, hint_title: null, hint_body: null, hint_button: null, sort_order: 1 },
    { id: "_no", label: "否", value: "no", is_exclusion: false, allow_free_text: false, hint_title: null, hint_body: null, hint_button: null, sort_order: 2 },
  ];
  const sorted = question.type === "yes_no" && question.question_options.length === 0
    ? fallbackYesNo
    : [...question.question_options].sort((a, b) => a.sort_order - b.sort_order);

  const activeHintOpt = sorted.find((opt) => {
    if (!opt.hint_title && !opt.hint_body) return false;
    if (question.type === "multiple_choice") return answer.options?.includes(opt.value);
    return answer.value === opt.value;
  });

  const requiresAck = !!activeHintOpt;
  const isAcknowledged = !!answer.acknowledged;

  const handleChange = (next: AnswerState) => {
    onChange({ ...next, acknowledged: false });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      {question.type !== "consent" && (
        <Label className="text-base leading-relaxed">
          {question.text}
          {question.is_required && question.type !== "personal_info" && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {question.type === "yes_no" && (
        <RadioGroup value={answer.value ?? ""} onValueChange={(v) => handleChange({ value: v })} className="flex gap-6">
          {sorted.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={opt.id} />
              <Label htmlFor={opt.id} className="font-normal cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.type === "single_choice" && (
        <RadioGroup value={answer.value ?? ""} onValueChange={(v) => handleChange({ value: v })} className="space-y-2">
          {sorted.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={opt.id} />
              <Label htmlFor={opt.id} className="font-normal cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          {sorted.map((opt) => {
            const checked = answer.options?.includes(opt.value) ?? false;
            return (
              <div key={opt.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={opt.id} checked={checked}
                    onCheckedChange={(c) => {
                      const cur = answer.options ?? [];
                      const next = c ? [...cur, opt.value] : cur.filter((v) => v !== opt.value);
                      handleChange({ ...answer, options: next });
                    }}
                  />
                  <Label htmlFor={opt.id} className="font-normal cursor-pointer">{opt.label}</Label>
                </div>
                {opt.allow_free_text && checked && (
                  <Input
                    placeholder="请补充说明..."
                    value={answer.free_text ?? ""}
                    onChange={(e) => onChange({ ...answer, free_text: e.target.value })}
                    maxLength={300}
                    className="ml-6 max-w-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {question.type === "text_input" && (
        <Textarea
          rows={3} placeholder="请填写..."
          value={answer.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
          maxLength={500}
        />
      )}

      {question.type === "dropdown" && (
        <Select value={answer.value ?? ""} onValueChange={(v) => handleChange({ value: v })}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="请选择..." />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((opt) => (
              <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {question.type === "likert" && (() => {
        let cfg = { size: 5, min: "", max: "" };
        try { cfg = { ...cfg, ...JSON.parse(question.hint_text ?? "{}") }; } catch {}
        const size = cfg.size;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {Array.from({ length: size }, (_, i) => {
                const v = String(i + 1);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleChange({ value: v })}
                    className={`h-10 w-10 rounded-full border-2 text-sm font-medium transition-colors ${
                      answer.value === v
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/60"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            {(cfg.min || cfg.max) && (
              <div className="flex justify-between text-xs text-muted-foreground" style={{ width: size * 48 - 8 }}>
                <span>{cfg.min}</span>
                <span>{cfg.max}</span>
              </div>
            )}
          </div>
        );
      })()}

      {question.type === "text_display" && (() => {
        let cfg = { body: "", button_enabled: false, button_label: "" };
        try { cfg = { ...cfg, ...JSON.parse(question.hint_text ?? "{}") }; } catch {}
        return (
          <div className="space-y-3">
            {cfg.body && (
              <div
                className="text-sm text-foreground/80 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: cfg.body }}
              />
            )}
            {cfg.button_enabled && (
              answer.acknowledged ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  已确认
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onChange({ ...answer, acknowledged: true })}
                  className="rounded-full"
                >
                  {cfg.button_label || "我知道了"}
                </Button>
              )
            )}
          </div>
        );
      })()}

      {question.type === "personal_info" && (() => {
        let cfg = { fields: ["name", "email", "phone"] };
        try { cfg = { ...cfg, ...JSON.parse(question.hint_text ?? "{}") }; } catch {}
        let data: Record<string, string> = {};
        try { data = JSON.parse(answer.value ?? "{}"); } catch {}
        const update = (field: string, val: string) => {
          onChange({ ...answer, value: JSON.stringify({ ...data, [field]: val }) });
        };
        return (
          <div className="space-y-3">
            {cfg.fields.includes("name") && (
              <div className="space-y-1">
                <Label className="text-sm">姓名{question.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                <Input value={data.name ?? ""} onChange={(e) => update("name", e.target.value)} placeholder="请填写姓名" />
              </div>
            )}
            {cfg.fields.includes("email") && (
              <div className="space-y-1">
                <Label className="text-sm">邮箱{question.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                <Input type="email" value={data.email ?? ""} onChange={(e) => update("email", e.target.value)} placeholder="请填写邮箱" />
              </div>
            )}
            {cfg.fields.includes("phone") && (
              <div className="space-y-1">
                <Label className="text-sm">手机号码{question.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                <PhoneInput value={data.phone ?? ""} onChange={(v) => update("phone", v)} />
              </div>
            )}
            {cfg.fields.includes("gender") && (
              <div className="space-y-1">
                <Label className="text-sm">性别{question.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                <RadioGroup value={data.gender ?? ""} onValueChange={(v) => update("gender", v)} className="flex gap-6">
                  {[{ v: "male", l: "男" }, { v: "female", l: "女" }, { v: "other", l: "其他" }].map((o) => (
                    <div key={o.v} className="flex items-center gap-2">
                      <RadioGroupItem value={o.v} id={`${question.id}-${o.v}`} />
                      <Label htmlFor={`${question.id}-${o.v}`} className="font-normal cursor-pointer">{o.l}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
            {cfg.fields.includes("birth_year") && (
              <div className="space-y-1">
                <Label className="text-sm">出生年份{question.is_required && <span className="text-destructive ml-1">*</span>}</Label>
                <Input
                  type="number" placeholder="例：1990" min="1900" max="2020"
                  value={data.birth_year ?? ""}
                  onChange={(e) => update("birth_year", e.target.value)}
                  className="max-w-xs"
                />
              </div>
            )}
          </div>
        );
      })()}

      {question.type === "pii_field" && (() => {
        let cfg = { field: "name" };
        try { cfg = { ...cfg, ...JSON.parse(question.hint_text ?? "{}") }; } catch {}
        if (cfg.field === "phone") {
          return (
            <PhoneInput
              value={answer.value ?? ""}
              onChange={(v) => onChange({ ...answer, value: v })}
            />
          );
        }
        if (cfg.field === "email") {
          return (
            <Input
              type="email" placeholder="请填写邮箱"
              value={answer.value ?? ""}
              onChange={(e) => onChange({ ...answer, value: e.target.value })}
              maxLength={200}
            />
          );
        }
        if (cfg.field === "gender") {
          return (
            <RadioGroup value={answer.value ?? ""} onValueChange={(v) => onChange({ ...answer, value: v })} className="flex gap-6">
              {[{ v: "male", l: "男" }, { v: "female", l: "女" }, { v: "other", l: "其他" }].map((o) => (
                <div key={o.v} className="flex items-center gap-2">
                  <RadioGroupItem value={o.v} id={`${question.id}-${o.v}`} />
                  <Label htmlFor={`${question.id}-${o.v}`} className="font-normal cursor-pointer">{o.l}</Label>
                </div>
              ))}
            </RadioGroup>
          );
        }
        if (cfg.field === "birth_year") {
          return (
            <Input
              type="number" placeholder="例：1990" min="1900" max="2020"
              value={answer.value ?? ""}
              onChange={(e) => onChange({ ...answer, value: e.target.value })}
              className="max-w-xs"
            />
          );
        }
        return (
          <Input
            placeholder="请填写..."
            value={answer.value ?? ""}
            onChange={(e) => onChange({ ...answer, value: e.target.value })}
            maxLength={200}
          />
        );
      })()}

      {question.type === "consent" && (() => {
        let cfg = { statement: "", body: "" };
        try { cfg = { ...cfg, ...JSON.parse(question.hint_text ?? "{}") }; } catch {}
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`consent-${question.id}`}
                checked={!!answer.acknowledged}
                onCheckedChange={(c) => onChange({ ...answer, acknowledged: !!c })}
                className="mt-0.5 shrink-0"
              />
              <div
                className="text-sm text-foreground/80 prose prose-sm max-w-none leading-relaxed cursor-pointer"
                onClick={(e) => {
                  const el = e.target as HTMLElement;
                  if (el.tagName === "A" && el.getAttribute("href") === "#consent-doc") {
                    e.preventDefault();
                    setShowConsentDoc(true);
                  }
                }}
                dangerouslySetInnerHTML={{ __html: cfg.statement || "我已阅读并同意相关条款" }}
              />
            </div>
            {cfg.body && (
              <Dialog open={showConsentDoc} onOpenChange={setShowConsentDoc}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>用户协议</DialogTitle>
                  </DialogHeader>
                  <div className="overflow-y-auto flex-1 pr-1">
                    <div
                      className="prose prose-sm max-w-none text-foreground/80"
                      dangerouslySetInnerHTML={{ __html: cfg.body }}
                    />
                  </div>
                  <div className="border-t pt-4 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowConsentDoc(false)}>关闭</Button>
                    <Button onClick={() => { onChange({ ...answer, acknowledged: true }); setShowConsentDoc(false); }}>
                      我已阅读，同意
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        );
      })()}

      {requiresAck && activeHintOpt && (
        <div className="rounded-md border border-primary/30 bg-primary/5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            {activeHintOpt.hint_title && (
              <span className="font-semibold text-sm text-primary">{activeHintOpt.hint_title}</span>
            )}
          </div>
          {activeHintOpt.hint_body && (
            <div
              className="px-4 py-3 text-sm text-foreground/80 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: activeHintOpt.hint_body }}
            />
          )}
          <div className="px-4 py-3 border-t border-primary/20">
            {isAcknowledged ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                已确认
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => onChange({ ...answer, acknowledged: true })}
                className="rounded-full"
              >
                {activeHintOpt.hint_button || "我了解并同意"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { PhoneInput };
export default QuestionRenderer;
