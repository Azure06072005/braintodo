import pytest

from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.gnn.fake_graph_embedder import FakeGraphEmbedder
from braintodo.gnn.service import GraphEmbeddingService
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.graph.repository import NodeRepository
from braintodo.models.edge import EdgeCreate
from braintodo.models.node import NodeCreate

OWNER = "owner-1"


@pytest.fixture
def store() -> InMemoryGraphStore:
    return InMemoryGraphStore()


@pytest.fixture
def node_repo(store: InMemoryGraphStore) -> NodeRepository:
    return NodeRepository(store, FakeEmbeddingProvider())


async def test_recompute_all_sets_graph_embedding_on_every_node(
    store: InMemoryGraphStore, node_repo: NodeRepository
) -> None:
    a = await node_repo.create(NodeCreate(title="A"), OWNER)
    b = await node_repo.create(NodeCreate(title="B"), OWNER)
    await store.create_edge(EdgeCreate(source_id=a.id, target_id=b.id), OWNER)

    service = GraphEmbeddingService(store, FakeGraphEmbedder(output_dimension=8))
    updated_count = await service.recompute_all(OWNER)

    assert updated_count == 2
    a_after = await store.get_node(a.id, OWNER)
    b_after = await store.get_node(b.id, OWNER)
    assert a_after.graph_embedding is not None
    assert len(a_after.graph_embedding) == 8
    assert b_after.graph_embedding is not None
    assert a_after.graph_embedding == b_after.graph_embedding


async def test_recompute_all_skips_nodes_without_text_embedding(
    store: InMemoryGraphStore, node_repo: NodeRepository
) -> None:
    from braintodo.models.node import NodeCreate as RawNodeCreate

    raw_node = await store.create_node(RawNodeCreate(title="No embedding"), OWNER)

    service = GraphEmbeddingService(store, FakeGraphEmbedder())
    updated_count = await service.recompute_all(OWNER)

    assert updated_count == 0
    after = await store.get_node(raw_node.id, OWNER)
    assert after.graph_embedding is None


async def test_recompute_all_on_empty_graph(store: InMemoryGraphStore) -> None:
    service = GraphEmbeddingService(store, FakeGraphEmbedder())
    assert await service.recompute_all(OWNER) == 0