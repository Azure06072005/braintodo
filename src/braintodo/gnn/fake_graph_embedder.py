class FakeGraphEmbedder: 
    """Deterministic test double for GraphEmbedder: averages each node's own
    feature vector with its direct neighbors' feature vectors. No torch /
    torch-geometric dependency, so unit tests don't need those installed."""

    def __init__(self, output_dimension: int = 8) -> None: 
        self.output_dimension = output_dimension

    def embed_graph(
        self, 
        node_ids: list[str],
        node_features: list[list[float]],
        edges: list[tuple[str, str]],
    ) -> dict[str, list[float]]: 
        if not node_ids: 
            return {}

        features_by_id = dict(zip(node_ids, node_features))
        neighbors: dict[str, list[str]] = {node_id: [] for node_id in node_ids}
        for a, b in edges: 
            if a in neighbors and b in neighbors: 
                neighbors[a].append(b)
                neighbors[b].append(a)

        result: dict[str, list[float]] = {}
        for node_id in node_ids: 
            vectors = [features_by_id[node_id]] + [
                features_by_id[n] for n in neighbors[node_id]
            ]
            dim = len(vectors[0])
            averaged = [sum(v[i] for v in vectors) / len(vectors) for i in range(dim)]
            vector = averaged[: self.output_dimension]
            if len(vector) < self.output_dimension: 
                vector = vector + [0.0] * (self.output_dimension - len(vector))
            result[node_id] = vector
        return result