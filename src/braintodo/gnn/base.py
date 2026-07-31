from typing import Protocol

class GraphEmbedder(Protocol): 
    """Backend-agnostic interface for computing graph-topology-aware node
    embeddings (GNN). Takes each node's own feature vector (the F004 text
    embedding) plus the graph's edges, and returns a new embedding per node
    that also reflects its neighborhood."""

    output_dimension: int

    def embed_graph(
        self, 
        node_ids: list[str],
        node_features: list[list[float]],
        edges: list[tuple[str, str]],
    ) -> dict[str, list[float]]: ... 
    