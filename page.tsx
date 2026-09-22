"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { signIn, useSession } from "next-auth/react";
import { CalendarPlus, Download, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryStats } from "@/components/summary-stats";
import { EventsTable } from "@/components/events-table";
import { downloadIcsFile } from "@/lib/ics-export";
import { ExtractedEvent } from "@/lib/types";

interface StoredParseResult {
  course_name: string;
  course_code?: string | null;
  events: ExtractedEvent[];
  warnings: string[];
}

export default function ReviewPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [courseName, setCourseName] = useState<string>("");
  const [events, setEvents] = useState<ExtractedEvent[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("syllabus-sync-parsed");
    if (!raw) {
      router.replace("/");
      return;
    }
    const parsed: StoredParseResult = JSON.parse(raw);
    setCourseName(parsed.course_name);
    setEvents(parsed.events);
    setWarnings(parsed.warnings || []);
  }, [router]);

  function addManualEvent() {
    const newEvent: ExtractedEvent = {
      id: uuidv4(),
      title: "New assignment",
      event_type: "homework",
      due_date: new Date().toISOString().slice(0, 10),
      start_time: null,
      end_time: null,
      description: "",
      weight_percentage: null,
      selected: true,
    };
    setEvents((prev) => [newEvent, ...prev]);
  }

  function handleExportIcs() {
    const selected = events.filter((e) => e.selected);
    downloadIcsFile(selected, `${courseName || "syllabus"}-events.ics`);
  }

  async function handleSyncGoogle() {
    if (!session) {
      await signIn("google");
      return;
    }

    const selected = events.filter((e) => e.selected);
    if (!selected.length) {
      setSyncMessage("Select at least one event to sync.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync-google-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSyncMessage(`Synced ${data.synced} event(s) to Google Calendar.${data.failed ? ` ${data.failed} failed.` : ""}`);
    } catch (err: any) {
      setSyncMessage(err.message || "Something went wrong syncing to Google Calendar.");
    } finally {
      setIsSyncing(false);
    }
  }

  const selectedCount = events.filter((e) => e.selected).length;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{courseName || "Review parsed events"}</h1>
        <p className="text-muted-foreground">Review, edit, and select which events to export.</p>
        {warnings.map((w, i) => (
          <p key={i} className="mt-1 text-sm text-amber-600">
            {w}
          </p>
        ))}
      </div>

      <SummaryStats events={events} />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={addManualEvent}>
          <PlusCircle className="h-4 w-4" />
          Add Manual Event
        </Button>
        <div className="ml-auto flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportIcs} disabled={selectedCount === 0}>
            <Download className="h-4 w-4" />
            Download .ics ({selectedCount})
          </Button>
          <Button onClick={handleSyncGoogle} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {session ? `Sync to Google Calendar (${selectedCount})` : "Sign in & Sync to Google Calendar"}
          </Button>
        </div>
      </div>

      {syncMessage && <p className="text-sm">{syncMessage}</p>}

      <EventsTable events={events} onChange={setEvents} />
    </main>
  );
}
