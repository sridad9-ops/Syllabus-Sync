# Syllabus-Sync

Upload a syllabus (PDF or Word/.docx) → get every homework/quiz/exam/project due date
extracted, reviewable in an editable table, and exportable as `.ics` or synced straight to
Google Calendar.

Sorry for the lack of organization of the repo :(

IF YOU DON'T WANT TO DO ALL THIS, THERE'S AN HTML VERSION AVAILABLE IN THE REPO. Just download the  "syllabus-sync-demo.html". This runs on your browser (works best inside of a claude chat, but you can run it as its own site as well, just needs one step of set up), so you don't need to have it set up in your terminal and all that.


## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then add your real OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

### Endpoint

`POST /api/v1/parse-syllabus` — multipart form:
- `file`: PDF or Word (`.docx`) (required)
- `semester_start_date`: `YYYY-MM-DD` (optional, helps resolve ambiguous dates)
- `default_year`: integer (optional, used when a date has no explicit year)

Returns `{ result: { course_name, course_code, events: [...] }, warnings: [...] }`.

## Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in NEXTAUTH_SECRET + Google OAuth creds
npm run dev
```

Open `http://localhost:3000`.

### Google OAuth setup (for "Sync to Google Calendar")

1. In the [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0
   Client ID (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
3. Enable the **Google Calendar API** for the project.
4. Put the client ID/secret into `frontend/.env.local`.
5. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

The app requests the `https://www.googleapis.com/auth/calendar.events` scope and writes
events to the signed-in user's **primary** calendar, assigning a distinct Google event
color per event type (exam = tomato, homework = blueberry, quiz = banana, etc. — see
`frontend/lib/types.ts` → `EVENT_TYPE_COLOR_ID`).

## How it fits together

1. Landing page (`/`) — drop a PDF or Word doc, set semester start date / default year, submit.
2. Backend extracts text with `pdfplumber`, sends it to `gpt-4o-mini` with a Pydantic
   `SyllabusParseResult` schema enforced via OpenAI structured outputs, and returns
   strictly-typed JSON.
3. Result is stashed in `sessionStorage` and the user is routed to `/review`.
4. Review dashboard (`/review`) — editable table (`@tanstack/react-table`) with inline
   editing, per-row checkboxes, "Add Manual Event", and summary stat cards.
5. Export: download an `.ics` file client-side, and/or sign in with Google and push
   selected events to Google Calendar via a server route that calls the Calendar API.

## Design

The UI uses a "gradebook/planner" theme rather than shadcn's stock black-and-white
defaults: a warm paper background, pine-green primary, and brick-red/mustard-yellow
accents for exams and homework specifically (see the colored summary stat cards on
`/review`). Headings use Source Serif 4; everything else uses Inter.

All of it is theme tokens, not structure — defined once in `frontend/app/globals.css`
(CSS variables) and `frontend/tailwind.config.ts` (`pine`/`brick`/`mustard` colors,
`font-serif`/`font-sans`). To reskin, edit the variables in `globals.css`; the
components themselves (`Card`, `Button`, `Select`, etc.) don't hardcode colors.

## Relationship to the in-chat demo

There's also a single-file HTML demo (`syllabus-sync-demo.html`, shared separately, not
included in this zip) that replicates the same upload → review → export flow entirely
client-side, using pdf.js/mammoth.js for extraction and a direct Claude API call instead
of the FastAPI backend. It shares this app's visual theme and table/export logic, but you have to make a whole Google Cloud OAuth Account and set up Client ID and all that, be aware.

## Notes / things to harden before production

- The parsed data currently lives only in `sessionStorage` — refreshing `/review` after
  closing the tab loses it. Swap in a proper store (Zustand, or persist via a backend DB)
  if you want durability.
- No auth/rate-limiting on the FastAPI endpoint — add both before deploying publicly,
  since every request costs an OpenAI call.
- `gpt-4o-mini` can still misparse unusual syllabus formats (scanned/image PDFs won't have
  extractable text at all — pdfplumber will return a 422 in that case). Always review
  before syncing/exporting, which is exactly what the dashboard is for.
- Google event inserts happen serially in a loop in `app/api/sync-google-calendar/route.ts`;
  for very large event lists you may want to batch or rate-limit against Google's quota.
