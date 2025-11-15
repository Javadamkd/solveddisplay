# Result Display — Frontend/Backend Split

This repo now includes a separate backend (FastAPI) and supports deployment to Render via a blueprint. The frontend can be housed under `frontend/`.

## Structure
- `backend/`: FastAPI app exposing `/programs`, `/programs/{key}`, and `/announce`.
- `frontend/`: Vite React app (move `src/`, `index.html`, config files, and `public/` here).

## Local Development
1. Frontend (from `frontend/`):
   - `cd frontend`
   - `npm ci`
   - `npm run dev`
2. Backend:
   - `python3 -m venv venv && source venv/bin/activate`
   - `pip install -r backend/requirements.txt`
   - `uvicorn backend.main:app --host 0.0.0.0 --port 8000`

Configure frontend env (`frontend/.env.local`):
```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8000
```

## Deploy to Render (GitHub)
Render can deploy both services using `render.yaml`. The static site builds from `frontend/`.

1. Push this repo to GitHub.
2. In Render, go to “Blueprints” → “New Blueprint” → select this repo.
3. Deploy. The blueprint defines:
   - Static Site: builds with `npm ci && npm run build`, publishes `dist`.
   - Web Service (Python): installs `backend/requirements.txt`, starts `uvicorn backend.main:app` on port `8000`.

After the backend URL is created (e.g., `https://result-display-backend.onrender.com`), set it in a Render Environment Variable for the static site:
```
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://<your-backend-service-url>
```
Trigger a manual deploy of the static site so the env vars take effect.

## Notes
- Static assets should be under `frontend/public/` (e.g., `frontend/public/photos`).
- The frontend routes are handled client-side; ensure a rewrite `/* -> /index.html` is configured for direct deep links.
- WebSocket support is optional; set `VITE_ENABLE_WS=false` unless you add a WS server.