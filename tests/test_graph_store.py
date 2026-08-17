import pytest

from braintodo.graph.base import EdgeNotFoundError, NodeNotFoundError
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.models.edge import EdgeCreate, EdgeUpdate
from braintodo.models.node import NodeCreate, NodeUpdate

OWNER = "owner-1"


@pytest.fixture
def store() -> InMemoryGraphStore:
    return InMemoryGraphStore()


async def test_create_and_get_node(store: InMemoryGraphStore) -> None:
    node = await store.create_node(NodeCreate(title="Idea 1"), OWNER)
    fetched = await store.get_node(node.id, OWNER)
    assert fetched == node


async def test_get_missing_node_raises(store: InMemoryGraphStore) -> None:
    with pytest.raises(NodeNotFoundError):
        await store.get_node("missing", OWNER)


async def test_update_node(store: InMemoryGraphStore) -> None:
    node = await store.create_node(NodeCreate(title="Original"), OWNER)
    updated = await store.update_node(node.id, NodeUpdate(title="Renamed"), OWNER)
    assert updated.title == "Renamed"
    assert updated.id == node.id


async def test_delete_node(store: InMemoryGraphStore) -> None:
    node = await store.create_node(NodeCreate(title="To delete"), OWNER)
    await store.delete_node(node.id, OWNER)
    with pytest.raises(NodeNotFoundError):
        await store.get_node(node.id, OWNER)


async def test_list_nodes(store: InMemoryGraphStore) -> None:
    for i in range(5):
        await store.create_node(NodeCreate(title=f"Idea {i}"), OWNER)

    nodes = await store.list_nodes(OWNER)
    assert len(nodes) == 5


async def test_create_edge_requires_existing_nodes(store: InMemoryGraphStore) -> None:
    with pytest.raises(NodeNotFoundError):
        await store.create_edge(EdgeCreate(source_id="a", target_id="b"), OWNER)


async def test_create_and_get_edge(store: InMemoryGraphStore) -> None:
    a = await store.create_node(NodeCreate(title="A"), OWNER)
    b = await store.create_node(NodeCreate(title="B"), OWNER)
    edge = await store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id), OWNER)
    fetched = await store.get_edge(edge.id, OWNER)
    assert fetched == edge


async def test_update_edge(store: InMemoryGraphStore) -> None:
    a = await store.create_node(NodeCreate(title="A"), OWNER)
    b = await store.create_node(NodeCreate(title="B"), OWNER)
    edge = await store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id), OWNER)
    updated = await store.update_edge(edge.id, EdgeUpdate(relation_type="depends_on"), OWNER)
    assert updated.relation_type == "depends_on"


async def test_delete_edge(store: InMemoryGraphStore) -> None:
    a = await store.create_node(NodeCreate(title="A"), OWNER)
    b = await store.create_node(NodeCreate(title="B"), OWNER)
    edge = await store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id), OWNER)
    await store.delete_edge(edge.id, OWNER)
    with pytest.raises(EdgeNotFoundError):
        await store.get_edge(edge.id, OWNER)


async def test_list_edges(store: InMemoryGraphStore) -> None:
    nodes = [await store.create_node(NodeCreate(title=str(i)), OWNER) for i in range(4)]
    for n in nodes[:-1]:
        await store.create_edge(EdgeCreate(source_id=n.id, target_id=nodes[-1].id), OWNER)

    edges = await store.list_edges(OWNER)
    assert len(edges) == 3
