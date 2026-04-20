"""
WebSocket-based real-time ride tracking.

Rooms are keyed by ride_id. A driver pushes location updates into the room,
and all connected riders (watchers) receive those updates instantly.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from config.settings import settings
import json
import asyncio

router = APIRouter()

# In-memory room registry: { ride_id: set[WebSocket] }
_rooms: dict[int, set[WebSocket]] = {}


def _get_room(ride_id: int) -> set[WebSocket]:
    if ride_id not in _rooms:
        _rooms[ride_id] = set()
    return _rooms[ride_id]


async def _broadcast(ride_id: int, message: dict, exclude: WebSocket | None = None):
    """Send a message to every socket in the ride room except `exclude`."""
    room = _rooms.get(ride_id, set())
    dead: list[WebSocket] = []
    for ws in room:
        if ws is exclude:
            continue
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        room.discard(ws)


async def broadcast_ride_status(ride_id: int, new_status: str, extra: dict | None = None):
    """
    Public helper — called from the driver service to push ride status
    change events to all WebSocket clients watching this ride.
    """
    message = {
        "type": "ride_status",
        "ride_id": ride_id,
        "status": new_status,
    }
    if extra:
        message.update(extra)
    await _broadcast(ride_id, message)


def _authenticate_token(token: str) -> int | None:
    """Decode JWT and return user id, or None if invalid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except (JWTError, ValueError, TypeError):
        return None


@router.websocket("/ws/track/{ride_id}")
async def track_ride(websocket: WebSocket, ride_id: int, token: str = Query(default=None)):
    """
    WebSocket endpoint for real-time ride tracking.

    Connection flow:
    1. Client connects with ?token=<jwt> query param
    2. Server authenticates the token
    3. Client sends JSON messages:
       - Driver: {"type": "location", "latitude": ..., "longitude": ..., "accuracy": ...}
       - Rider:  (just listens, but can send {"type": "ping"} to keep alive)
    4. Server broadcasts driver location to all watchers in the room.
    """

    # Authenticate via query param token
    user_id = _authenticate_token(token) if token else None
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()

    room = _get_room(ride_id)
    room.add(websocket)

    # Send a welcome message
    await websocket.send_json({
        "type": "connected",
        "ride_id": ride_id,
        "message": "Connected to ride tracking",
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "location":
                # Driver is pushing a location update → broadcast to riders
                broadcast_msg = {
                    "type": "driver_location",
                    "ride_id": ride_id,
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "accuracy": data.get("accuracy"),
                    "timestamp": data.get("timestamp"),
                }
                await _broadcast(ride_id, broadcast_msg, exclude=websocket)

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        room.discard(websocket)
        # Clean up empty rooms
        if not room:
            _rooms.pop(ride_id, None)
