from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import Region, ApplicationType, DocumentType, JobRun
from app.tasks.scheduled_jobs import (
    run_sla_breach_check,
    run_document_expiry_scan,
    run_compliance_evaluation
)
from app.core.permissions import require_roles, Role

router = APIRouter(tags=["System & Administration"])

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ApprovalTrack Backend API", "version": "1.0.0"}

@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(select(Region).limit(1))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unreachable: {str(e)}")

@router.get("/regions")
async def list_regions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Region).order_by(Region.name))
    return res.scalars().all()

@router.get("/document-types")
async def list_document_types(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DocumentType).order_by(DocumentType.name))
    return res.scalars().all()

@router.get("/application-types")
async def list_application_types(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ApplicationType).order_by(ApplicationType.name))
    return res.scalars().all()

@router.get("/jobs/runs")
async def list_job_runs(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN]))
):
    res = await db.execute(select(JobRun).order_by(JobRun.started_at.desc()).limit(limit))
    return res.scalars().all()

@router.post("/jobs/{job_name}/run")
async def manually_trigger_job(
    job_name: str,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN]))
):
    name = job_name.upper().strip()
    if name == "SLA_BREACH_CHECK":
        stats = await run_sla_breach_check(db)
    elif name == "DOC_EXPIRY_SCAN":
        stats = await run_document_expiry_scan(db)
    elif name == "COMPLIANCE_EVALUATION":
        stats = await run_compliance_evaluation(db)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown job '{job_name}'. Available: SLA_BREACH_CHECK, DOC_EXPIRY_SCAN, COMPLIANCE_EVALUATION"
        )
    return {"message": f"Job {name} executed successfully", "stats": stats}

