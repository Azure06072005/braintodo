from pydantic import BaseModel


class EdgeCreate(BaseModel):
    source_id: str
    target_id: str
    relation_type: str = "related_to"
    color: str = "#999999"
    style: str = "solid"


class EdgeUpdate(BaseModel):
    relation_type: str | None = None
    color: str | None = None
    style: str | None = None


class Edge(BaseModel):
    id: str
    source_id: str
    target_id: str
    relation_type: str = "related_to"
    color: str = "#999999"
    style: str = "solid"
