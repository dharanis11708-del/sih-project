from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import Application, Institution, ApplicationStageHistory

router = APIRouter(prefix="/public", tags=["Public Portal"])

class PublicTrackRequest(BaseModel):
    application_no: str
    email: str

@router.post("/track")
async def track_application_public(
    payload: PublicTrackRequest,
    db: AsyncSession = Depends(get_db)
):
    app_no = payload.application_no.strip().upper()
    email = payload.email.strip().lower()

    res = await db.execute(
        select(Application).join(Application.institution).where(
            and_(
                Application.application_no == app_no,
                Institution.contact_email == email
            )
        )
    )
    app = res.scalars().first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "No matching application found for this application number and email."}}
        )

    # Fetch stage history
    hist_res = await db.execute(
        select(ApplicationStageHistory).where(ApplicationStageHistory.application_id == app.id).order_by(ApplicationStageHistory.entered_at)
    )
    history = hist_res.scalars().all()

    return {
        "application_no": app.application_no,
        "institution_name": app.institution.name if app.institution else "",
        "state": app.institution.state if app.institution else "",
        "type": app.application_type.name if app.application_type else "",
        "current_status": app.status,
        "stage_name": app.current_stage.name if app.current_stage else app.status,
        "submitted_at": app.submitted_at,
        "timeline": [
            {
                "stage": h.stage.name if h.stage else "Initial",
                "entered_at": h.entered_at,
                "exited_at": h.exited_at,
                "outcome": h.outcome
            } for h in history
        ]
    }
