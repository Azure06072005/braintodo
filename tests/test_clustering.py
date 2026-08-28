from braintodo.clustering.service import ClusterService, _centroid, _cosine_similarity
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.models.edge import EdgeCreate
from braintodo.models.node import NodeCreate, NodeUpdate

OWNER = "owner-1"


async def _make_node(store: InMemoryGraphStore, title: str) -> str:
    node = await store.create_node(NodeCreate(title=title), OWNER)
    return node.id


async def _make_node_with_embedding(
    store: InMemoryGraphStore, title: str, embedding: list[float]
) -> str:
    node_id = await _make_node(store, title)
    await store.update_node(node_id, NodeUpdate(embedding=embedding), OWNER)
    return node_id


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


async def test_resolution_parameter_is_accepted_and_still_deterministic() -> None:
    store = InMemoryGraphStore()
    a, b, c = (
        await _make_node(store, "A"),
        await _make_node(store, "B"),
        await _make_node(store, "C"),
    )
    await store.create_edge(EdgeCreate(source_id=a, target_id=b), OWNER)
    await store.create_edge(EdgeCreate(source_id=b, target_id=c), OWNER)

    service = ClusterService(store)
    low_res_first = await service.detect_clusters(OWNER, resolution=0.5)
    low_res_second = await service.detect_clusters(OWNER, resolution=0.5)

    assert [c.node_ids for c in low_res_first] == [c.node_ids for c in low_res_second]


async def test_higher_resolution_produces_at_least_as_many_clusters() -> None:
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
    for u, v in [(a, b), (b, c), (a, c), (x, y), (y, z), (x, z)]:
        await store.create_edge(EdgeCreate(source_id=u, target_id=v), OWNER)
    await store.create_edge(EdgeCreate(source_id=c, target_id=x), OWNER)

    service = ClusterService(store)
    low_res = await service.detect_clusters(OWNER, resolution=0.1)
    high_res = await service.detect_clusters(OWNER, resolution=4.0)

    assert len(high_res) >= len(low_res)


async def test_cluster_label_uses_title_of_node_closest_to_embedding_centroid() -> None:
    store = InMemoryGraphStore()
    auth = await _make_node_with_embedding(store, "Auth flow", [1.0, 0.0, 0.0])
    login = await _make_node_with_embedding(store, "Login page", [0.9, 0.1, 0.0])
    unrelated = await _make_node_with_embedding(store, "Unrelated", [0.0, 0.0, 1.0])
    await store.create_edge(EdgeCreate(source_id=auth, target_id=login), OWNER)
    await store.create_edge(EdgeCreate(source_id=login, target_id=unrelated), OWNER)

    service = ClusterService(store)
    clusters = await service.detect_clusters(OWNER)

    assert len(clusters) == 1
    assert clusters[0].label in {"Auth flow", "Login page"}


async def test_cluster_label_is_none_when_no_member_has_an_embedding() -> None:
    store = InMemoryGraphStore()
    a, b = await _make_node(store, "A"), await _make_node(store, "B")
    await store.create_edge(EdgeCreate(source_id=a, target_id=b), OWNER)

    service = ClusterService(store)
    clusters = await service.detect_clusters(OWNER)

    assert len(clusters) == 1
    assert clusters[0].label is None


async def test_cluster_label_falls_back_to_the_single_embedded_node() -> None:
    store = InMemoryGraphStore()
    await _make_node_with_embedding(store, "Solo idea", [1.0, 2.0, 3.0])

    service = ClusterService(store)
    clusters = await service.detect_clusters(OWNER)

    assert len(clusters) == 1
    assert clusters[0].label == "Solo idea"


def test_cosine_similarity_identical_vectors_is_one() -> None:
    assert _cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) == 1.0


def test_cosine_similarity_orthogonal_vectors_is_zero() -> None:
    assert _cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0


def test_cosine_similarity_handles_zero_vector_without_dividing_by_zero() -> None:
    assert _cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_centroid_averages_each_dimension() -> None:
    assert _centroid([[0.0, 0.0], [2.0, 4.0]]) == [1.0, 2.0]