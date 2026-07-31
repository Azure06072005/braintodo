from sympy import nroots
import math

from braintodo.graph.base import GraphStore
from braintodo.models.link_sugestion import LinkSugestion

def _consine_similarity(a: list[float], b: list[float]) -> float: 
    dot = sum(x * y for x, y in zip(a,b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0.0 or norm_b == 0.0: 
        return 0.0
    return dot / (norm_a * norm_b)

class LinkPredictionService: 
    """Suggests missing edges by ranking node pairs on the cosine similarity
    of their graph_embedding (the F005 GNN output, which already reflects
    both a node's own content and its neighborhood). No separate model to
    train - the GNN embeddings already carry the signal we need."""

    def __init__(self, store: GraphStore) -> None: 
        self._store = store

    async def suggest_links(self, limit: int = 10) -> list[LinkSugestion]: 
        nodes = await self._store.list_nodes() 
        edges = await self._store.list_edges()

        eligible = [n for n in nodes if n.graph_embedding is not None]

        existing_pairs = {
            frozenset((e.source_id, e.target_id)) for e in edges
        }

        suggestions: list[LinkSugestion] = []
        for i, source in enumerate(eligible): 
            for target in eligible[i + 1 :]: 
                if frozenset((source.id, target.id)) in existing_pairs: 
                    continue
                assert source.graph_embedding is not None
                assert target.graph_embedding is not None
                score = _consine_similarity(
                    source.graph_embedding, target.graph_embedding
                )
                suggestions.append(
                    LinkSugestion(
                        source_id=source.id, target_id=target.id, score=score
                    )
                )

        suggestions.sort(key=lambda s: s.score, reverse=True)
        return suggestions[:limit]
