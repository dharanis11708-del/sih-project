from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import EVCVisit, EVCMember, EVCReport, Application, User, Notification
from app.schemas.schemas import (
    EVCVisitCreate, EVCVisitResponse, EVCVisitRespondRequest, EVCReportSubmitRequest
)
from app.core.permissions import require_roles, Role, oauth2_scheme
from app.core.security import decode_token

router = APIRouter(prefix="/evc", tags=["Expert Visit Committee"])

@router.get("/visits", response_model=List[EVCVisitResponse])
async def list_evc_visits(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_role = token_data.get("role")
    user_id = token_data.get("sub")

    query = select(EVCVisit).join(EVCVisit.application)
    conditions = []

    if user_role == Role.EVC_MEMBER.value:
        query = query.join(EVCVisit.members).where(EVCMember.user_id == user_id)
    elif status:
        conditions.append(EVCVisit.status == status)

    if conditions:
        query = query.where(and_(*conditions))

    res = await db.execute(query.order_by(EVCVisit.scheduled_date.asc()))
    visits = res.scalars().all()

    out = []
    for v in visits:
        members_data = []
        for m in v.members:
            members_data.append({
                "user_id": m.user_id,
                "name": m.user.name if m.user else "Expert",
                "role": m.role,
                "response": m.response,
                "conflict_of_interest": m.conflict_of_interest_declared
            })

        out.append(EVCVisitResponse(
            id=v.id,
            application_id=v.application_id,
            application_no=v.application.application_no if v.application else "",
            institution_name=v.application.institution.name if v.application and v.application.institution else "",
            scheduled_date=v.scheduled_date,
            start_time=v.start_time,
            end_time=v.end_time,
            status=v.status,
            report_due_at=v.report_due_at,
            report_submitted_at=v.report_submitted_at,
            coordinator_name=v.coordinator.name if v.coordinator else None,
            members=members_data
        ))
    return out

@router.post("/visits", response_model=EVCVisitResponse)
async def schedule_evc_visit(
    payload: EVCVisitCreate,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AICTE_OFFICER]))
):
    app_res = await db.execute(select(Application).where(Application.id == payload.application_id))
    app = app_res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    report_due_at = payload.scheduled_date + timedelta(days=payload.report_due_days)

    visit = EVCVisit(
        application_id=payload.application_id,
        scheduled_date=payload.scheduled_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status="SCHEDULED",
        coordinator_id=payload.coordinator_id,
        report_due_at=report_due_at
    )
    db.add(visit)
    await db.flush()

    # Assign members with conflict detection
    inst_state = app.institution.state if app.institution else ""
    members_data = []

    for idx, member_id in enumerate(payload.member_user_ids):
        user_res = await db.execute(select(User).where(User.id == member_id))
        member_user = user_res.scalars().first()
        if not member_user:
            continue

        role_in_visit = "CHAIRPERSON" if idx == 0 else "MEMBER"
        coi = False # Conflict of interest flag
        if member_user.region_id == app.institution.region_id:
            coi = True # Regional proximity flagged for scrutiny

        m = EVCMember(
            visit_id=visit.id,
            user_id=member_id,
            role=role_in_visit,
            response="PENDING",
            conflict_of_interest_declared=coi
        )
        db.add(m)

        # Notify member
        db.add(Notification(
            user_id=member_id,
            title="EVC Inspection Scheduled",
            body=f"You have been nominated as {role_in_visit} for inspection of {app.institution.name if app.institution else 'Institution'} on {payload.scheduled_date.strftime('%Y-%m-%d')}.",
            severity="INFO",
            entity_type="EVC",
            entity_id=visit.id
        ))

        members_data.append({
            "user_id": member_id,
            "name": member_user.name,
            "role": role_in_visit,
            "response": "PENDING",
            "conflict_of_interest": coi
        })

    # Advance application stage to EVC
    app.status = "EVC"

    await db.commit()
    return EVCVisitResponse(
        id=visit.id,
        application_id=app.id,
        application_no=app.application_no,
        institution_name=app.institution.name if app.institution else "",
        scheduled_date=visit.scheduled_date,
        start_time=visit.start_time,
        end_time=visit.end_time,
        status=visit.status,
        report_due_at=visit.report_due_at,
        coordinator_name=None,
        members=members_data
    )

@router.post("/visits/{visit_id}/respond")
async def respond_to_evc_invitation(
    visit_id: str,
    payload: EVCVisitRespondRequest,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")

    res = await db.execute(
        select(EVCMember).where(and_(EVCMember.visit_id == visit_id, EVCMember.user_id == user_id))
    )
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="EVC assignment not found for current user")

    member.response = payload.response # ACCEPTED or DECLINED
    member.conflict_of_interest_declared = payload.conflict_of_interest
    member.response_notes = payload.notes

    await db.commit()
    return {"message": f"Response recorded as {payload.response}"}

@router.post("/visits/{visit_id}/report")
async def submit_evc_report(
    visit_id: str,
    payload: EVCReportSubmitRequest,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    _ = Depends(require_roles([Role.EVC_MEMBER, Role.SUPER_ADMIN, Role.SENIOR_OFFICER]))
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")

    visit_res = await db.execute(select(EVCVisit).where(EVCVisit.id == visit_id))
    visit = visit_res.scalars().first()
    if not visit:
        raise HTTPException(status_code=404, detail="EVC Visit not found")

    report = EVCReport(
        visit_id=visit.id,
        recommendation=payload.recommendation,
        findings_checklist=payload.findings_checklist,
        remarks=payload.remarks,
        deficiencies_found=payload.deficiencies_found,
        submitted_by_id=user_id,
        submitted_at=datetime.now(timezone.utc)
    )
    db.add(report)

    visit.status = "COMPLETED"
    visit.report_submitted_at = datetime.now(timezone.utc)

    # Move application to EVC_COMPLETED stage
    if visit.application:
        visit.application.status = "EVC_COMPLETED"

    await db.commit()
    return {"message": "EVC Inspection Report submitted successfully", "recommendation": payload.recommendation}

@router.get("/checklists")
async def get_evc_checklist_templates():
    return {
        "categories": [
            {
                "name": "Land & Physical Infrastructure",
                "items": [
                    "Adequacy of instructional area (classrooms, tutorial rooms)",
                    "Administrative area (Principal room, staff rooms, exam control)",
                    "Amenities area (canteen, common rooms, medical facilities)",
                    "Barrier-free built environment for differently-abled persons"
                ]
            },
            {
                "name": "Laboratories & Technical Equipment",
                "items": [
                    "Adequacy of computers and internet bandwidth (min 100 Mbps)",
                    "Licensed system and application software availability",
                    "Safety measures in chemistry / high-voltage labs",
                    "Major equipment as per prescribed curriculum"
                ]
            },
            {
                "name": "Faculty & Academic Delivery",
                "items": [
                    "Cadre ratio (Professor : Assoc Prof : Asst Prof)",
                    "Faculty-student ratio adherence (1:15 or 1:20)",
                    "Biometric / digital attendance records verified",
                    "Proof of salary payment as per 7th Pay Commission"
                ]
            },
            {
                "name": "Library & Information Resources",
                "items": [
                    "Adequacy of titles and volumes per course",
                    "Subscription to national and international online journals",
                    "Digital library workstations functionality"
                ]
            }
        ]
    }

