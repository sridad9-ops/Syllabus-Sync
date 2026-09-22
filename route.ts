import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { EVENT_TYPE_COLOR_ID, ExtractedEvent } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated with Google." }, { status: 401 });
  }

  const { events } = (await req.json()) as { events: ExtractedEvent[] };

  if (!events?.length) {
    return NextResponse.json({ error: "No events provided." }, { status: 400 });
  }

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const ev of events) {
    const body: Record<string, unknown> = {
      summary: `[${ev.event_type.toUpperCase()}] ${ev.title}`,
      description: ev.description || undefined,
      colorId: EVENT_TYPE_COLOR_ID[ev.event_type],
    };

    if (ev.start_time) {
      const startDateTime = `${ev.due_date}T${ev.start_time}:00`;
      const endDateTime = `${ev.due_date}T${ev.end_time || ev.start_time}:00`;
      body.start = { dateTime: startDateTime };
      body.end = { dateTime: endDateTime };
    } else {
      // All-day event: end date is exclusive, so add one day.
      const [y, m, d] = ev.due_date.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1, d + 1));
      const nextStr = next.toISOString().slice(0, 10);
      body.start = { date: ev.due_date };
      body.end = { date: nextStr };
    }

    try {
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        results.push({ id: ev.id, success: false, error: errBody?.error?.message || res.statusText });
      } else {
        results.push({ id: ev.id, success: true });
      }
    } catch (err: any) {
      results.push({ id: ev.id, success: false, error: err.message });
    }
  }

  const failures = results.filter((r) => !r.success);

  return NextResponse.json({
    synced: results.length - failures.length,
    failed: failures.length,
    results,
  });
}
