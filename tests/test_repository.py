import pytest

from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.graph.base import NodeNotFoundError
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.graph.repository import EdgeRepository, NodeRepository
from braintodo.models.edge import EdgeCreate
from braintodo.models.node import NodeCreate, NodeUpdate


@pytest.fixture
def store() -> InMemoryGraphStore:
    return InMemoryGraphStore()

@pytest.fixture
def embedder() -> FakeEmbeddingProvider: 
    return FakeEmbeddingProvider()

async def test_node_repository_crud(
    store: InMemoryGraphStore,
    embedder: FakeEmbeddingProvider
    ) -> None:
    repo = NodeRepository(store, embedder)

    node = await repo.create(NodeCreate(title="Idea"))
    assert (await repo.get(node.id)).title == "Idea"

    updated = await repo.update(node.id, NodeUpdate(title="Renamed"))
    assert updated.title == "Renamed"

    await repo.delete(node.id)
    with pytest.raises(NodeNotFoundError):
        await repo.get(node.id)


async def test_node_repository_pagination(
    store: InMemoryGraphStore,
    embedder: FakeEmbeddingProvider
    ) -> None:
    repo = NodeRepository(store, embedder)
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


async def test_edge_repository_pagination(
    store: InMemoryGraphStore, 
    embedder: FakeEmbeddingProvider
    ) -> None:
    node_repo = NodeRepository(store, embedder)
    edge_repo = EdgeRepository(store)

    nodes = [await node_repo.create(NodeCreate(title=str(i))) for i in range(3)]
    for n in nodes[:-1]:
        await edge_repo.create(EdgeCreate(source_id=n.id, target_id=nodes[-1].id))

    page = await edge_repo.list_paginated(skip=0, limit=1)
    assert page.total == 2
    assert len(page.items) == 1

async def test_node_repository_computes_embedding_on_create(
    store: InMemoryGraphStore, 
    embedder: FakeEmbeddingProvider
) -> None: 
    repo = NodeRepository(store, embedder)
    node = await repo.create(NodeCreate(title="Idea", content="details"))
    assert node.embedding is not None
    assert len(node.embedding) == embedder.dimension
    assert node.embedding == embedder.embed("Idea details")

async def test_node_repository_recomputes_embedding_when_content_changes(
    store: InMemoryGraphStore,
    embedder: FakeEmbeddingProvider
) -> None: 
    repo = NodeRepository(store, embedder)
    node = await repo.create(NodeCreate(title="Idea", content="v1"))
    original_embedding = node.embedding

    updated = await repo.update(node.id, NodeUpdate(content="v2"))
    assert updated.embedding != original_embedding
    assert updated.embedding == embedder.embed("Idea v2")

async def test_node_repository_keeps_embedding_when_unrelated_field_changes(
    store: InMemoryGraphStore, 
    embedder: FakeEmbeddingProvider
) -> None: 
    repo = NodeRepository(store, embedder)
    node = await repo.create(NodeCreate(title="Idea", content="v1"))

    updated = await repo.update(node.id, NodeUpdate(color="#000000"))
    assert updated.embedding == node.embedding