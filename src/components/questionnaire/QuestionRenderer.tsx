import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Info } from "lucide-react";

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  is_exclusion: boolean;
  allow_free_text: boolean;
  hint_title: string | null;
  hint_body: string | null;
  sort_order: number;
}

export interface Question {
  id: string;
  type: "yes_no" | "single_choice" | "multiple_choice" | "text_input" | "personal_info" | "dropdown" | "likert";
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
  const fallbackYesNo: QuestionOption[] = [
    { id: "_yes", label: "是", value: "yes", is_exclusion: false, allow_free_text: false, hint_title: null, hint_body: null, sort_order: 1 },
    { id: "_no", label: "否", value: "no", is_exclusion: false, allow_free_text: false, hint_title: null, hint_body: null, sort_order: 2 },
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
      <Label className="text-base leading-relaxed">
        {question.text}
        {question.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>

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
                我了解并同意
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionRenderer;
