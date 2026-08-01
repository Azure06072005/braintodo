import networkx as nx
import pytest

from braintodo.analytics.pagerank import pagerank
from braintodo.analytics.service import TopologyService
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.models.edge import EdgeCreate
from braintodo.models.node import NodeCreate


async def _make_node(store: InMemoryGraphStore, title: str) -> str:
    node = await store.create_node(NodeCreate(title=title))
    return node.id


async def test_empty_graph_returns_no_metrics() -> None:
    store = InMemoryGraphStore()

    service = TopologyService(store)
    metrics = await service.compute_metrics()

    assert metrics == []


async def test_hub_node_has_highest_degree_and_betweenness() -> None:
    store = InMemoryGraphStore()
    hub = await _make_node(store, "Hub")
    a, b, c = (
        await _make_node(store, "A"),
        await _make_node(store, "B"),
        await _make_node(store, "C"),
    )
    for leaf in (a, b, c):
        await store.create_edge(EdgeCreate(source_id=hub, target_id=leaf))

    service = TopologyService(store)
    metrics = {m.node_id: m for m in await service.compute_metrics()}

    assert metrics[hub].degree == 3
    assert metrics[hub].betweenness_centrality > metrics[a].betweenness_centrality
    assert metrics[hub].degree_centrality == pytest.approx(1.0)
    for leaf in (a, b, c):
        assert metrics[leaf].degree == 1
        assert metrics[leaf].betweenness_centrality == 0.0


async def test_isolated_node_has_zero_degree_and_betweenness() -> None:
    store = InMemoryGraphStore()
    lonely = await _make_node(store, "Lonely")

    service = TopologyService(store)
    metrics = {m.node_id: m for m in await service.compute_metrics()}

    assert metrics[lonely].degree == 0
    assert metrics[lonely].betweenness_centrality == 0.0
    # networkx's convention: with only one node in the graph, degree_centrality
    # is defined as 1.0 (the n-1 divisor would otherwise be zero) - not 0.0.


async def test_pagerank_sums_to_approximately_one() -> None:
    store = InMemoryGraphStore()
    a, b, c = (
        await _make_node(store, "A"),
        await _make_node(store, "B"),
        await _make_node(store, "C"),
    )
    await store.create_edge(EdgeCreate(source_id=a, target_id=b))
    await store.create_edge(EdgeCreate(source_id=b, target_id=c))

    service = TopologyService(store)
    metrics = await service.compute_metrics()

    total = sum(m.pagerank for m in metrics)
    assert total == pytest.approx(1.0, abs=1e-4)


def test_pagerank_on_empty_graph_returns_empty_dict() -> None:
    graph: nx.Graph = nx.Graph()
    assert pagerank(graph) == {}


def test_pagerank_gives_more_weight_to_more_connected_node() -> None:
    graph: nx.Graph = nx.Graph()
    graph.add_nodes_from(["hub", "a", "b", "c"])
    for leaf in ("a", "b", "c"):
        graph.add_edge("hub", leaf)

    scores = pagerank(graph)

    assert scores["hub"] > scores["a"]
    assert scores["hub"] > scores["b"]
    assert scores["hub"] > scores["c"]