from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import (
    Application, ApplicationType, AcademicYear, WorkflowStage, WorkflowDefinition,
    Institution, User, ApplicationStageHistory, Document, Deficiency, Remark, AuditLog
)
from app.schemas.schemas import (
    ApplicationCreate, ApplicationResponse, ApplicationTransitionRequest,
    ApplicationReassignRequest, ApplicationEscalateRequest, RemarkCreate
)
from app.engine.workflow_engine import WorkflowEngine
from app.ml.delay_predictor import DelayRiskPredictor
from app.core.permissions import require_roles, Role, oauth2_scheme
from app.core.security import decode_token, compute_audit_hash

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    status: Optional[str] = None,
    stage_code: Optional[str] = None,
    officer_id: Optional[str] = None,
    region_id: Optional[str] = None,
    risk_label: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_role = token_data.get("role")
    inst_id = token_data.get("institution_id")
    user_id = token_data.get("sub")

    query = select(Application).join(Application.institution)
    conditions = []

    # RBAC Scoping
    if user_role == Role.COLLEGE_ADMIN.value and inst_id:
        conditions.append(Application.institution_id == inst_id)
    elif user_role == Role.AICTE_OFFICER.value:
        # Officer sees assigned applications or region portfolio
        if officer_id == "me":
            conditions.append(Application.assigned_officer_id == user_id)
        elif officer_id:
            conditions.append(Application.assigned_officer_id == officer_id)
    else:
        if officer_id:
            conditions.append(Application.assigned_officer_id == officer_id)

    if status:
        conditions.append(Application.status == status)
    if risk_label:
        conditions.append(Application.risk_label == risk_label)
    if is_overdue is not None:
        conditions.append(Application.is_overdue == is_overdue)
    if region_id:
        conditions.append(Institution.region_id == region_id)
    if search:
        conditions.append(
            Application.application_no.ilike(f"%{search}%") | Institution.name.ilike(f"%{search}%")
        )

    if conditions:
        query = query.where(and_(*conditions))

    offset = (page - 1) * limit
    res = await db.execute(query.order_by(Application.created_at.desc()).offset(offset).limit(limit))
    apps = res.scalars().all()

    # Hydrate names for frontend convenience
    out = []
    for app in apps:
        resp = ApplicationResponse.from_orm(app)
        resp.institution_name = app.institution.name if app.institution else ""
        resp.type_name = app.application_type.name if app.application_type else ""
        resp.stage_name = app.current_stage.name if app.current_stage else ""
        resp.assigned_officer_name = app.assigned_officer.name if app.assigned_officer else "Unassigned"
        out.append(resp)
    return out

