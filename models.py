"""
Pydantic schemas for the syllabus parsing API.

`SyllabusParseResult` is passed to the OpenAI API as a strict response
schema (via `client.beta.chat.completions.parse` / structured outputs),
so the model's output is guaranteed to conform to this shape.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class EventType(str, Enum):
    HOMEWORK = "homework"
    QUIZ = "quiz"
    EXAM = "exam"
    PROJECT = "project"
    PAPER = "paper"
    PRESENTATION = "presentation"
    LAB = "lab"
    READING = "reading"
    OTHER = "other"


class ExtractedEvent(BaseModel):
    title: str = Field(description="Short, human-readable name of the assignment/event")
    event_type: EventType = Field(description="Category of the event")
    due_date: str = Field(description="Due date in strict YYYY-MM-DD format")
    start_time: Optional[str] = Field(
        default=None, description="Start time in HH:MM 24h format, if known (e.g. exam start time)"
    )
    end_time: Optional[str] = Field(
        default=None, description="End time in HH:MM 24h format, if known"
    )
    description: Optional[str] = Field(
        default=None, description="Any extra detail from the syllabus about this item"
    )
    weight_percentage: Optional[float] = Field(
        default=None, description="Percent of final grade this item is worth, if stated"
    )


class SyllabusParseResult(BaseModel):
    course_name: str = Field(description="Full course name/title")
    course_code: Optional[str] = Field(default=None, description="Course code, e.g. CS 1301")
    events: list[ExtractedEvent] = Field(
        default_factory=list,
        description="Every graded assignment, exam, quiz, project, or other dated deliverable found in the syllabus",
    )


class ParseSyllabusResponse(BaseModel):
    """Top-level API response — result plus request metadata."""

    result: SyllabusParseResult
    warnings: list[str] = Field(default_factory=list)
