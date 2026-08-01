from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.models.edge import EdgeCreate
from braintodo.models.node import NodeCreate, NodeUpdate
from braintodo.search.service import SearchService


async def _make_node(
    store: InMemoryGraphStore, title: str, embedding: list[float], **kwargs
):
    node = await store.create_node(NodeCreate(title=title, **kwargs))
    return await store.update_node(node.id, NodeUpdate(embedding=embedding))


async def test_keyword_match_is_found_even_without_semantic_similarity() -> None:
    store = InMemoryGraphStore()
    embedder = FakeEmbeddingProvider()
    match = await _make_node(store, "Neural networks", [0.0, 0.0])
    await _make_node(store, "Gardening tips", [0.0, 0.0])

    service = SearchService(store, embedder)
    result = await service.search("neural", limit=10)

    assert len(result.matches) == 1
    assert result.matches[0].node_id == match.id


async def test_semantic_match_ranks_above_unrelated_node() -> None:
    store = InMemoryGraphStore()
    embedder = FakeEmbeddingProvider()
    query_embedding = embedder.embed("machine learning")
    related = await _make_node(store, "Something else entirely", query_embedding)
    await _make_node(store, "Unrelated title", [0.0] * embedder.dimension)

    service = SearchService(store, embedder)
    result = await service.search("machine learning", limit=10)

    assert result.matches[0].node_id == related.id


async def test_no_matches_returns_empty_result() -> None:
    store = InMemoryGraphStore()
    embedder = FakeEmbeddingProvider()
    await _make_node(store, "Unrelated title", [0.0] * embedder.dimension)

    service = SearchService(store, embedder)
    result = await service.search("completely different query", limit=10)

    assert result.matches == []
    assert result.subgraph_nodes == []
    assert result.subgraph_edges == []


async def test_subgraph_expands_one_hop_from_matched_node() -> None:
    store = InMemoryGraphStore()
    embedder = FakeEmbeddingProvider()
    match = await _make_node(store, "Neural networks", [0.0, 0.0])
    neighbor = await _make_node(store, "Backpropagation", [0.0, 0.0])
    far = await _make_node(store, "Unrelated", [0.0, 0.0])
    await store.create_edge(EdgeCreate(source_id=match.id, target_id=neighbor.id))
    await store.create_edge(EdgeCreate(source_id=neighbor.id, target_id=far.id))

    service = SearchService(store, embedder)
    result = await service.search("neural", limit=10, depth=1)

    subgraph_ids = {n.id for n in result.subgraph_nodes}
    assert subgraph_ids == {match.id, neighbor.id}
    assert far.id not in subgraph_ids


async def test_depth_zero_returns_only_matched_nodes() -> None:
    store = InMemoryGraphStore()
    embedder = FakeEmbeddingProvider()
    match = await _make_node(store, "Neural networks", [0.0, 0.0])
    neighbor = await _make_node(store, "Backpropagation", [0.0, 0.0])
    await store.create_edge(EdgeCreate(source_id=match.id, target_id=neighbor.id))

    service = SearchService(store, embedder)
    result = await service.search("neural", limit=10, depth=0)

    assert {n.id for n in result.subgraph_nodes} == {match.id}
    assert result.subgraph_edges == []


async def test_limit_caps_number_of_matches() -> None:
    store = InMemoryGraphStore()
    embedder = FakeEmbeddingProvider()
    for i in range(5):
        await _make_node(store, f"apple {i}", [0.0, 0.0])

    service = SearchService(store, embedder)
    result = await service.search("apple", limit=2)

    assert len(result.matches) == 2