from pydantic import BaseModel

from braintodo.models.edge import Edge
from braintodo.models.node import Node


class SearchMatch(BaseModel): 
    """A node that matched the query, with its relevance score"""

    node_id: str
    score: float

class SearchResult(BaseModel): 
    """Semantic search matches, plus the local subgraph around them (the
    matches themselves and anything reachable within `depth` hops)."""

    matches: list[SearchMatch]
    subgraph_nodes: list[Node]
    subgraph_edges: list[Edge]