from functools import lru_cache
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Tracks connected WebSocket clients and broadcasts events to them.

    F013 fix: broadcasts are scoped per-owner. Each connection is tagged
    with the owner_id of the user who authenticated it (see
    api/realtime.py), and `broadcast()` only reaches connections belonging
    to that same owner - so one user's graph edits never appear on another
    user's screen. Previously every connected client received every
    event regardless of whose data it was, which broke the same
    per-user isolation guarantee F020 established for the REST API.

    Single-process, in-memory - fine for this app since there's only
    one FastAPI process; a multi-instance deployment would need a shared
    pub/sub (e.g. Redis) instead, but that's not needed here.
    """

    def __init__(self) -> None:
        self._connections: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, owner_id: str) -> None:
        await websocket.accept()
        self._connections[websocket] = owner_id

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.pop(websocket, None)

    async def broadcast(self, event: str, data: dict[str, Any], owner_id: str) -> None:
        message = {"event": event, "data": data}
        dead: list[WebSocket] = []
        for connection, connection_owner_id in self._connections.items():
            if connection_owner_id != owner_id:
                continue
            try:
                await connection.send_json(message)
            except Exception:  # noqa: BLE001
                # Client disconnected without a clean close handshake -
                # drop it rather than letting one dead socket break the
                # broadcast for everyone else.
                dead.append(connection)
        for connection in dead:
            self._connections.pop(connection, None)


@lru_cache
def _default_manager() -> ConnectionManager:
    return ConnectionManager()


def get_manager() -> ConnectionManager:
    """Real singleton connection manager. Tests override this with a fresh
    ConnectionManager via app.dependency_overrides[get_manager]."""
    return _default_manager()