from braintodo.graph.base import GraphStore
from braintodo.models.link_suggestion import LinkSuggestion
from braintodo.similarity import cosine_similarity


class LinkPredictionService:
    """Suggests missing edges by ranking node pairs on the cosine similarity
    of their graph_embedding (the F005 GNN output, which already reflects
    both a node's own content and its neighborhood). No separate model to
    train - the GNN embeddings already carry the signal we need."""

    def __init__(self, store: GraphStore) -> None:
        self._store = store

    async def suggest_links(self, owner_id: str, limit: int = 10) -> list[LinkSuggestion]:
        nodes = await self._store.list_nodes(owner_id)
        edges = await self._store.list_edges(owner_id)

        eligible = [n for n in nodes if n.graph_embedding is not None]

        existing_pairs = {
            frozenset((e.source_id, e.target_id)) for e in edges
        }

        suggestions: list[LinkSuggestion] = []
        for i, source in enumerate(eligible):
            for target in eligible[i + 1 :]:
                if frozenset((source.id, target.id)) in existing_pairs:
                    continue
                assert source.graph_embedding is not None
                assert target.graph_embedding is not None
                score = cosine_similarity(
                    source.graph_embedding, target.graph_embedding
                )
                suggestions.append(
                    LinkSuggestion(
                        source_id=source.id, target_id=target.id, score=score
                    )
                )

        suggestions.sort(key=lambda s: s.score, reverse=True)
        return suggestions[:limit]
