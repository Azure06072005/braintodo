from functools import lru_cache


class PygGCNEmbedder:
    """2-layer GCN: input_dimension -> hidden_dimension -> output_dimension."""

    def __init__(
        self,
        input_dimension: int,
        hidden_dimension: int = 64,
        output_dimension: int = 32,
    ) -> None:
        # Imported lazily so torch / torch-geometric are only required if
        # this provider is actually used (tests use FakeGraphEmbedder instead).
        import torch
        from torch_geometric.nn import GCNConv

        self._torch = torch
        self.output_dimension = output_dimension

        class _GCN(torch.nn.Module):
            def __init__(self) -> None:
                super().__init__()
                self.conv1 = GCNConv(input_dimension, hidden_dimension)
                self.conv2 = GCNConv(hidden_dimension, output_dimension)

            def forward(self, x, edge_index):
                x = self.conv1(x, edge_index).relu()
                return self.conv2(x, edge_index)

        self._model = _GCN()
        self._model.eval()

    def embed_graph(
        self,
        node_ids: list[str],
        node_features: list[list[float]],
        edges: list[tuple[str, str]],
    ) -> dict[str, list[float]]:
        torch = self._torch
        if not node_ids:
            return {}

        index_of = {node_id: i for i, node_id in enumerate(node_ids)}
        x = torch.tensor(node_features, dtype=torch.float)

        pairs = [
            (index_of[a], index_of[b]) for a, b in edges if a in index_of and b in index_of
        ]
        # Treat relations as undirected for embedding purposes - add both
        # directions so a node's embedding reflects outgoing and incoming
        # links, not just one.
        src = [p[0] for p in pairs] + [p[1] for p in pairs]
        dst = [p[1] for p in pairs] + [p[0] for p in pairs]
        edge_index = torch.tensor([src, dst], dtype=torch.long)

        with torch.no_grad():
            output = self._model(x, edge_index)

        return {node_id: output[i].tolist() for i, node_id in enumerate(node_ids)}


@lru_cache
def get_pyg_gcn_embedder(input_dimension: int) -> PygGCNEmbedder:
    """Singleton per input dimension, so the model is built once per process."""
    return PygGCNEmbedder(input_dimension=input_dimension)