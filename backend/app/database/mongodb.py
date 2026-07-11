from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """Initialize MongoDB connection. Called during app lifespan startup."""
    global _client, _db
    logger.info("Connecting to MongoDB...")
    _client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=5000,  # Fail fast if MongoDB is unavailable
    )
    _db = _client[settings.DATABASE_NAME]

    # Create indexes — wrapped so server can start even if MongoDB is temporarily unavailable
    try:
        await _db["conversations"].create_index("conversation_id", unique=True)
        await _db["conversations"].create_index("user_id")
        await _db["conversations"].create_index("updated_at")
        # Module 3 — Deadline Engine indexes
        await _db["deadlines"].create_index("user_id")
        await _db["deadlines"].create_index("status")
        await _db["deadlines"].create_index([("user_id", 1), ("status", 1), ("deadline_date", 1)])
        logger.info(f"Connected to MongoDB — database: '{settings.DATABASE_NAME}'")
    except Exception as e:
        logger.warning(f"MongoDB index creation skipped — DB may not be available: {e}")
        logger.warning("Chat features requiring MongoDB will be unavailable until MongoDB is started.")



async def close_mongo_connection() -> None:
    """Close MongoDB connection. Called during app lifespan shutdown."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    """Return the active database instance."""
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    return _db