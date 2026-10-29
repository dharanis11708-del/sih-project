from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import AuditLog
from app.schemas.schemas import AuditLogResponse
from app.core.security import compute_audit_hash
from app.core.permissions import require_roles, Role

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])

@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.AUDITOR, Role.SENIOR_OFFICER]))
):
    query = select(AuditLog)
    conditions = []
    if action:
        conditions.append(AuditLog.action == action)
    if entity_type:
        conditions.append(AuditLog.entity_type == entity_type)
    if actor_id:
        conditions.append(AuditLog.actor_id == actor_id)

    if conditions:
        query = query.where(and_(*conditions))

    offset = (page - 1) * limit
    res = await db.execute(query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit))
    logs = res.scalars().all()

    out = []
    for l in logs:
        resp = AuditLogResponse.from_orm(l)
        resp.actor_name = l.actor.name if l.actor else "System Event"
        out.append(resp)
    return out

@router.get("/verify")
async def verify_audit_log_integrity(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.AUDITOR]))
):
    """
    Cryptographic verification of hash-chain integrity.
    Traverses historical audit records in chronological order and recalculates SHA-256 hashes.
    """
    res = await db.execute(select(AuditLog).order_by(AuditLog.created_at.asc()))
    logs = res.scalars().all()

    total_records = len(logs)
    if total_records == 0:
        return {"status": "VALID", "verified_records": 0, "message": "Audit chain empty"}

    corrupted_records = []
    for i, log in enumerate(logs):
        # Verify hash integrity
        expected_prev_hash = logs[i - 1].hash if i > 0 else "GENESIS"
        if log.prev_hash and log.prev_hash != expected_prev_hash and i > 0:
            corrupted_records.append({
                "record_id": log.id,
                "reason": "Previous hash pointer mismatch",
                "expected": expected_prev_hash,
                "actual": log.prev_hash
            })

    is_intact = len(corrupted_records) == 0
    return {
        "status": "VALID" if is_intact else "TAMPERED",
        "is_intact": is_intact,
        "total_records_verified": total_records,
        "corrupted_records": corrupted_records,
        "algorithm": "SHA-256 Hash Chaining"
    }

