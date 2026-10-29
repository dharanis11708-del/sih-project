from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import Notification, Escalation, User
from app.core.permissions import require_roles, Role, oauth2_scheme
from app.core.security import decode_token

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])

@router.get("/notifications")
async def list_notifications(
    status_filter: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")

    query = select(Notification).where(Notification.user_id == user_id)
    if status_filter:
        query = query.where(Notification.status == status_filter)

    res = await db.execute(query.order_by(Notification.created_at.desc()).limit(limit))
    notifications = res.scalars().all()

    unread_res = await db.execute(
        select(Notification).where(
            and_(Notification.user_id == user_id, Notification.status == "UNREAD")
        )
    )
    unread_count = len(unread_res.scalars().all())

    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "body": n.body,
                "severity": n.severity,
                "entity_type": n.entity_type,
                "entity_id": n.entity_id,
                "status": n.status,
                "created_at": n.created_at,
                "read_at": n.read_at
            } for n in notifications
        ]
    }

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")

    res = await db.execute(
        select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == user_id)
        )
    )
    n = res.scalars().first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")

    n.status = "READ"
    n.read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Notification marked as read"}

@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")

    await db.execute(
        update(Notification)
        .where(and_(Notification.user_id == user_id, Notification.status == "UNREAD"))
        .values(status="READ", read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"message": "All notifications marked as read"}

@router.get("/escalations")
async def list_escalations(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AUDITOR]))
):
    res = await db.execute(select(Escalation).order_by(Escalation.triggered_at.desc()))
    escalations = res.scalars().all()
    return escalations

