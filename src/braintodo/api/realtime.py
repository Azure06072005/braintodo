from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from braintodo.realtime.manager import ConnectionManager, get_manager

router = APIRouter(tags=["realtime"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, manager: ConnectionManager = Depends(get_manager)
) -> None: 
    await manager.connect(websocket)
    try: 
        while True: 
             # This endpoint only pushes events to clients; it doesn't act on
            # anything clients send. We still need to await something so we
            # notice when the client disconnects
            await websocket.receive_text()
    except WebSocketDisconnect: 
        manager.disconnect(websocket)