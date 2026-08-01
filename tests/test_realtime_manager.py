from unittest.mock import AsyncMock

from braintodo.realtime.manager import ConnectionManager


async def test_broadcast_sends_to_all_connected_clients() -> None:
    manager = ConnectionManager()
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    manager._connections = {ws1, ws2}

    await manager.broadcast("node_created", {"id": "abc"})

    ws1.send_json.assert_awaited_once_with(
        {"event": "node_created", "data": {"id": "abc"}}
    )
    ws2.send_json.assert_awaited_once_with(
        {"event": "node_created", "data": {"id": "abc"}}
    )


async def test_broadcast_drops_dead_connections_without_raising() -> None:
    manager = ConnectionManager()
    healthy = AsyncMock()
    dead = AsyncMock()
    dead.send_json.side_effect = RuntimeError("connection closed")
    manager._connections = {healthy, dead}

    await manager.broadcast("node_deleted", {"id": "abc"})

    healthy.send_json.assert_awaited_once()
    assert dead not in manager._connections
    assert healthy in manager._connections


async def test_disconnect_removes_client() -> None:
    manager = ConnectionManager()
    ws = AsyncMock()
    manager._connections = {ws}

    manager.disconnect(ws)

    assert ws not in manager._connections