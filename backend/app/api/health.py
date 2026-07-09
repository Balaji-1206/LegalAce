"""
Health check endpoints.
  GET /            — Basic server health
  GET /test-db     — MongoDB connectivity check
"""
from fastapi import APIRouter, HTTPException
from app.database.mongodb import get_database

router = APIRouter(tags=["Health"])


@router.get("/", summary="Server health check")
async def home():
    return {"status": "ok", "message": "LegalAce Backend is Running 🚀"}


@router.get("/test-db", summary="MongoDB connectivity check")
async def test_db():
    try:
        db = get_database()
        collections = await db.list_collection_names()
        return {
            "status": "connected",
            "database": db.name,
            "collections": collections,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {str(e)}")
