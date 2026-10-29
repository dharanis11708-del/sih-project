import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.db.session import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.institutions import router as institutions_router
from app.api.v1.applications import router as applications_router
from app.api.v1.deficiencies import router as deficiencies_router
from app.api.v1.documents import router as documents_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.evc import router as evc_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.reports import router as reports_router
from app.api.v1.audit import router as audit_router
from app.api.v1.public import router as public_router
from app.api.v1.system import router as system_router

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ApprovalTrack Database Tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down ApprovalTrack Backend.")

app = FastAPI(
    title=settings.APP_NAME,
    description="AICTE Approval Workflow Automation, Compliance Monitoring & Alert Management System (SIH 2026)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized Error Handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An internal server error occurred."}}
    )

# Include API v1 Routers
prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=prefix)
app.include_router(users_router, prefix=prefix)
app.include_router(institutions_router, prefix=prefix)
app.include_router(applications_router, prefix=prefix)
app.include_router(deficiencies_router, prefix=prefix)
app.include_router(documents_router, prefix=prefix)
app.include_router(compliance_router, prefix=prefix)
app.include_router(evc_router, prefix=prefix)
app.include_router(alerts_router, prefix=prefix)
app.include_router(dashboard_router, prefix=prefix)
app.include_router(reports_router, prefix=prefix)
app.include_router(audit_router, prefix=prefix)
app.include_router(public_router, prefix=prefix)
app.include_router(system_router, prefix=prefix)

# Mount uploads directory for preview
if os.path.exists(settings.STORAGE_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.STORAGE_DIR), name="uploads")

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

