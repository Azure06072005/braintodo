from pydantic import BaseModel


class NodeTopology(BaseModel): 
    """Graph-topology metrics for a single node."""

    node_id: str
    degree: int
    degree_centrality: float
    betweenness_centrality: float
    pagerank: float