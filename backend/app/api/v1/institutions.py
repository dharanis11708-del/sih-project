from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io

from app.db.session import get_db
from app.models.entities import (
    Institution, Region, Application, Document, Deficiency, EVCVisit, ComplianceItem
)
from app.schemas.schemas import InstitutionResponse
from app.core.permissions import require_roles, Role, oauth2_scheme
from app.core.security import decode_token

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=List[InstitutionResponse])
async def list_institutions(
    state: Optional[str] = None,
    type: Optional[str] = None,
    region_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_role = token_data.get("role")
    inst_id = token_data.get("institution_id")

    query = select(Institution)
    conditions = []

    # Scoping for College Admin: only own institution
    if user_role == Role.COLLEGE_ADMIN.value and inst_id:
        conditions.append(Institution.id == inst_id)
    else:
        if state:
            conditions.append(Institution.state == state)
        if type:
            conditions.append(Institution.type == type)
        if region_id:
            conditions.append(Institution.region_id == region_id)
        if search:
            conditions.append(
                Institution.name.ilike(f"%{search}%") | Institution.aicte_id.ilike(f"%{search}%")
            )

    if conditions:
        query = query.where(and_(*conditions))

    offset = (page - 1) * limit
    res = await db.execute(query.order_by(Institution.name).offset(offset).limit(limit))
    return res.scalars().all()

@router.get("/{institution_id}", response_model=InstitutionResponse)
async def get_institution(
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    res = await db.execute(select(Institution).where(Institution.id == institution_id))
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return inst

@router.get("/{institution_id}/360")
async def get_institution_360_view(
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    res = await db.execute(select(Institution).where(Institution.id == institution_id))
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Aggregate 360 data
    apps_res = await db.execute(select(Application).where(Application.institution_id == institution_id))
    applications = apps_res.scalars().all()

    docs_res = await db.execute(select(Document).where(Document.institution_id == institution_id))
    documents = docs_res.scalars().all()

    comp_res = await db.execute(select(ComplianceItem).where(ComplianceItem.institution_id == institution_id))
    compliance_items = comp_res.scalars().all()

    return {
        "institution": {
            "id": inst.id,
            "aicte_id": inst.aicte_id,
            "name": inst.name,
            "type": inst.type,
            "state": inst.state,
            "district": inst.district,
            "compliance_score": inst.compliance_score,
            "status": inst.status,
            "established_year": inst.established_year,
            "university_affiliation": inst.university_affiliation,
        },
        "summary": {
            "total_applications": len(applications),
            "approved_applications": len([a for a in applications if a.status == "APPROVED"]),
            "pending_applications": len([a for a in applications if a.status not in ["APPROVED", "REJECTED", "DRAFT"]]),
            "total_documents": len(documents),
            "verified_documents": len([d for d in documents if d.status == "VERIFIED"]),
            "expiring_documents": len([d for d in documents if d.status == "EXPIRED" or (d.expiry_date and (d.expiry_date - func.now()).days <= 90)]),
            "compliance_items_count": len(compliance_items),
            "compliant_items_count": len([c for c in compliance_items if c.status == "COMPLIANT"]),
        },
        "applications": [
            {
                "id": a.id,
                "application_no": a.application_no,
                "status": a.status,
                "priority": a.priority,
                "risk_label": a.risk_label,
                "is_overdue": a.is_overdue,
                "submitted_at": a.submitted_at
            } for a in applications
        ],
        "compliance_breakdown": [
            {
                "rule_title": c.rule.title if c.rule else "Compliance Rule",
                "status": c.status,
                "severity": c.rule.severity if c.rule else "MEDIUM",
                "last_evaluated_at": c.last_evaluated_at
            } for c in compliance_items
        ]
    }

@router.post("/import")
async def import_institutions_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN]))
):
    contents = await file.read()
    decoded = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    errors = []

    # Get a default region
    region_res = await db.execute(select(Region))
    default_region = region_res.scalars().first()
    default_region_id = default_region.id if default_region else None

    for i, row in enumerate(reader, start=1):
        aicte_id = row.get("aicte_id", "").strip()
        name = row.get("name", "").strip()
        if not aicte_id or not name:
            errors.append(f"Row {i}: Missing required aicte_id or name")
            continue

        existing = await db.execute(select(Institution).where(Institution.aicte_id == aicte_id))
        if existing.scalars().first():
            continue # Skip duplicate

        inst = Institution(
            aicte_id=aicte_id,
            name=name,
            type=row.get("type", "ENGINEERING").strip().upper(),
            address=row.get("address", "Campus Address").strip(),
            state=row.get("state", "New Delhi").strip(),
            district=row.get("district", "Central").strip(),
            pin_code=row.get("pin_code", "110001").strip(),
            region_id=row.get("region_id") or default_region_id,
            university_affiliation=row.get("university_affiliation"),
            contact_email=row.get("contact_email", f"contact_{aicte_id}@approvaltrack.test").strip(),
            established_year=int(row.get("established_year", 2012)),
            compliance_score=100.0
        )
        db.add(inst)
        imported += 1

    await db.commit()
    return {"message": f"Successfully imported {imported} institutions", "errors": errors}

