"use client";

import { ExtractedEvent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SummaryStats({ events }: { events: ExtractedEvent[] }) {
  const total = events.length;
  const exams = events.filter((e) => e.event_type === "exam").length;
  const homeworks = events.filter((e) => e.event_type === "homework").length;
  const selected = events.filter((e) => e.selected).length;

  const stats = [
    { label: "Total Events", value: total, color: "text-pine" },
    { label: "Total Exams", value: exams, color: "text-brick" },
    { label: "Total Homeworks", value: homeworks, color: "text-mustard" },
    { label: "Selected", value: selected, color: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="pb-2">
            <CardTitle className={`font-serif text-3xl ${s.color}`}>{s.value}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">{s.label}</CardContent>
        </Card>
      ))}
    </div>
  );
}
