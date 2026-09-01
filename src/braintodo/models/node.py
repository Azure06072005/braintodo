from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

NodeType = Literal["idea", "task"]
TaskPriority = Literal["low", "medium", "high"]
RecurrenceRule = Literal["daily", "weekly", "monthly"]


class NodeCreate(BaseModel):
    title: str
    content: str = ""
    tags: list[str] = Field(default_factory=list)
    weight: float = 1.0
    color: str = "#4287f5"
    shape: str = "circle"
    size: float = 10.0
    # F024: task fields. node_type defaults to "idea" so every existing
    # caller (and every pre-F024 test) that omits it is unaffected.
    node_type: NodeType = "idea"
    due_date: date | None = None
    priority: TaskPriority | None = None
    recurrence_rule: RecurrenceRule | None = None


class NodeUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    weight: float | None = None
    color: str | None = None
    shape: str | None = None
    size: float | None = None
    embedding: list[float] | None = None
    graph_embedding: list[float] | None = None
    # F024: task fields. All optional/unset by default so updating an
    # unrelated field (e.g. title) never touches these.
    node_type: NodeType | None = None
    due_date: date | None = None
    priority: TaskPriority | None = None
    completed_at: datetime | None = None
    recurrence_rule: RecurrenceRule | None = None


class Node(BaseModel):
    id: str
    owner_id: str
    title: str
    content: str = ""
    tags: list[str] = Field(default_factory=list)
    weight: float = 1.0
    color: str = "#4287f5"
    shape: str = "circle"
    size: float = 10.0
    embedding: list[float] | None = None
    graph_embedding: list[float] | None = None
    # F024: task fields, all null on existing/idea nodes.
    node_type: NodeType = "idea"
    due_date: date | None = None
    priority: TaskPriority | None = None
    completed_at: datetime | None = None
    recurrence_rule: RecurrenceRule | None = None