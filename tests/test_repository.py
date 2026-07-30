import pytest

from braintodo.graph.base import NodeNotFoundError
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.graph.repository import EdgeRepository, NodeRepository
from braintodo.models.edge import EdgeCreate
from braintodo.models.node import NodeCreate, NodeUpdate


@pytest.fixture
def store() -> InMemoryGraphStore:
    return InMemoryGraphStore()


async def test_node_repository_crud(store: InMemoryGraphStore) -> None:
    repo = NodeRepository(store)

    node = await repo.create(NodeCreate(title="Idea"))
    assert (await repo.get(node.id)).title == "Idea"

    updated = await repo.update(node.id, NodeUpdate(title="Renamed"))
    assert updated.title == "Renamed"

    await repo.delete(node.id)
    with pytest.raises(NodeNotFoundError):
        await repo.get(node.id)


async def test_node_repository_pagination(store: InMemoryGraphStore) -> None:
    repo = NodeRepository(store)
    for i in range(7):
        await repo.create(NodeCreate(title=f"Idea {i}"))

    page = await repo.list_paginated(skip=0, limit=3)
    assert page.total == 7
    assert len(page.items) == 3
    assert page.skip == 0
    assert page.limit == 3

    next_page = await repo.list_paginated(skip=3, limit=3)
    assert len(next_page.items) == 3
    assert {n.id for n in page.items}.isdisjoint({n.id for n in next_page.items})

    last_page = await repo.list_paginated(skip=6, limit=3)
    assert len(last_page.items) == 1


async def test_edge_repository_pagination(store: InMemoryGraphStore) -> None:
    node_repo = NodeRepository(store)
    edge_repo = EdgeRepository(store)

    nodes = [await node_repo.create(NodeCreate(title=str(i))) for i in range(3)]
    for n in nodes[:-1]:
        await edge_repo.create(EdgeCreate(source_id=n.id, target_id=nodes[-1].id))

    page = await edge_repo.list_paginated(skip=0, limit=1)
    assert page.total == 2
    assert len(page.items) == 1
