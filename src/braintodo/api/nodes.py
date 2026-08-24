from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException

from braintodo.api.auth import get_current_user
from braintodo.config import settings
from braintodo.db.models import User
from braintodo.embedding.base import EmbeddingProvider
from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.embedding.sentence_transformer_provider import (
    get_sentence_transformer_provider,
)
from braintodo.graph.base import GraphStore, NodeNotFoundError
from braintodo.graph.neo4j_store import Neo4jGraphStore
from braintodo.graph.repository import NodeRepository, Page
from braintodo.models.node import Node, NodeCreate, NodeUpdate
from braintodo.realtime.manager import ConnectionManager, get_manager

router = APIRouter(prefix="/nodes", tags=["nodes"])


@lru_cache
def _default_store() -> Neo4jGraphStore:
    return Neo4jGraphStore()


def get_store() -> GraphStore:
    return _default_store()

@lru_cache
def _default_fake_embedder() -> FakeEmbeddingProvider: 
    return FakeEmbeddingProvider()

def get_embedder() -> EmbeddingProvider:
    if settings.embedding_provider == "fake": 
        return _default_fake_embedder()
    if settings.embedding_provider != "sentence_transformer": 
        raise RuntimeError(
            f"Unknown EMBEDDING_PROVIDER '{settings.embedding_provider}'. "
            "Expected 'sentence_transformer' or 'fake'."
        )
    return get_sentence_transformer_provider(settings.sentence_transformer_model)

def get_node_repository(
    store: GraphStore = Depends(get_store),
    embedder: EmbeddingProvider = Depends(get_embedder),
) -> NodeRepository:
    return NodeRepository(store, embedder)

async def close_default_store() -> None:
    if _default_store.cache_info().currsize:
        await _default_store().close()
    _default_store.cache_clear()


@router.post("", response_model=Node, status_code=201)
async def create_node(
    data: NodeCreate,
    repo: NodeRepository = Depends(get_node_repository),
    manager: ConnectionManager = Depends(get_manager),
    current_user: User = Depends(get_current_user),
) -> Node:
    node = await repo.create(data, str(current_user.id))
    await manager.broadcast("node_created", node.model_dump(), str(current_user.id))
    return node


@router.get("", response_model=Page[Node])
async def list_nodes(
    skip: int = 0,
    limit: int = 20,
    repo: NodeRepository = Depends(get_node_repository),
    current_user: User = Depends(get_current_user),
) -> Page[Node]:
    return await repo.list_paginated(str(current_user.id), skip, limit)


@router.get("/{node_id}", response_model=Node)
async def get_node(
    node_id: str,
    repo: NodeRepository = Depends(get_node_repository),
    current_user: User = Depends(get_current_user),
) -> Node:
    try:
        return await repo.get(node_id, str(current_user.id))
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{node_id}", response_model=Node)
async def update_node(
    node_id: str,
    data: NodeUpdate,
    repo: NodeRepository = Depends(get_node_repository),
    manager: ConnectionManager = Depends(get_manager),
    current_user: User = Depends(get_current_user),
) -> Node:
    try:
        node = await repo.update(node_id, data, str(current_user.id))
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await manager.broadcast("node_updated", node.model_dump(), str(current_user.id))
    return node


@router.delete("/{node_id}", status_code=204)
async def delete_node(
    node_id: str,
    repo: NodeRepository = Depends(get_node_repository),
    manager: ConnectionManager = Depends(get_manager),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        await repo.delete(node_id, str(current_user.id))
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await manager.broadcast("node_deleted", {"id": node_id}, str(current_user.id))