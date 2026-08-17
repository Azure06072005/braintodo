from braintodo.clustering.service import ClusterService
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.models.edge import EdgeCreate
from braintodo.models.node import NodeCreate

OWNER = "owner-1"


async def _make_node(store: InMemoryGraphStore, title: str) -> str:
    node = await store.create_node(NodeCreate(title=title), OWNER)
    return node.id


async def test_two_dense_groups_are_split_into_two_clusters() -> None:
    store = InMemoryGraphStore()
    a, b, c = (
        await _make_node(store, "A"),
        await _make_node(store, "B"),
        await _make_node(store, "C"),
    )
    x, y, z = (
        await _make_node(store, "X"),
        await _make_node(store, "Y"),
        await _make_node(store, "Z"),
    )
    # Two tightly-connected triangles, no edges between them.
    for u, v in [(a, b), (b, c), (a, c), (x, y), (y, z), (x, z)]:
        await store.create_edge(EdgeCreate(source_id=u, target_id=v), OWNER)

    service = ClusterService(store)
    clusters = await service.detect_clusters(OWNER)

    assert len(clusters) == 2
    groups = {frozenset(c.node_ids) for c in clusters}
    assert groups == {frozenset({a, b, c}), frozenset({x, y, z})}


async def test_isolated_node_becomes_its_own_cluster() -> None:
    store = InMemoryGraphStore()
    a, b = await _make_node(store, "A"), await _make_node(store, "B")
    lonely = await _make_node(store, "Lonely")
    await store.create_edge(EdgeCreate(source_id=a, target_id=b), OWNER)

    service = ClusterService(store)
    clusters = await service.detect_clusters(OWNER)

    groups = {frozenset(c.node_ids) for c in clusters}
    assert frozenset({lonely}) in groups
    assert frozenset({a, b}) in groups


async def test_empty_graph_returns_no_clusters() -> None:
    store = InMemoryGraphStore()

    service = ClusterService(store)
    clusters = await service.detect_clusters(OWNER)

    assert clusters == []


async def test_result_is_deterministic_across_calls() -> None:
    store = InMemoryGraphStore()
    a, b, c = (
        await _make_node(store, "A"),
        await _make_node(store, "B"),
        await _make_node(store, "C"),
    )
    await store.create_edge(EdgeCreate(source_id=a, target_id=b), OWNER)
    await store.create_edge(EdgeCreate(source_id=b, target_id=c), OWNER)

    service = ClusterService(store)
    first = await service.detect_clusters(OWNER)
    second = await service.detect_clusters(OWNER)

    assert [c.node_ids for c in first] == [c.node_ids for c in second]