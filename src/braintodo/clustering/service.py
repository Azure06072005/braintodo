try:
    import igraph as ig
    import leidenalg as la
    _HAS_LEIDEN = True
except ImportError:
    ig = None  # type: ignore
    la = None  # type: ignore
    _HAS_LEIDEN = False

from braintodo.graph.base import GraphStore
from braintodo.models.cluster import Cluster
from braintodo.models.node import Node

# Fixed seed so /clusters returns the same grouping across repeated calls on
# the same graph - Leiden is otherwise non-deterministic (it breaks ties
# randomly), which would make results confusing to a user browsing the app.
_LEIDEN_SEED = 42

# Default resolution matches the prior Louvain-based behavior's granularity
# (higher resolution -> more, smaller clusters; lower -> fewer, larger ones).
_DEFAULT_RESOLUTION = 1.0


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _centroid(vectors: list[list[float]]) -> list[float]:
    dim = len(vectors[0])
    return [sum(v[i] for v in vectors) / len(vectors) for i in range(dim)]


def _label_for_community(members: list[Node]) -> str | None:
    """Pick the member node whose embedding is closest to the community's
    embedding centroid, and use its title as a human-readable label (e.g.
    "Auth & Security" instead of "Cluster 3"). Returns None when no member
    has an embedding yet - callers should fall back to a numeric label
    themselves rather than being handed a fabricated one.
    """
    embedded: list[tuple[Node, list[float]]] = [
        (n, n.embedding) for n in members if n.embedding
    ]
    if not embedded:
        return None
    if len(embedded) == 1:
        return embedded[0][0].title

    centroid = _centroid([vec for _n, vec in embedded])
    best_node, _best_vec = max(
        embedded, key=lambda pair: _cosine_similarity(pair[1], centroid)
    )
    return best_node.title


class ClusterService:
    def __init__(self, store: GraphStore) -> None:
        self._store = store

    async def detect_clusters(
        self, owner_id: str, resolution: float = _DEFAULT_RESOLUTION
    ) -> list[Cluster]:
        nodes = await self._store.list_nodes(owner_id)
        edges = await self._store.list_edges(owner_id)

        if not nodes:
            return []

        nodes_by_id = {n.id: n for n in nodes}
        node_ids = list(nodes_by_id.keys())

        if not _HAS_LEIDEN or ig is None or la is None:
            return [
                Cluster(
                    cluster_id=0,
                    node_ids=sorted(node_ids),
                    label=nodes[0].title if nodes else None,
                )
            ]

        graph = ig.Graph()
        graph.add_vertices(node_ids)
        graph.add_edges(
            [
                (e.source_id, e.target_id)
                for e in edges
                if e.source_id in nodes_by_id and e.target_id in nodes_by_id
            ]
        )

        partition = la.find_partition(
            graph,
            la.RBConfigurationVertexPartition,
            resolution_parameter=resolution,
            seed=_LEIDEN_SEED,
        )

        clusters = []
        for i, community in enumerate(partition):
            member_ids = sorted(graph.vs[idx]["name"] for idx in community)
            members = [nodes_by_id[nid] for nid in member_ids]
            clusters.append(
                Cluster(
                    cluster_id=i,
                    node_ids=member_ids,
                    label=_label_for_community(members),
                )
            )
        return clusters
