from pydantic import BaseModel, Field


class NodeCreate(BaseModel):
    title: str
    content: str = ""
    tags: list[str] = Field(default_factory=list)
    weight: float = 1.0
    color: str = "#4287f5"
    shape: str = "circle"
    size: float = 10.0


class NodeUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    weight: float | None = None
    color: str | None = None
    shape: str | None = None
    size: float | None = None


class Node(BaseModel):
    id: str
    title: str
    content: str = ""
    tags: list[str] = Field(default_factory=list)
    weight: float = 1.0
    color: str = "#4287f5"
    shape: str = "circle"
    size: float = 10.0
