import { ExtractedEvent } from "./types";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIcsDate(dueDate: string, time?: string | null): string {
  // dueDate: YYYY-MM-DD, time: HH:MM (optional)
  const [y, m, d] = dueDate.split("-").map(Number);
  if (time) {
    const [hh, mm] = time.split(":").map(Number);
    return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  }
  return `${y}${pad(m)}${pad(d)}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildIcsCalendar(events: ExtractedEvent[], calendarName = "Syllabus Sync"): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Syllabus Sync//EN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "CALSCALE:GREGORIAN",
  ];

  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(
    now.getUTCHours()
  )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@syllabus-sync`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (ev.start_time) {
      lines.push(`DTSTART:${toIcsDate(ev.due_date, ev.start_time)}`);
      lines.push(`DTEND:${toIcsDate(ev.due_date, ev.end_time || ev.start_time)}`);
    } else {
      // All-day event
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(ev.due_date)}`);
      const [y, m, d] = ev.due_date.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1, d + 1));
      lines.push(
        `DTEND;VALUE=DATE:${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`
      );
    }

    lines.push(`SUMMARY:${escapeIcsText(`[${ev.event_type.toUpperCase()}] ${ev.title}`)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcsFile(events: ExtractedEvent[], filename = "syllabus-events.ics") {
  const ics = buildIcsCalendar(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
