from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import Deficiency, Application, User, Notification, WorkflowStage
from app.schemas.schemas import DeficiencyCreate, DeficiencyResponse, DeficiencyRespondRequest
from app.core.permissions import require_roles, Role, oauth2_scheme
from app.core.security import decode_token

router = APIRouter(tags=["Deficiencies"])

@router.get("/applications/{application_id}/deficiencies", response_model=List[DeficiencyResponse])
async def list_application_deficiencies(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    res = await db.execute(
        select(Deficiency).where(Deficiency.application_id == application_id).order_by(Deficiency.created_at.desc())
    )
    defs = res.scalars().all()
    out = []
    for d in defs:
        resp = DeficiencyResponse.from_orm(d)
        resp.raised_by_name = d.raised_by.name if d.raised_by else "Officer"
        out.append(resp)
    return out

@router.post("/applications/{application_id}/deficiencies", response_model=DeficiencyResponse)
async def raise_deficiency(
    application_id: str,
    payload: DeficiencyCreate,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AICTE_OFFICER]))
):
    token_data = decode_token(token)
    officer_id = token_data.get("sub")

    app_res = await db.execute(select(Application).where(Application.id == application_id))
    app = app_res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    now = datetime.now(timezone.utc)
    due_at = now + timedelta(days=payload.due_days or 5)

    deficiency = Deficiency(
        application_id=application.id,
        raised_by_id=officer_id,
        category=payload.category,
        description=payload.description,
        status="OPEN",
        due_at=due_at
    )
    db.add(deficiency)

    # Shift application status to deficiency loop
    app.status = "DEFICIENCY"

    # Notify College Admin
    college_res = await db.execute(
        select(User).where(
            and_(
                User.institution_id == app.institution_id,
                User.role == Role.COLLEGE_ADMIN.value
            )
        )
    )
    college_admin = college_res.scalars().first()
    if college_admin:
        db.add(Notification(
            user_id=college_admin.id,
            title=f"Deficiency Raised: Application {app.application_no}",
            body=f"AICTE scrutiny officer raised a deficiency: '{payload.category}'. Response due by {due_at.strftime('%Y-%m-%d')}.",
            severity="WARNING",
            entity_type="DEFICIENCY",
            entity_id=deficiency.id
        ))

    await db.commit()
    await db.refresh(deficiency)

    resp = DeficiencyResponse.from_orm(deficiency)
    resp.raised_by_name = "Officer"
    return resp

@router.post("/deficiencies/{deficiency_id}/respond")
async def respond_to_deficiency(
    deficiency_id: str,
    payload: DeficiencyRespondRequest,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    _ = Depends(require_roles([Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]))
):
    res = await db.execute(select(Deficiency).where(Deficiency.id == deficiency_id))
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=404, detail="Deficiency not found")

    d.response_text = payload.response_text
    d.responded_at = datetime.now(timezone.utc)
    d.status = "RESPONDED"

    # Notify Scrutiny Officer
    if d.application and d.application.assigned_officer_id:
        db.add(Notification(
            user_id=d.application.assigned_officer_id,
            title=f"Deficiency Response Submitted: {d.application.application_no}",
            body=f"The institution has submitted an explanation for '{d.category}'. Review required.",
            severity="INFO",
            entity_type="DEFICIENCY",
            entity_id=d.id
        ))

    await db.commit()
    return {"message": "Deficiency response submitted successfully"}

@router.post("/deficiencies/{deficiency_id}/resolve")
async def resolve_deficiency(
    deficiency_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AICTE_OFFICER]))
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")

    res = await db.execute(select(Deficiency).where(Deficiency.id == deficiency_id))
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=404, detail="Deficiency not found")

    d.status = "RESOLVED"
    d.resolved_at = datetime.now(timezone.utc)
    d.resolved_by_id = user_id

    # If no other open deficiencies on application, revert status back to Scrutiny
    open_count_res = await db.execute(
        select(func.count(Deficiency.id)).where(
            and_(
                Deficiency.application_id == d.application_id,
                Deficiency.status.in_(["OPEN", "RESPONDED"]),
                Deficiency.id != d.id
            )
        )
    )
    remaining_open = open_count_res.scalar() or 0
    if remaining_open == 0 and d.application and d.application.status == "DEFICIENCY":
        d.application.status = "SCRUTINY"

    await db.commit()
    return {"message": "Deficiency resolved successfully"}

