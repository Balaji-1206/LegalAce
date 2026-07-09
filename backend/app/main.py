from fastapi import FastAPI
from app.database.mongodb import db

app = FastAPI(
    title="LegalAce API",
    version="1.0.0"
)

@app.get("/")
async def home():
    return {"message": "LegalAce Backend is Running 🚀"}

@app.get("/test-db")
async def test_db():
    collections = await db.list_collection_names()

    return {
        "status": "Connected Successfully",
        "database": "LegalAce",
        "collections": collections
    }