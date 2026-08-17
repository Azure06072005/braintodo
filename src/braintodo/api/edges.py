from fastapi import APIRouter, Depends, HTTPException

from braintodo.api.auth import get_current_user
from braintodo.api.nodes import get_store
from braintodo.db.models import User
from braintodo.graph.base import EdgeNotFoundError, GraphStore, NodeNotFoundError
from braintodo.graph.repository import EdgeRepository, Page
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.realtime.manager import ConnectionManager, get_manager

router = APIRouter(prefix="/edges", tags=["edges"])


def get_edge_repository(store: GraphStore = Depends(get_store)) -> EdgeRepository:
    return EdgeRepository(store)


@router.post("", response_model=Edge, status_code=201)
async def create_edge(
    data: EdgeCreate,
    repo: EdgeRepository = Depends(get_edge_repository),
    manager: ConnectionManager = Depends(get_manager),
    current_user: User = Depends(get_current_user),
) -> Edge:
    try:
        edge = await repo.create(data, str(current_user.id))
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await manager.broadcast("edge_created", edge.model_dump())
    return edge


@router.get("", response_model=Page[Edge])
async def list_edges(
    skip: int = 0,
    limit: int = 20,
    repo: EdgeRepository = Depends(get_edge_repository),
    current_user: User = Depends(get_current_user),
) -> Page[Edge]:
    return await repo.list_paginated(str(current_user.id), skip, limit)


@router.get("/{edge_id}", response_model=Edge)
async def get_edge(
    edge_id: str,
    repo: EdgeRepository = Depends(get_edge_repository),
    current_user: User = Depends(get_current_user),
) -> Edge:
    try:
        return await repo.get(edge_id, str(current_user.id))
    except EdgeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{edge_id}", response_model=Edge)
async def update_edge(
    edge_id: str,
    data: EdgeUpdate,
    repo: EdgeRepository = Depends(get_edge_repository),
    manager: ConnectionManager = Depends(get_manager),
    current_user: User = Depends(get_current_user),
) -> Edge:
    try:
        edge = await repo.update(edge_id, data, str(current_user.id))
    except EdgeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await manager.broadcast("edge_updated", edge.model_dump())
    return edge


@router.delete("/{edge_id}", status_code=204)
async def delete_edge(
    edge_id: str,
    repo: EdgeRepository = Depends(get_edge_repository),
    manager: ConnectionManager = Depends(get_manager),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        await repo.delete(edge_id, str(current_user.id))
    except EdgeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await manager.broadcast("edge_deleted", {"id": edge_id})
