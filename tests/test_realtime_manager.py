from unittest.mock import AsyncMock

from braintodo.realtime.manager import ConnectionManager

OWNER_A = "owner-a"
OWNER_B = "owner-b"


async def test_broadcast_sends_only_to_connections_of_the_same_owner() -> None:
    manager = ConnectionManager()
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    other_owner_ws = AsyncMock()
    manager._connections = {ws1: OWNER_A, ws2: OWNER_A, other_owner_ws: OWNER_B}

    await manager.broadcast("node_created", {"id": "abc"}, OWNER_A)

    ws1.send_json.assert_awaited_once_with(
        {"event": "node_created", "data": {"id": "abc"}}
    )
    ws2.send_json.assert_awaited_once_with(
        {"event": "node_created", "data": {"id": "abc"}}
    )
    # F013: a different owner's connection never receives this broadcast.
    other_owner_ws.send_json.assert_not_awaited()


async def test_broadcast_drops_dead_connections_without_raising() -> None:
    manager = ConnectionManager()
    healthy = AsyncMock()
    dead = AsyncMock()
    dead.send_json.side_effect = RuntimeError("connection closed")
    manager._connections = {healthy: OWNER_A, dead: OWNER_A}

    await manager.broadcast("node_deleted", {"id": "abc"}, OWNER_A)

    healthy.send_json.assert_awaited_once()
    assert dead not in manager._connections
    assert healthy in manager._connections


async def test_disconnect_removes_client() -> None:
    manager = ConnectionManager()
    ws = AsyncMock()
    manager._connections = {ws: OWNER_A}

    manager.disconnect(ws)

    assert ws not in manager._connections


async def test_connect_accepts_and_tracks_the_owner_id() -> None:
    manager = ConnectionManager()
    ws = AsyncMock()

    await manager.connect(ws, OWNER_A)

    ws.accept.assert_awaited_once()
    assert manager._connections[ws] == OWNER_A


async def test_disconnect_of_unknown_socket_is_a_no_op() -> None:
    manager = ConnectionManager()
    ws = AsyncMock()

    # Should not raise even though `ws` was never connected.
    manager.disconnect(ws)

    assert ws not in manager._connections