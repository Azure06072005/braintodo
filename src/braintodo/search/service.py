import asyncio
from collections import defaultdict

from braintodo.embedding.base import EmbeddingProvider
from braintodo.graph.base import GraphStore
from braintodo.models.edge import Edge
from braintodo.models.search import SearchMatch, SearchResult
from braintodo.similarity import cosine_similarity

# Below this cosine similarity, two pieces of text aren't considered related
# - without a floor, virtually every node would get a small positive score
# for every query, making "no results" impossible.
_SEMANTIC_MATCH_THRESHOLD = 0.5


class SearchService:
    """Finds nodes relevant to a text query, combining two signals:

    - Keyword match: does the query text appear in the node's title,
      content, or tags? Cheap and exact - good for names/jargon the user
      typed verbatim.
    - Semantic match: cosine similarity between the query's embedding and
      each node's text embedding (F004) - good for related ideas that don't
      share exact wording.

    The top-scoring nodes ("seeds") are then expanded into their local
    subgraph via BFS up to `depth` hops, so the result isn't just isolated
    matches but the surrounding context a mind-map view would want to show.
    """

    def __init__(self, store: GraphStore, embedder: EmbeddingProvider) -> None:
        self._store = store
        self._embedder = embedder

    async def search(
        self, query: str, limit: int = 10, depth: int = 1
    ) -> SearchResult:
        nodes = await self._store.list_nodes()
        edges = await self._store.list_edges()

        query_embedding = await asyncio.to_thread(self._embedder.embed, query)
        query_lower = query.lower()

        scored: list[tuple[str, float]] = []
        for node in nodes:
            keyword_hit = (
                query_lower in node.title.lower()
                or query_lower in node.content.lower()
                or any(query_lower in tag.lower() for tag in node.tags)
            )
            raw_semantic_score = (
                cosine_similarity(query_embedding, node.embedding)
                if node.embedding is not None
                else 0.0
            )
            semantic_score = (
                raw_semantic_score
                if raw_semantic_score >= _SEMANTIC_MATCH_THRESHOLD
                else 0.0
            )
            score = semantic_score + (1.0 if keyword_hit else 0.0)
            if score > 0:
                scored.append((node.id, score))

        scored.sort(key=lambda pair: pair[1], reverse=True)
        top = scored[:limit]
        matches = [SearchMatch(node_id=node_id, score=score) for node_id, score in top]

        subgraph_node_ids = self._expand_subgraph(
            seeds={node_id for node_id, _ in top}, edges_data=edges, depth=depth
        )

        nodes_by_id = {n.id: n for n in nodes}
        subgraph_nodes = [
            nodes_by_id[node_id]
            for node_id in subgraph_node_ids
            if node_id in nodes_by_id
        ]
        subgraph_edges = [
            e
            for e in edges
            if e.source_id in subgraph_node_ids and e.target_id in subgraph_node_ids
        ]

        return SearchResult(
            matches=matches,
            subgraph_nodes=subgraph_nodes,
            subgraph_edges=subgraph_edges,
        )

    @staticmethod
    def _expand_subgraph(
        seeds: set[str], edges_data: list[Edge], depth: int
    ) -> set[str]:
        adjacency: dict[str, set[str]] = defaultdict(set)
        for edge in edges_data:
            adjacency[edge.source_id].add(edge.target_id)
            adjacency[edge.target_id].add(edge.source_id)

        visited = set(seeds)
        frontier = set(seeds)
        for _ in range(depth):
            next_frontier: set[str] = set()
            for node_id in frontier:
                for neighbor in adjacency[node_id]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        next_frontier.add(neighbor)
            if not next_frontier:
                break
            frontier = next_frontier

        return visited