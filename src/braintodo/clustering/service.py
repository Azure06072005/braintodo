import networkx as nx
from networkx.algorithms.community import louvain_communities

from braintodo.graph.base import GraphStore
from braintodo.models.cluster import Cluster

# Fixed seed so /clusters returns the same grouping across repeated calls on
# the same graph - Louvain is otherwise non-deterministic (it breaks ties
# randomly), which would make results confusing to a user browsing the app.
_LOUVAIN_SEED = 42


class ClusterService:
    def __init__(self, store: GraphStore) -> None:
        self._store = store

    async def detect_clusters(self, owner_id: str) -> list[Cluster]:
        nodes = await self._store.list_nodes(owner_id)
        edges = await self._store.list_edges(owner_id)

        graph: nx.Graph = nx.Graph()
        graph.add_nodes_from(n.id for n in nodes)
        graph.add_edges_from((e.source_id, e.target_id) for e in edges)

        communities = louvain_communities(graph, seed=_LOUVAIN_SEED)

        return [
            Cluster(cluster_id=i, node_ids=sorted(community))
            for i, community in enumerate(communities)
        ]
