from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import analyze, labels, menu, upload

app = FastAPI(title="haochi-midao")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(upload.router)
api_router.include_router(menu.router)
api_router.include_router(analyze.router)
api_router.include_router(labels.router)
app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}


# In production, serve the built frontend as static files
static_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
