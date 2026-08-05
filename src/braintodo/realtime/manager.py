from functools import lru_cache
from typing import Any

from fastapi import WebSocket


class ConnectionManager: 
    """Tracks connected WebSocket clients and broadcasts events to all of
    them. Single-process, in-memory - fine for this app since there's only
    one FastAPI process; a multi-instance deployment would need a shared
    pub/sub (e.g. Redis) instead, but that's not needed here."""

    def __init__(self) -> None: 
        self._connections: set[WebSocket] = set() 
    
    async def connect(self, websocket: WebSocket) -> None: 
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None: 
        self._connections.discard(websocket)

    async def broadcast(self, event: str, data: dict[str, Any]) -> None: 
        message = {"event": event, "data": data}
        dead: list[WebSocket] = [] 
        for connection in self._connections: 
            try: 
                await connection.send_json(message)
            except Exception: # noqa: BLE001

            # Client disconnected without a clean close handshake -
            # drop it rather than letting one dead socket break the
            # broadcast for everyone else.
                dead.append(connection)
        for connection in dead: 
            self._connections.discard(connection)

@lru_cache 
def _default_manager() -> ConnectionManager: 
    return ConnectionManager()

def get_manager() -> ConnectionManager: 
    """Real singleton connection manager. Tests override this with a fresh
    ConnectionManager via app.dependency_overrides[get_manager]."""
    return _default_manager()
    