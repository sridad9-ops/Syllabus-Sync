from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

from models import ParseSyllabusResponse
from syllabus_parser import extract_text_from_file, parse_syllabus_text

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/octet-stream",  # some browsers send this for both; fall back to extension check
}
ALLOWED_EXTENSIONS = (".pdf", ".docx")

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="Syllabus Sync API", version="1.0.0")

# --- CORS ---------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- OpenAI client --------------------------------------------------------
_openai_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="OPENAI_API_KEY is not set on the server. Add it to backend/.env.",
            )
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/v1/parse-syllabus", response_model=ParseSyllabusResponse)
async def parse_syllabus(
    file: UploadFile = File(...),
    semester_start_date: str | None = Form(default=None),
    default_year: int | None = Form(default=None),
) -> ParseSyllabusResponse:
    filename = file.filename or ""
    if file.content_type not in ALLOWED_CONTENT_TYPES and not filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Please upload a PDF or Word (.docx) file.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    warnings: list[str] = []

    syllabus_text = extract_text_from_file(file_bytes, filename, file.content_type)

    client = get_openai_client()
    result = parse_syllabus_text(
        client=client,
        syllabus_text=syllabus_text,
        semester_start_date=semester_start_date,
        default_year=default_year,
    )

    if not result.events:
        warnings.append("No dated assignments were found — you may need to add events manually.")

    return ParseSyllabusResponse(result=result, warnings=warnings)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
