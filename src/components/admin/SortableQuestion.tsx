import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeLabel: Record<string, string> = {
  yes_no: "是/否",
  single_choice: "单选",
  multiple_choice: "多选",
  text_input: "文本",
  personal_info: "个人信息",
};

interface Props {
  id: string;
  text: string;
  type: string;
  required: boolean;
  optionsCount: number;
  hasExclusion: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const SortableQuestion = ({ id, text, type, required, optionsCount, hasExclusion, onEdit, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <Card ref={setNodeRef} style={style} className="border bg-background">
      <CardContent className="flex items-start gap-3 p-4">
        <button {...attributes} {...listeners} className="mt-1 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 space-y-2">
          <p className="font-medium leading-relaxed">{text}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">{typeLabel[type] ?? type}</Badge>
            {required && <Badge variant="outline" className="text-xs">必填</Badge>}
            {optionsCount > 0 && <Badge variant="outline" className="text-xs">{optionsCount} 个选项</Badge>}
            {hasExclusion && <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20">含排除项</Badge>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SortableQuestion;
