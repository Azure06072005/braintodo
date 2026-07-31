from braintodo.gnn.fake_graph_embedder import FakeGraphEmbedder


def test_isolated_node_embeds_to_itself() -> None:
    embedder = FakeGraphEmbedder(output_dimension=3)
    result = embedder.embed_graph(
        node_ids=["a"], node_features=[[1.0, 2.0, 3.0]], edges=[]
    )
    assert result["a"] == [1.0, 2.0, 3.0]


def test_connected_node_averages_with_neighbor() -> None:
    embedder = FakeGraphEmbedder(output_dimension=3)
    result = embedder.embed_graph(
        node_ids=["a", "b"],
        node_features=[[0.0, 0.0, 0.0], [2.0, 2.0, 2.0]],
        edges=[("a", "b")],
    )
    assert result["a"] == [1.0, 1.0, 1.0]
    assert result["b"] == [1.0, 1.0, 1.0]


def test_output_padded_to_configured_dimension() -> None:
    embedder = FakeGraphEmbedder(output_dimension=5)
    result = embedder.embed_graph(node_ids=["a"], node_features=[[1.0, 2.0]], edges=[])
    assert result["a"] == [1.0, 2.0, 0.0, 0.0, 0.0]


def test_empty_graph_returns_empty_dict() -> None:
    embedder = FakeGraphEmbedder()
    assert embedder.embed_graph(node_ids=[], node_features=[], edges=[]) == {}