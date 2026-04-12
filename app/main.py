"""
Main FastAPI Application Entry Point
AI-Enabled Neuro-Cognitive Adaptive Learning Framework
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
from app.config import settings
from app.api import routes_adaptation, routes_assessment, routes_user
from app.utils.logger import setup_logger
import time

logger = setup_logger(__name__)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Neuro-Cognitive Adaptive Learning API",
    description="AI-powered adaptive learning framework with cognitive profiling and personalized content delivery",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again."}
    )

# ✅ Use cors_origins property (parsed list) instead of raw ALLOWED_ORIGINS string
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.2f}s")
    return response

# Include routers
app.include_router(
    routes_user.router,
    prefix="/api/v1/users",
    tags=["Users"]
)
app.include_router(
    routes_assessment.router,
    prefix="/api/v1/assessment",
    tags=["Assessment"]
)
app.include_router(
    routes_adaptation.router,
    prefix="/api/v1/adaptation",
    tags=["Adaptation"]
)

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "message": "Neuro-Cognitive Adaptive Learning API",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else "disabled in production"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Render uses this endpoint to verify the service is up"""
    return {
        "status": "healthy",
        "api_version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An error occurred"
        }
    )

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Neuro-Cognitive Adaptive Learning API...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Allowed origins: {settings.cors_origins}")
    logger.info("API startup complete!")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down API...")
    logger.info("Shutdown complete!")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )