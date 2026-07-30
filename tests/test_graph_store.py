import pytest

from braintodo.graph.base import EdgeNotFoundError, NodeNotFoundError
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.models.edge import EdgeCreate, EdgeUpdate
from braintodo.models.node import NodeCreate, NodeUpdate


@pytest.fixture
def store() -> InMemoryGraphStore:
    return InMemoryGraphStore()


def test_create_and_get_node(store: InMemoryGraphStore) -> None:
    node = store.create_node(NodeCreate(title="Idea 1"))
    fetched = store.get_node(node.id)
    assert fetched == node


def test_get_missing_node_raises(store: InMemoryGraphStore) -> None:
    with pytest.raises(NodeNotFoundError):
        store.get_node("missing")


def test_update_node(store: InMemoryGraphStore) -> None:
    node = store.create_node(NodeCreate(title="Original"))
    updated = store.update_node(node.id, NodeUpdate(title="Renamed"))
    assert updated.title == "Renamed"
    assert updated.id == node.id


def test_delete_node(store: InMemoryGraphStore) -> None:
    node = store.create_node(NodeCreate(title="To delete"))
    store.delete_node(node.id)
    with pytest.raises(NodeNotFoundError):
        store.get_node(node.id)


def test_list_nodes(store: InMemoryGraphStore) -> None:
    for i in range(5):
        store.create_node(NodeCreate(title=f"Idea {i}"))

    nodes = store.list_nodes()
    assert len(nodes) == 5


def test_create_edge_requires_existing_nodes(store: InMemoryGraphStore) -> None:
    with pytest.raises(NodeNotFoundError):
        store.create_edge(EdgeCreate(source_id="a", target_id="b"))


def test_create_and_get_edge(store: InMemoryGraphStore) -> None:
    a = store.create_node(NodeCreate(title="A"))
    b = store.create_node(NodeCreate(title="B"))
    edge = store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id))
    fetched = store.get_edge(edge.id)
    assert fetched == edge


def test_update_edge(store: InMemoryGraphStore) -> None:
    a = store.create_node(NodeCreate(title="A"))
    b = store.create_node(NodeCreate(title="B"))
    edge = store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id))
    updated = store.update_edge(edge.id, EdgeUpdate(relation_type="depends_on"))
    assert updated.relation_type == "depends_on"


def test_delete_edge(store: InMemoryGraphStore) -> None:
    a = store.create_node(NodeCreate(title="A"))
    b = store.create_node(NodeCreate(title="B"))
    edge = store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id))
    store.delete_edge(edge.id)
    with pytest.raises(EdgeNotFoundError):
        store.get_edge(edge.id)


def test_list_edges(store: InMemoryGraphStore) -> None:
    nodes = [store.create_node(NodeCreate(title=str(i))) for i in range(4)]
    for n in nodes[:-1]:
        store.create_edge(EdgeCreate(source_id=n.id, target_id=nodes[-1].id))

    edges = store.list_edges()
    assert len(edges) == 3
