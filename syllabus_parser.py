"""
Core parsing logic:
  1. Extract raw text from a syllabus PDF with pdfplumber.
  2. Send that text to OpenAI (gpt-4o-mini) with Pydantic-enforced
     structured outputs so the response is guaranteed to match
     `SyllabusParseResult`.
"""

from __future__ import annotations

import io
import logging

import pdfplumber
from docx import Document
from fastapi import HTTPException
from openai import OpenAI

from models import SyllabusParseResult

logger = logging.getLogger("syllabus_parser")

MAX_CHARS_TO_MODEL = 60_000  # keep prompt cost/latency bounded for very long PDFs

SYSTEM_PROMPT = """You are an assistant that reads a college course syllabus and extracts \
every gradeable, dated item: homework, quizzes, exams, projects, papers, presentations, \
labs, and graded readings.

Rules:
- Only include items that have (or can be reasonably inferred to have) a specific due date.
- Normalize all dates to YYYY-MM-DD. If a year is not stated in the syllabus, infer it from \
context (e.g. a stated semester or the surrounding dates) as best you can; if truly \
unknown, use 2000-01-01 as a placeholder for the year but keep the correct month/day.
- If a recurring pattern is described (e.g. "homework due every Friday"), enumerate each \
concrete date you can determine from the syllabus's date range; if the date range isn't \
stated, create a single representative event instead of guessing indefinitely.
- Extract weight_percentage only when the syllabus states a numeric percentage of the \
final grade for that specific item or category.
- Do not invent course name or course code; use null-equivalent empty values if not found.
"""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF byte stream using pdfplumber."""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text() or ""
                pages_text.append(text)
            full_text = "\n\n".join(pages_text).strip()
    except Exception as exc:  # pdfplumber can raise several underlying exceptions
        logger.exception("Failed to read PDF")
        raise HTTPException(status_code=400, detail=f"Could not read PDF file: {exc}") from exc

    if not full_text:
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in PDF (it may be a scanned image without OCR).",
        )

    return full_text


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract all text (paragraphs + table cells) from a .docx byte stream using python-docx."""
    try:
        doc = Document(io.BytesIO(file_bytes))
    except Exception as exc:
        logger.exception("Failed to read DOCX")
        raise HTTPException(status_code=400, detail=f"Could not read Word document: {exc}") from exc

    chunks: list[str] = []

    # Paragraphs, in document order.
    for para in doc.paragraphs:
        if para.text.strip():
            chunks.append(para.text.strip())

    # Tables — many syllabi put the assignment schedule in a table, so pull
    # each row out as a readable line rather than losing the structure.
    for table in doc.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                chunks.append(" | ".join(cells))

    full_text = "\n".join(chunks).strip()

    if not full_text:
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in this Word document.",
        )

    return full_text


def extract_text_from_file(file_bytes: bytes, filename: str, content_type: str | None) -> str:
    """Dispatch to the right extractor based on file extension/content type."""
    name = (filename or "").lower()
    is_docx = name.endswith(".docx") or content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    if is_docx:
        return extract_text_from_docx(file_bytes)
    return extract_text_from_pdf(file_bytes)


def parse_syllabus_text(client: OpenAI, syllabus_text: str, semester_start_date: str | None, default_year: int | None) -> SyllabusParseResult:
    """Call OpenAI with structured outputs enforced against SyllabusParseResult."""

    truncated = syllabus_text[:MAX_CHARS_TO_MODEL]

    context_hint = ""
    if semester_start_date:
        context_hint += f"\nThe semester starts on {semester_start_date}. Use this to resolve month/day-only dates and recurring schedules."
    if default_year:
        context_hint += f"\nIf a year is not explicitly stated for a date, assume {default_year}."

    user_prompt = f"""Extract all assignments, quizzes, exams, and projects from this syllabus.
{context_hint}

SYLLABUS TEXT:
\"\"\"
{truncated}
\"\"\"
"""

    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format=SyllabusParseResult,
            temperature=0,
        )
    except Exception as exc:
        logger.exception("OpenAI request failed")
        raise HTTPException(status_code=502, detail=f"OpenAI extraction failed: {exc}") from exc

    message = completion.choices[0].message

    if message.refusal:
        raise HTTPException(status_code=422, detail=f"Model refused to parse syllabus: {message.refusal}")

    parsed: SyllabusParseResult | None = message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="Model did not return structured output.")

    return parsed
