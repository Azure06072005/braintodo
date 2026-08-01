from pydantic import BaseModel


class LinkSuggestion(BaseModel): 
    """A candidate edge the graph doesn't have yet, ranked by similarity."""
    source_id: str
    target_id: str
    score: float
    