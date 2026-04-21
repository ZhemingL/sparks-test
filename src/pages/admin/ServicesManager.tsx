import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, FileQuestion, X } from "lucide-react";

export interface FormatEntry {
  type: string;
  sessions: number;
  duration: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  discount_enabled: boolean;
  format: string | null;
  sessions: number | null;
  duration: string | null;
  schedule: string | null;
  extra_info: string | null;
  tags: string[] | null;
  status: string | null;
  is_active: boolean;
  sort_order: number | null;
}

interface EditingService extends Partial<Service> {
  startDate?: string;
  endDate?: string;
  formats?: FormatEntry[];
}

const FORMAT_PRESETS = ["线上工作坊", "线上研讨课", "线上团体", "线上个人", "自定义"];

const parseFormats = (format: string | null): FormatEntry[] => {
  if (!format) return [{ type: "线上工作坊", sessions: 0, duration: "" }];
  try {
    const parsed = JSON.parse(format);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ type: format, sessions: 0, duration: "" }];
};

const parseSchedule = (schedule: string | null) => {
  if (!schedule) return { startDate: "", endDate: "" };
  const parts = schedule.split("|");
  return { startDate: parts[0] ?? "", endDate: parts[1] ?? "" };
};

const empty = (): EditingService => ({
  name: "",
  description: "",
  price: 0,
  discount_price: null,
  discount_enabled: false,
  formats: [{ type: "线上工作坊", sessions: 0, duration: "" }],
  startDate: "",
  endDate: "",
  extra_info: "",
  tags: [],
  status: "招募中",
  is_active: true,
  sort_order: 0,
});

const ServicesManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<EditingService | null>(null);
  const [tagInput, setTagInput] = useState("");

  const load = async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    if (data) setServices(data as Service[]);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (s: Service) => {
    const { startDate, endDate } = parseSchedule(s.schedule);
    setEditing({ ...s, startDate, endDate, formats: parseFormats(s.format) });
  };

  const updateFormat = (index: number, field: keyof FormatEntry, value: string | number) => {
    if (!editing) return;
    const formats = [...(editing.formats ?? [])];
    formats[index] = { ...formats[index], [field]: value };
    setEditing({ ...editing, formats });
  };

  const addFormat = () => {
    if (!editing) return;
    setEditing({ ...editing, formats: [...(editing.formats ?? []), { type: "线上工作坊", sessions: 0, duration: "" }] });
  };

  const removeFormat = (index: number) => {
    if (!editing) return;
    const formats = (editing.formats ?? []).filter((_, i) => i !== index);
    setEditing({ ...editing, formats: formats.length ? formats : [{ type: "线上工作坊", sessions: 0, duration: "" }] });
  };

  const save = async () => {
    if (!editing?.name) { toast.error("请填写服务名称"); return; }
    const schedule = editing.startDate || editing.endDate
      ? `${editing.startDate ?? ""}|${editing.endDate ?? ""}`
      : null;
    const format = JSON.stringify(editing.formats ?? []);
    const { startDate: _s, endDate: _e, formats: _f, ...rest } = editing;
    const payload = { ...rest, schedule, format, tags: editing.tags ?? [] };

    const { error } = editing.id
      ? await supabase.from("services").update(payload).eq("id", editing.id)
      : await supabase.from("services").insert(payload as any);
    if (error) { toast.error("保存失败：" + error.message); return; }
    toast.success("保存成功");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("确定删除此服务？所有关联问卷与报名也会被删除。")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("已删除");
    load();
  };

  const toggleActive = async (s: Service) => {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">服务管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理工作坊与团体课程</p>
        </div>
        <Button onClick={() => setEditing(empty())} className="rounded-full">
          <Plus className="h-4 w-4 mr-1" /> 新建服务
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>启用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    {s.discount_enabled && s.discount_price != null ? (
                      <span className="flex items-center gap-1.5">
                        <span className="line-through text-muted-foreground text-xs">{s.price === 0 ? "免费" : `¥${s.price}`}</span>
                        <span className="text-primary font-medium">{s.discount_price === 0 ? "免费" : `¥${s.discount_price}`}</span>
                      </span>
                    ) : (
                      s.price === 0 ? "免费" : `¥${s.price}`
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={s.status ?? "招募中"}
                      onValueChange={async (v) => {
                        await supabase.from("services").update({ status: v }).eq("id", s.id);
                        load();
                      }}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="招募中">招募中</SelectItem>
                        <SelectItem value="即将开始">即将开始</SelectItem>
                        <SelectItem value="已满">已满</SelectItem>
                        <SelectItem value="暂停">暂停</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link to={`/admin/services/${s.id}/questionnaire`}>
                      <Button size="sm" variant="outline">
                        <FileQuestion className="h-4 w-4 mr-1" /> 问卷
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "编辑服务" : "新建服务"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>名称 *</Label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>

              {/* 形式（多行） */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>形式</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addFormat}>
                    <Plus className="h-3 w-3 mr-1" /> 添加形式
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editing.formats ?? []).map((f, i) => (
                    <div key={i} className="flex gap-2 items-start rounded-lg border p-3">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">类型</Label>
                          <Select
                            value={FORMAT_PRESETS.includes(f.type) ? f.type : "自定义"}
                            onValueChange={(v) => updateFormat(i, "type", v === "自定义" ? "" : v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FORMAT_PRESETS.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(!FORMAT_PRESETS.includes(f.type) || f.type === "自定义" || f.type === "") && (
                            <Input
                              className="h-8 text-sm mt-1"
                              placeholder="输入形式名称"
                              value={f.type === "自定义" ? "" : f.type}
                              onChange={(e) => updateFormat(i, "type", e.target.value)}
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">节数</Label>
                          <Input
                            className="h-8 text-sm"
                            type="number"
                            min={0}
                            value={f.sessions}
                            onChange={(e) => updateFormat(i, "sessions", Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">每节时长</Label>
                          <Input
                            className="h-8 text-sm"
                            placeholder="如：90分钟"
                            value={f.duration}
                            onChange={(e) => updateFormat(i, "duration", e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-5 shrink-0"
                        onClick={() => removeFormat(i)}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>价格 (¥)</Label>
                  <Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>排序</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Switch
                      checked={editing.discount_enabled ?? false}
                      onCheckedChange={(c) => setEditing({ ...editing, discount_enabled: c })}
                    />
                    <Label>启用折扣价</Label>
                  </div>
                  {editing.discount_enabled && (
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">折扣价 (¥)</Label>
                      <Input
                        type="number"
                        placeholder="输入折扣价格"
                        value={editing.discount_price ?? ""}
                        onChange={(e) => setEditing({ ...editing, discount_price: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input type="date" value={editing.startDate ?? ""} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input type="date" value={editing.endDate ?? ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>状态</Label>
                  <Select
                    value={editing.status ?? "招募中"}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="招募中">招募中</SelectItem>
                      <SelectItem value="即将开始">即将开始</SelectItem>
                      <SelectItem value="已满">已满</SelectItem>
                      <SelectItem value="暂停">暂停</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>额外信息</Label>
                <Input
                  placeholder="如：每周周六 14:00-15:30"
                  value={editing.extra_info ?? ""}
                  onChange={(e) => setEditing({ ...editing, extra_info: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>标签</Label>
                <div className="flex flex-wrap gap-2">
                  {(editing.tags ?? []).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs cursor-pointer"
                      onClick={() => setEditing({ ...editing, tags: (editing.tags ?? []).filter((x) => x !== t) })}
                    >
                      {t} ×
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="新标签"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (tagInput.trim()) {
                          setEditing({ ...editing, tags: [...(editing.tags ?? []), tagInput.trim()] });
                          setTagInput("");
                        }
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => {
                    if (tagInput.trim()) {
                      setEditing({ ...editing, tags: [...(editing.tags ?? []), tagInput.trim()] });
                      setTagInput("");
                    }
                  }}>添加</Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={(c) => setEditing({ ...editing, is_active: c })} />
                <Label>启用此服务</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ServicesManager;