@router.post("", response_model=ApplicationResponse)
async def create_application(
    payload: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_role = token_data.get("role")
    inst_id = payload.institution_id or token_data.get("institution_id")

    if not inst_id:
        raise HTTPException(status_code=400, detail="Institution ID is required")

    # Fetch Application Type
    type_res = await db.execute(select(ApplicationType).where(ApplicationType.code == payload.type_code))
    app_type = type_res.scalars().first()
    if not app_type:
        raise HTTPException(status_code=400, detail=f"Invalid application type: {payload.type_code}")

    # Fetch Academic Year
    year_res = await db.execute(select(AcademicYear).where(AcademicYear.year == payload.academic_year))
    ay = year_res.scalars().first()
    if not ay:
        ay = AcademicYear(year=payload.academic_year)
        db.add(ay)
        await db.flush()

    # Generate sequential application number: APP-2026-XXXXXX
    count_res = await db.execute(select(func.count(Application.id)))
    count = (count_res.scalar() or 0) + 1
    app_no = f"APP-2026-{count:06d}"

    app = Application(
        application_no=app_no,
        institution_id=inst_id,
        type_id=app_type.id,
        academic_year_id=ay.id,
        status="DRAFT",
        priority="NORMAL",
        details=payload.details or {},
        risk_score=0.1,
        risk_label="LOW",
        risk_factors=["Draft application"],
        is_overdue=False
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)

    resp = ApplicationResponse.from_orm(app)
    resp.institution_name = app.institution.name if app.institution else ""
    resp.type_name = app_type.name
    return resp

@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    res = await db.execute(select(Application).where(Application.id == application_id))
    app = res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    resp = ApplicationResponse.from_orm(app)
    resp.institution_name = app.institution.name if app.institution else ""
    resp.type_name = app.application_type.name if app.application_type else ""
    resp.stage_name = app.current_stage.name if app.current_stage else ""
    resp.assigned_officer_name = app.assigned_officer.name if app.assigned_officer else "Unassigned"
    return resp

@router.post("/{application_id}/submit")
async def submit_application(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    res = await db.execute(select(Application).where(Application.id == application_id))
    app = res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only DRAFT applications can be submitted")

    # Get initial workflow stage
    stage_res = await db.execute(
        select(WorkflowStage).where(WorkflowStage.stage_order == 1)
    )
    first_stage = stage_res.scalars().first()
    if not first_stage:
        raise HTTPException(status_code=500, detail="Workflow stages not configured")

    # Auto-assign officer via WorkflowEngine
    assigned_officer = await WorkflowEngine.auto_assign_officer(db, app)

    now = datetime.now(timezone.utc)
    app.submitted_at = now
    app.assigned_officer_id = assigned_officer.id if assigned_officer else None

    # Advance to initial stage
    await WorkflowEngine.advance_stage(
        db=db,
        application=app,
        target_stage=first_stage,
        outcome="SUBMITTED",
        remarks="Application submitted formally by institution"
    )

    # Initial ML delay risk prediction
    risk_score, risk_label, risk_factors = DelayRiskPredictor.predict_risk({
        "days_in_stage": 0.0,
        "sla_days_allowed": first_stage.sla_days,
        "open_deficiencies_count": 0,
        "total_documents_uploaded": 1,
        "verified_documents_count": 0,
        "officer_active_applications_count": 3,
        "evc_scheduled": False,
        "stage_order": 1
    })
    app.risk_score = risk_score
    app.risk_label = risk_label
    app.risk_factors = risk_factors

    # Audit log
    now_str = now.isoformat()
    audit_hash = compute_audit_hash(
        prev_hash="GENESIS",
        actor_id=token.split(".")[0],
        action="APPLICATION_SUBMIT",
        entity_type="APPLICATION",
        entity_id=app.id,
        before={"status": "DRAFT"},
        after={"status": app.status, "assigned_officer": assigned_officer.name if assigned_officer else None},
        timestamp_str=now_str
    )
    db.add(AuditLog(
        actor_role="COLLEGE_ADMIN",
        action="APPLICATION_SUBMIT",
        entity_type="APPLICATION",
        entity_id=app.id,
        before_state={"status": "DRAFT"},
        after_state={"status": app.status, "assigned_officer": assigned_officer.name if assigned_officer else None},
        hash=audit_hash
    ))

    await db.commit()
    return {"message": "Application submitted successfully", "application_no": app.application_no, "status": app.status}

@router.post("/{application_id}/transition")
async def transition_stage(
    application_id: str,
    payload: ApplicationTransitionRequest,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AICTE_OFFICER]))
):
    token_data = decode_token(token)
    actor_id = token_data.get("sub")

    res = await db.execute(select(Application).where(Application.id == application_id))
    app = res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    target_stage_res = await db.execute(
        select(WorkflowStage).where(WorkflowStage.code == payload.target_stage_code)
    )
    target_stage = target_stage_res.scalars().first()
    if not target_stage:
        raise HTTPException(status_code=400, detail=f"Target stage '{payload.target_stage_code}' not found")

    user_res = await db.execute(select(User).where(User.id == actor_id))
    actor = user_res.scalars().first()

    old_status = app.status
    await WorkflowEngine.advance_stage(
        db=db,
        application=app,
        target_stage=target_stage,
        actor=actor,
        outcome=payload.outcome or "ADVANCED",
        remarks=payload.remarks
    )

    # Re-evaluate ML delay risk
    risk_score, risk_label, risk_factors = DelayRiskPredictor.predict_risk({
        "days_in_stage": 1.0,
        "sla_days_allowed": target_stage.sla_days,
        "open_deficiencies_count": len([d for d in app.deficiencies if d.status == "OPEN"]),
        "total_documents_uploaded": len(app.documents),
        "verified_documents_count": len([d for d in app.documents if d.status == "VERIFIED"]),
        "officer_active_applications_count": 4,
        "evc_scheduled": target_stage.code in ["EVC", "EVC_COMPLETED"],
        "stage_order": target_stage.stage_order
    })
    app.risk_score = risk_score
    app.risk_label = risk_label
    app.risk_factors = risk_factors

    await db.commit()
    return {"message": f"Application transitioned to {target_stage.name}", "status": app.status}

