from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import User, Region
from app.schemas.schemas import UserCreate, UserResponse
from app.core.security import get_password_hash
from app.core.permissions import require_roles, Role

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    region_id: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AICTE_OFFICER, Role.AUDITOR]))
):
    query = select(User)
    conditions = []
    if role:
        conditions.append(User.role == role)
    if region_id:
        conditions.append(User.region_id == region_id)
    if search:
        conditions.append(User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))

    if conditions:
        query = query.where(and_(*conditions))

    res = await db.execute(query.order_by(User.name))
    return res.scalars().all()

@router.post("", response_model=UserResponse)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN]))
):
    existing = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "EMAIL_EXISTS", "message": "Email already exists"}}
        )

    user = User(
        name=payload.name,
        email=payload.email.lower().strip(),
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        phone=payload.phone,
        region_id=payload.region_id,
        institution_id=payload.institution_id,
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN]))
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = is_active
    await db.commit()
    return {"message": f"User status updated to {'active' if is_active else 'inactive'}", "user_id": user_id}

