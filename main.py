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
        self._active.discard(ws)

    async def broadcast_json(self, message: dict) -> None:
        dead = []
        for ws in list(self._active):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Accept ANY incoming ws frame (text/binary/ping)
            await ws.receive()
    except WebSocketDisconnect:
        manager.disconnect(ws)


@app.get("/programs")
def list_programs():
    return PROGRAMS


@app.get("/programs/{key}")
def program_detail(key: str):
    prog = next((p for p in PROGRAMS if p["key"] == key), None)
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return {**prog, "results": RESULTS.get(key, [])}


@app.post("/announce")
async def announce(payload: dict):
    """
    Expected payloads:
      • { program_name, section }                    -> DISPLAY_PROGRAM
      • { program_name, section, result: {...} }    -> DISPLAY_RESULT
    """
    is_result = payload.get("result") is not None

    msg_type = "DISPLAY_RESULT" if is_result else "DISPLAY_PROGRAM"
    data = {
        "program_name": payload.get("program_name"),
        "section": payload.get("section"),
    }
    if is_result:
        data["result"] = payload.get("result")

    await manager.broadcast_json({"type": msg_type, "payload": data})

    return {"status": "ok"}