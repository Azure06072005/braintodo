from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.linking.service import LinkPredictionService
from braintodo.models.edge import EdgeCreate
from braintodo.models.node import NodeCreate, NodeUpdate


async def _make_node(store: InMemoryGraphStore, title: str, graph_embedding: list[float]):
    node = await store.create_node(NodeCreate(title=title))
    return await store.update_node(node.id, NodeUpdate(graph_embedding=graph_embedding))


async def test_suggests_similar_unconnected_nodes() -> None:
    store = InMemoryGraphStore()
    a = await _make_node(store, "A", [1.0, 0.0])
    b = await _make_node(store, "B", [1.0, 0.0])  # identical -> similarity 1.0
    c = await _make_node(store, "C", [0.0, 1.0])  # orthogonal -> similarity 0.0

    service = LinkPredictionService(store)
    suggestions = await service.suggest_links(limit=10)

    pairs = {frozenset((s.source_id, s.target_id)): s.score for s in suggestions}
    assert pairs[frozenset((a.id, b.id))] == 1.0
    assert pairs[frozenset((a.id, c.id))] == 0.0
    assert pairs[frozenset((b.id, c.id))] == 0.0


async def test_existing_edges_are_excluded() -> None:
    store = InMemoryGraphStore()
    a = await _make_node(store, "A", [1.0, 0.0])
    b = await _make_node(store, "B", [1.0, 0.0])
    await store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id))

    service = LinkPredictionService(store)
    suggestions = await service.suggest_links(limit=10)

    assert suggestions == []


async def test_nodes_without_graph_embedding_are_skipped() -> None:
    store = InMemoryGraphStore()
    await _make_node(store, "A", [1.0, 0.0])
    await store.create_node(NodeCreate(title="B"))  # no graph_embedding yet

    service = LinkPredictionService(store)
    suggestions = await service.suggest_links(limit=10)

    assert suggestions == []


async def test_limit_caps_number_of_results() -> None:
    store = InMemoryGraphStore()
    for i in range(5):
        await _make_node(store, f"N{i}", [1.0, float(i)])

    service = LinkPredictionService(store)
    suggestions = await service.suggest_links(limit=2)

    assert len(suggestions) == 2