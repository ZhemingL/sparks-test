import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Info } from "lucide-react";

export interface FormatEntry {
  type: string;
  sessions: number;
  duration: string;
}

export interface Workshop {
  id: string;
  title: string;
  description: string;
  formats: FormatEntry[];
  schedule: string;
  extraInfo?: string;
  price: string;
  discountPrice?: string;
  hasDiscount?: boolean;
  tags: string[];
  status: "招募中" | "即将开始" | "已满" | "暂停";
}

const formatDateRange = (schedule: string) => {
  if (!schedule) return "";
  const parts = schedule.split("|");
  if (parts.length === 2 && parts[0] && parts[1]) return `${parts[0]} 至 ${parts[1]}`;
  return schedule;
};

const parseFormats = (raw: string): FormatEntry[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ type: raw, sessions: 0, duration: "" }];
};

const WorkshopCard = ({ workshop }: { workshop: Workshop }) => {
  const statusColor: Record<string, string> = {
    "招募中": "bg-green-100 text-green-700",
    "即将开始": "bg-blue-100 text-blue-700",
    "已满": "bg-red-100 text-red-700",
    "暂停": "bg-orange-100 text-orange-700",
  };

  const isOpen = workshop.status === "招募中";
  const dateRange = formatDateRange(workshop.schedule);

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <div className="h-2 bg-primary" />
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{workshop.title}</CardTitle>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[workshop.status]}`}>
            {workshop.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{workshop.description}</p>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {workshop.formats.length > 0 && (
          <div className="space-y-1.5">
            {workshop.formats.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {f.type}
                  {f.sessions > 0 && ` · ${f.sessions}节`}
                  {f.duration && ` · ${f.duration}/节`}
                </span>
              </div>
            ))}
          </div>
        )}
        {dateRange && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{dateRange}</span>
          </div>
        )}
        {workshop.extraInfo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            <span>{workshop.extraInfo}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {workshop.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-4">
        {workshop.hasDiscount && workshop.discountPrice ? (
          <span className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground line-through">{workshop.price}</span>
            <span className="text-lg font-bold text-primary">{workshop.discountPrice}</span>
          </span>
        ) : (
          <span className="text-lg font-bold text-primary">{workshop.price}</span>
        )}
        {isOpen ? (
          <Link to={`/register/${workshop.id}`}>
            <Button size="sm" className="rounded-full">立即报名</Button>
          </Link>
        ) : (
          <Button size="sm" className="rounded-full" disabled>
            {workshop.status}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default WorkshopCard;
