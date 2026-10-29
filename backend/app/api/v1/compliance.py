from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import ComplianceRule, ComplianceItem, Institution
from app.schemas.schemas import ComplianceRuleCreate, ComplianceItemResponse
from app.tasks.scheduled_jobs import run_compliance_evaluation
from app.core.permissions import require_roles, Role, oauth2_scheme
from app.core.security import decode_token

router = APIRouter(prefix="/compliance", tags=["Compliance"])

@router.get("/rules")
async def list_rules(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ComplianceRule).order_by(ComplianceRule.code))
    return res.scalars().all()

@router.post("/rules")
async def create_rule(
    payload: ComplianceRuleCreate,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN]))
):
    rule = ComplianceRule(
        code=payload.code,
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        periodicity=payload.periodicity,
        condition_json=payload.condition_json,
        is_active=True
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

@router.get("/items", response_model=List[ComplianceItemResponse])
async def list_compliance_items(
    institution_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_role = token_data.get("role")
    user_inst_id = token_data.get("institution_id")

    inst_id = user_inst_id if user_role == Role.COLLEGE_ADMIN.value else (institution_id or user_inst_id)

    query = select(ComplianceItem).join(ComplianceItem.rule)
    conditions = []
    if inst_id:
        conditions.append(ComplianceItem.institution_id == inst_id)
    if status:
        conditions.append(ComplianceItem.status == status)

    if conditions:
        query = query.where(and_(*conditions))

    res = await db.execute(query.order_by(ComplianceItem.due_date.asc().nulls_last()))
    items = res.scalars().all()

    out = []
    for item in items:
        resp = ComplianceItemResponse.from_orm(item)
        resp.rule_title = item.rule.title if item.rule else ""
        resp.rule_code = item.rule.code if item.rule else ""
        resp.severity = item.rule.severity if item.rule else "MEDIUM"
        out.append(resp)
    return out

@router.post("/evaluate")
async def trigger_compliance_evaluation(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER]))
):
    stats = await run_compliance_evaluation(db)
    return {"message": "Compliance re-evaluation completed successfully", "stats": stats}

@router.get("/score/{institution_id}")
async def get_institution_compliance_score(
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    inst_res = await db.execute(select(Institution).where(Institution.id == institution_id))
    inst = inst_res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    items_res = await db.execute(
        select(ComplianceItem).where(ComplianceItem.institution_id == institution_id)
    )
    items = items_res.scalars().all()

    total = len(items)
    compliant = len([i for i in items if i.status == "COMPLIANT"])
    non_compliant = len([i for i in items if i.status == "NON_COMPLIANT"])
    overdue = len([i for i in items if i.status == "OVERDUE"])

    return {
        "institution_id": inst.id,
        "institution_name": inst.name,
        "compliance_score": inst.compliance_score,
        "total_rules": total,
        "compliant_count": compliant,
        "non_compliant_count": non_compliant,
        "overdue_count": overdue,
        "grade": "A" if inst.compliance_score >= 90 else ("B" if inst.compliance_score >= 75 else ("C" if inst.compliance_score >= 60 else "D"))
    }

@router.get("/high-risk")
async def get_high_risk_institutions(
    threshold: float = 75.0,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AICTE_OFFICER, Role.AUDITOR]))
):
    res = await db.execute(
        select(Institution).where(Institution.compliance_score < threshold).order_by(Institution.compliance_score.asc())
    )
    institutions = res.scalars().all()

    return [
        {
            "id": inst.id,
            "aicte_id": inst.aicte_id,
            "name": inst.name,
            "state": inst.state,
            "compliance_score": inst.compliance_score,
            "status": inst.status
        } for inst in institutions
    ]

