from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException

from braintodo.embedding.base import EmbeddingProvider
from braintodo.embedding.sentence_transformer_provider import (
    get_sentence_transformer_provider,
)
from braintodo.graph.base import GraphStore, NodeNotFoundError
from braintodo.graph.neo4j_store import Neo4jGraphStore
from braintodo.graph.repository import NodeRepository, Page
from braintodo.models.node import Node, NodeCreate, NodeUpdate

router = APIRouter(prefix="/nodes", tags=["nodes"])


@lru_cache
def _default_store() -> Neo4jGraphStore:
    return Neo4jGraphStore()


def get_store() -> GraphStore:
    """Real production backend. Tests override this with InMemoryGraphStore
    via app.dependency_overrides[get_store]."""
    return _default_store()


def get_embedder() -> EmbeddingProvider:
    """Real production embedding provider. Tests override this with
    FakeEmbeddingProvider via app.dependency_overrides[get_embedder]."""
    return get_sentence_transformer_provider()


def get_node_repository(
    store: GraphStore = Depends(get_store),
    embedder: EmbeddingProvider = Depends(get_embedder),
) -> NodeRepository:
    return NodeRepository(store, embedder)


async def close_default_store() -> None:
    """Closes the singleton Neo4j driver, if one was ever created."""
    if _default_store.cache_info().currsize:
        await _default_store().close()
    _default_store.cache_clear()


@router.post("", response_model=Node, status_code=201)
async def create_node(
    data: NodeCreate, repo: NodeRepository = Depends(get_node_repository)
) -> Node:
    return await repo.create(data)


@router.get("", response_model=Page[Node])
async def list_nodes(
    skip: int = 0,
    limit: int = 20,
    repo: NodeRepository = Depends(get_node_repository),
) -> Page[Node]:
    return await repo.list_paginated(skip, limit)


@router.get("/{node_id}", response_model=Node)
async def get_node(
    node_id: str, repo: NodeRepository = Depends(get_node_repository)
) -> Node:
    try:
        return await repo.get(node_id)
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{node_id}", response_model=Node)
async def update_node(
    node_id: str, data: NodeUpdate, repo: NodeRepository = Depends(get_node_repository)
) -> Node:
    try:
        return await repo.update(node_id, data)
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{node_id}", status_code=204)
async def delete_node(
    node_id: str, repo: NodeRepository = Depends(get_node_repository)
) -> None:
    try:
        await repo.delete(node_id)
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc