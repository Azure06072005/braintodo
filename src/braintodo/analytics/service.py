import networkx as nx

from braintodo.analytics.pagerank import pagerank
from braintodo.graph.base import GraphStore
from braintodo.models.topology import NodeTopology


class TopologyService:
    """Computes standard graph-topology metrics for every node: degree,
    degree centrality, betweenness centrality, and PageRank."""

    def __init__(self, store: GraphStore) -> None:
        self._store = store

    async def compute_metrics(self) -> list[NodeTopology]:
        nodes = await self._store.list_nodes()
        edges = await self._store.list_edges()

        graph: nx.Graph = nx.Graph()
        graph.add_nodes_from(n.id for n in nodes)
        graph.add_edges_from((e.source_id, e.target_id) for e in edges)

        degree_centrality = nx.degree_centrality(graph)
        betweenness_centrality = nx.betweenness_centrality(graph)
        pagerank_scores = pagerank(graph)

        return [
            NodeTopology(
                node_id=node.id,
                degree=graph.degree(node.id),
                degree_centrality=degree_centrality[node.id],
                betweenness_centrality=betweenness_centrality[node.id],
                pagerank=pagerank_scores[node.id],
            )
            for node in nodes
        ]