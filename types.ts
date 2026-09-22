export type EventType =
  | "homework"
  | "quiz"
  | "exam"
  | "project"
  | "paper"
  | "presentation"
  | "lab"
  | "reading"
  | "other";

export const EVENT_TYPES: EventType[] = [
  "homework",
  "quiz",
  "exam",
  "project",
  "paper",
  "presentation",
  "lab",
  "reading",
  "other",
];

// Google Calendar colorId per event type.
// https://developers.google.com/calendar/api/v3/reference/colors/get
export const EVENT_TYPE_COLOR_ID: Record<EventType, string> = {
  homework: "9", // blueberry
  quiz: "5", // banana
  exam: "11", // tomato
  project: "10", // basil
  paper: "6", // tangerine
  presentation: "3", // grape
  lab: "7", // peacock
  reading: "8", // graphite
  other: "1", // lavender
};

export interface ExtractedEvent {
  id: string;
  title: string;
  event_type: EventType;
  due_date: string; // YYYY-MM-DD
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  weight_percentage?: number | null;
  selected: boolean;
}

export interface SyllabusParseResult {
  course_name: string;
  course_code?: string | null;
  events: Omit<ExtractedEvent, "id" | "selected">[];
}

export interface ParseSyllabusResponse {
  result: SyllabusParseResult;
  warnings: string[];
}
