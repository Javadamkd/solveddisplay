from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.websockets import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Result Display API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sample in-memory data compatible with the frontend normalizers
PROGRAMS = [
    {"key": "prog-100", "program_name": "Dance Solo", "section": "Senior", "read": False, "results": []},
    {"key": "prog-200", "program_name": "Classical Vocal", "section": "Junior", "read": False, "results": []},
    {"key": "prog-300", "program_name": "Instrumental Violin", "section": "Open", "read": True, "results": []},
]

RESULTS = {
    "prog-100": [
        {"position": 1, "grade": "A", "name": "Alex Johnson", "team": "Team Orion", "chest_no": "C-101", "photo_url": None},
        {"position": 2, "grade": "B", "name": "Bella Smith", "team": "Team Orion", "chest_no": "C-102", "photo_url": None},
        {"position": 3, "grade": "B", "name": "Chris Lee", "team": "Team Orion", "chest_no": "C-103", "photo_url": None},
    ],
    "prog-200": [
        {"position": 1, "grade": "A", "name": "Divya Patel", "team": "Team Atlas", "chest_no": "C-201", "photo_url": None},
        {"position": 2, "grade": "A", "name": "Ethan Clark", "team": "Team Atlas", "chest_no": "C-202", "photo_url": None},
        {"position": 3, "grade": "C", "name": "Farah Khan", "team": "Team Atlas", "chest_no": "C-203", "photo_url": None},
    ],
    "prog-300": [],
}


class ConnectionManager:
    def __init__(self) -> None:
        self._active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._active.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        try:
            self._active.remove(ws)
        except KeyError:
            pass

    async def broadcast_json(self, message: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._active):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        print("[backend] WS client connected")
        while True:
            # We don't expect messages from clients; just keep the connection open.
            # Read and ignore any incoming messages to keep the loop alive.
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
        print("[backend] WS client disconnected")

@app.get("/programs")
def list_programs():
    # Frontend expects an array of programs without results here
    return PROGRAMS

@app.get("/programs/{key}")
def program_detail(key: str):
    prog = next((p for p in PROGRAMS if p["key"] == key), None)
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return {**prog, "results": RESULTS.get(key, [])}

@app.post("/announce")
def announce(payload: dict):
    # Accepts payloads from the frontend and broadcasts to WebSocket viewers.
    # Two shapes are supported:
    # 1) { program_name, section } -> DISPLAY_PROGRAM
    # 2) { program_name, section, result } -> DISPLAY_RESULT
    print("[backend] /announce", payload)
    msg_type = "DISPLAY_RESULT" if payload.get("result") is not None else "DISPLAY_PROGRAM"
    broadcast_payload = {
        "program_name": payload.get("program_name"),
        "section": payload.get("section"),
    }
    if msg_type == "DISPLAY_RESULT":
        broadcast_payload["result"] = payload.get("result")

    # Fire-and-forget broadcast; run in the event loop
    import anyio
    anyio.from_thread.run(manager.broadcast_json, {"type": msg_type, "payload": broadcast_payload})
    print("[backend] broadcast", {"type": msg_type, "payload": broadcast_payload})

    return {"status": "ok"}