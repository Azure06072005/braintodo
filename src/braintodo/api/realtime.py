from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from braintodo.auth.security import decode_access_token
from braintodo.db.base import get_session
from braintodo.db.repository import UserRepository
from braintodo.realtime.manager import ConnectionManager, get_manager

router = APIRouter(tags=["realtime"])

# WebSocket handshakes from browser JS can't set an Authorization header
# (unlike fetch/XHR), so the standard workaround is a `token` query param
# on the connection URL: ws://host/ws?token=<access_token>. This carries
# the same JWT issued by POST /auth/login (F011) - no separate token type.
_WS_POLICY_VIOLATION = 1008


async def _authenticate(
    websocket: WebSocket, token: str | None, session: AsyncSession
) -> str | None:
    """Returns the authenticated user's owner_id (str), or None if the
    token is missing/invalid/expired/for a deleted user - in which case
    the caller should close the connection rather than accept it."""
    if token is None:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    user = await UserRepository(session).get_by_id(user_id)
    if user is None:
        return None
    return str(user.id)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = None,
    manager: ConnectionManager = Depends(get_manager),
    session: AsyncSession = Depends(get_session),
) -> None:
    owner_id = await _authenticate(websocket, token, session)
    if owner_id is None:
        # Reject before accept() - same "don't distinguish invalid token
        # from no token" posture as the REST API's 401s (F020).
        await websocket.close(code=_WS_POLICY_VIOLATION)
        return

    await manager.connect(websocket, owner_id)
    try:
        while True:
            # This endpoint only pushes events to clients; it doesn't act on
            # anything clients send. We still need to await something so we
            # notice when the client disconnects
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)