from pydantic import BaseModel


class Cluster(BaseModel): 
    """A detected community: a group of nodes that are more densely
    connected to each other than to the rest of the graph."""

    cluster_id: int 
    node_ids: list[str]