from pydantic import BaseModel


class Cluster(BaseModel):
    """A detected community: a group of nodes that are more densely
    connected to each other than to the rest of the graph."""

    cluster_id: int
    node_ids: list[str]
    # Human-readable label derived from the cluster's member node embeddings
    # (F022 - see ClusterService). None when no member node has an
    # embedding yet (e.g. embeddings still computing, or the embedding
    # provider is unavailable), so callers can fall back to "Cluster N"
    # themselves rather than being handed a fabricated label.
    label: str | None = None