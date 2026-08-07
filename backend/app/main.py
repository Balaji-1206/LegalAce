"""
LegalAce FastAPI Application Entry Point.
Updated with expanded Guided Legal Wizard modules & AI tree generators.

Startup sequence (lifespan):
  1. Setup structured logging
  2. Connect to MongoDB + create indexes
  3. Load SentenceTransformer embedding model
  4. Load (or build) FAISS index
  5. Initialize LangChain LLM client

Shutdown sequence:
  1. Close MongoDB connection
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging, get_logger

# Setup logging before anything else
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown of all application resources."""
    # ------------------------------------------------------------------ #
    # STARTUP
    # ------------------------------------------------------------------ #
    logger.info("=== LegalAce Backend Starting Up ===")

    # 1. MongoDB
    from app.database.mongodb import connect_to_mongo
    await connect_to_mongo()

    # 2. Load embedding model (blocks until model is loaded from disk/cache)
    from app.modules.chatbot.rag import embedder
    embedder.load_embedder()
 
    # 3. Load (or auto-build) FAISS index
    from app.modules.chatbot.rag import faiss_store
    faiss_store.load_index()
 
    # 4. Initialize LLM
    from app.modules.chatbot.rag.pipeline import load_openai_client
    load_openai_client()
 
    # 5. Start Deadline Engine background scheduler (Module 3)
    from app.modules.deadline_engine.scheduler import start_scheduler
    start_scheduler()
 
    logger.info("=== LegalAce Backend Ready ===")
 
    yield  # Application runs here
 
    # ------------------------------------------------------------------ #
    # SHUTDOWN
    # ------------------------------------------------------------------ #
    logger.info("=== LegalAce Backend Shutting Down ===")
    from app.modules.deadline_engine.scheduler import stop_scheduler
    stop_scheduler()
    from app.database.mongodb import close_mongo_connection
    await close_mongo_connection()
    logger.info("=== Shutdown Complete ===")
 
 
# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="LegalAce API",
    description=(
        "AI-powered legal rights companion for Indian citizens. "
        "Provides legal information (not legal advice) with citations to Indian laws."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)
 
# ---------------------------------------------------------------------------
# CORS Middleware — allow React Native / Expo frontend
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
 
# ---------------------------------------------------------------------------
# Global Exception Handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred. Please try again later.",
        },
    )
 
# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
from app.api.health import router as health_router
from app.api.llm_settings import router as llm_settings_router
from app.modules.chatbot.api import router as chat_router
from app.modules.chatbot.conversation_api import router as conversation_router
from app.modules.situation_finder.api import router as situations_router
from app.modules.deadline_engine.api import router as deadline_router
from app.modules.wizard.api import router as wizard_router
from app.modules.agent.api import router as agent_router
from app.modules.document_xray.api import router as document_xray_router
from app.modules.notifications.api import router as notifications_router
from app.modules.legal_aid.api import router as legal_aid_router

app.include_router(health_router)
app.include_router(llm_settings_router)
app.include_router(chat_router)
app.include_router(conversation_router)
app.include_router(situations_router)
app.include_router(deadline_router)
app.include_router(wizard_router)
app.include_router(agent_router)
app.include_router(document_xray_router)
app.include_router(notifications_router)
app.include_router(legal_aid_router)