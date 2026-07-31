import asyncio

from braintodo.gnn.base import GraphEmbedder
from braintodo.graph.base import GraphStore
from braintodo.models.node import NodeUpdate


class GraphEmbeddingService:

    def __init__(self, store: GraphStore, embedder: GraphEmbedder) -> None:
        self._store = store
        self._embedder = embedder

    async def recompute_all(self) -> int:
        nodes = await self._store.list_nodes()
        edges = await self._store.list_edges()

        # Nodes without a text embedding (F004) can't be fed into the GNN as
        # a feature vector - skip them rather than guessing with a zero
        # vector, which would just add noise to their neighbors' embeddings.
        eligible = [n for n in nodes if n.embedding is not None]
        node_ids = [n.id for n in eligible]
        node_features = [n.embedding for n in eligible if n.embedding is not None]
        edge_pairs = [(e.source_id, e.target_id) for e in edges]

        embeddings = await asyncio.to_thread(
            self._embedder.embed_graph, node_ids, node_features, edge_pairs
        )

        for node_id, vector in embeddings.items():
            await self._store.update_node(node_id, NodeUpdate(graph_embedding=vector))

        return len(embeddings)