@router.post("/{application_id}/reassign")
async def reassign_officer(
    application_id: str,
    payload: ApplicationReassignRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER]))
):
    app_res = await db.execute(select(Application).where(Application.id == application_id))
    app = app_res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    officer_res = await db.execute(select(User).where(User.id == payload.officer_id))
    officer = officer_res.scalars().first()
    if not officer:
        raise HTTPException(status_code=404, detail="Target officer not found")

    old_officer_id = app.assigned_officer_id
    app.assigned_officer_id = officer.id

    # Record internal remark
    remark = Remark(
        application_id=app.id,
        author_id=officer.id,
        text=f"Reassigned to officer {officer.name}. Reason: {payload.remarks or 'Administrative load balancing'}",
        is_internal=True
    )
    db.add(remark)
    await db.commit()
    return {"message": f"Application reassigned to {officer.name}", "officer_name": officer.name}

@router.get("/{application_id}/timeline")
async def get_application_timeline(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    res = await db.execute(
        select(ApplicationStageHistory).where(ApplicationStageHistory.application_id == application_id).order_by(ApplicationStageHistory.entered_at)
    )
    history = res.scalars().all()

    return [
        {
            "stage_id": h.stage_id,
            "stage_name": h.stage.name if h.stage else "Initial Stage",
            "stage_code": h.stage.code if h.stage else "",
            "entered_at": h.entered_at,
            "exited_at": h.exited_at,
            "sla_due_at": h.sla_due_at,
            "is_breached": h.is_breached,
            "outcome": h.outcome,
            "actor_name": h.actor.name if h.actor else "System Workflow",
            "remarks": h.remarks
        } for h in history
    ]

@router.get("/{application_id}/checklist")
async def get_application_checklist(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    app_res = await db.execute(select(Application).where(Application.id == application_id))
    app = app_res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    docs_res = await db.execute(select(Document).where(Document.application_id == application_id))
    documents = docs_res.scalars().all()

    items = []
    for d in documents:
        items.append({
            "document_id": d.id,
            "type_code": d.document_type.code if d.document_type else "",
            "type_name": d.document_type.name if d.document_type else d.original_name,
            "status": d.status,
            "issue_date": d.issue_date,
            "expiry_date": d.expiry_date,
            "is_verified": d.status == "VERIFIED"
        })
    return items

@router.get("/{application_id}/remarks")
async def get_application_remarks(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_role = token_data.get("role")

    query = select(Remark).where(Remark.application_id == application_id)
    # College Admin cannot see internal remarks
    if user_role == Role.COLLEGE_ADMIN.value:
        query = query.where(Remark.is_internal == False)

    res = await db.execute(query.order_by(Remark.created_at))
    remarks = res.scalars().all()

    return [
        {
            "id": r.id,
            "author_name": r.author.name if r.author else "Official",
            "author_role": r.author.role if r.author else "",
            "text": r.text,
            "is_internal": r.is_internal,
            "created_at": r.created_at
        } for r in remarks
    ]

@router.post("/{application_id}/remarks")
async def add_application_remark(
    application_id: str,
    payload: RemarkCreate,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")
    user_role = token_data.get("role")

    # College users cannot post internal remarks
    is_internal = payload.is_internal if user_role != Role.COLLEGE_ADMIN.value else False

    remark = Remark(
        application_id=application_id,
        author_id=user_id,
        text=payload.text,
        is_internal=is_internal
    )
    db.add(remark)
    await db.commit()
    return {"message": "Remark added successfully"}

