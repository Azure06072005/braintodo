import pytest

from braintodo.graph.base import EdgeNotFoundError, NodeNotFoundError
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.models.edge import EdgeCreate, EdgeUpdate
from braintodo.models.node import NodeCreate, NodeUpdate


@pytest.fixture
def store() -> InMemoryGraphStore:
    return InMemoryGraphStore()


async def test_create_and_get_node(store: InMemoryGraphStore) -> None:
    node = await store.create_node(NodeCreate(title="Idea 1"))
    fetched = await store.get_node(node.id)
    assert fetched == node


async def test_get_missing_node_raises(store: InMemoryGraphStore) -> None:
    with pytest.raises(NodeNotFoundError):
        await store.get_node("missing")


async def test_update_node(store: InMemoryGraphStore) -> None:
    node = await store.create_node(NodeCreate(title="Original"))
    updated = await store.update_node(node.id, NodeUpdate(title="Renamed"))
    assert updated.title == "Renamed"
    assert updated.id == node.id


async def test_delete_node(store: InMemoryGraphStore) -> None:
    node = await store.create_node(NodeCreate(title="To delete"))
    await store.delete_node(node.id)
    with pytest.raises(NodeNotFoundError):
        await store.get_node(node.id)


async def test_list_nodes(store: InMemoryGraphStore) -> None:
    for i in range(5):
        await store.create_node(NodeCreate(title=f"Idea {i}"))

    nodes = await store.list_nodes()
    assert len(nodes) == 5


async def test_create_edge_requires_existing_nodes(store: InMemoryGraphStore) -> None:
    with pytest.raises(NodeNotFoundError):
        await store.create_edge(EdgeCreate(source_id="a", target_id="b"))


async def test_create_and_get_edge(store: InMemoryGraphStore) -> None:
    a = await store.create_node(NodeCreate(title="A"))
    b = await store.create_node(NodeCreate(title="B"))
    edge = await store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id))
    fetched = await store.get_edge(edge.id)
    assert fetched == edge


async def test_update_edge(store: InMemoryGraphStore) -> None:
    a = await store.create_node(NodeCreate(title="A"))
    b = await store.create_node(NodeCreate(title="B"))
    edge = await store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id))
    updated = await store.update_edge(edge.id, EdgeUpdate(relation_type="depends_on"))
    assert updated.relation_type == "depends_on"


async def test_delete_edge(store: InMemoryGraphStore) -> None:
    a = await store.create_node(NodeCreate(title="A"))
    b = await store.create_node(NodeCreate(title="B"))
    edge = await store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id))
    await store.delete_edge(edge.id)
    with pytest.raises(EdgeNotFoundError):
        await store.get_edge(edge.id)


async def test_list_edges(store: InMemoryGraphStore) -> None:
    nodes = [await store.create_node(NodeCreate(title=str(i))) for i in range(4)]
    for n in nodes[:-1]:
        await store.create_edge(EdgeCreate(source_id=n.id, target_id=nodes[-1].id))

    edges = await store.list_edges()
    assert len(edges) == 3
