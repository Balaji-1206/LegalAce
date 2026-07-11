"""
API endpoints for Situation Finder module.
  GET /api/v1/situations
  GET /api/v1/situations/categories
  GET /api/v1/situations/{id}
  GET /api/v1/situations/category/{category}
"""
from fastapi import APIRouter, HTTPException
from app.core.logging import get_logger
from app.modules.situation_finder.schemas import SituationResponse, CategorySummary
from app.modules.situation_finder import service as situation_service

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/situations", tags=["Situation Finder"])

@router.get(
    "",
    response_model=list[SituationResponse],
    summary="Get all situations",
    description="Returns a full list of all available pre-compiled scenario guides.",
)
async def get_all_situations() -> list[SituationResponse]:
    try:
        return await situation_service.get_all_situations()
    except Exception as e:
        logger.error(f"Error fetching situations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve situations.")

@router.get(
    "/categories",
    response_model=list[CategorySummary],
    summary="Get all categories with situation counts",
    description="Returns a list of all 8 legal categories, with icons, CSS gradients, and count counts.",
)
async def get_categories() -> list[CategorySummary]:
    try:
        return await situation_service.get_categories_summary()
    except Exception as e:
        logger.error(f"Error fetching categories summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve categories.")

@router.get(
    "/{situation_id}",
    response_model=SituationResponse,
    summary="Get a single situation guide by ID",
    description="Returns the full detail list of rights, citations, and timeline steps for a specific scenario.",
)
async def get_situation(situation_id: str) -> SituationResponse:
    sit = await situation_service.get_situation_by_id(situation_id)
    if not sit:
        raise HTTPException(status_code=404, detail=f"Situation guide '{situation_id}' not found.")
    return sit

@router.get(
    "/category/{category}",
    response_model=list[SituationResponse],
    summary="Get situation guides by category",
    description="Returns all scenario guides belonging to a specific category key (e.g. employment).",
)
async def get_by_category(category: str) -> list[SituationResponse]:
    try:
        return await situation_service.get_situations_by_category(category)
    except Exception as e:
        logger.error(f"Error fetching situations for category '{category}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve situations for this category.")
