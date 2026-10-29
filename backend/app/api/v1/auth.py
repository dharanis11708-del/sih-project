from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import User, Institution, AuditLog
from app.schemas.schemas import (
    LoginRequest, TokenResponse, RefreshTokenRequest,
    InstitutionRegisterRequest, UserResponse
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token, compute_audit_hash
)
from app.core.permissions import oauth2_scheme, Role

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    user = res.scalars().first()

    if not user or not verify_password(payload.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password"}}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "ACCOUNT_INACTIVE", "message": "User account has been deactivated"}}
        )

    user.last_login_at = datetime.now(timezone.utc)
    user.failed_login_attempts = 0
    await db.commit()

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    # Tamper-evident Audit Log
    now_str = datetime.now(timezone.utc).isoformat()
    audit_hash = compute_audit_hash(
        prev_hash="GENESIS",
        actor_id=user.id,
        action="USER_LOGIN",
        entity_type="USER",
        entity_id=user.id,
        before={},
        after={"email": user.email, "role": user.role},
        timestamp_str=now_str
    )
    audit = AuditLog(
        actor_id=user.id,
        actor_role=user.role,
        action="USER_LOGIN",
        entity_type="USER",
        entity_id=user.id,
        after_state={"email": user.email, "role": user.role},
        hash=audit_hash
    )
    db.add(audit)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "region_id": user.region_id,
            "institution_id": user.institution_id,
        }
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_REFRESH_TOKEN", "message": "Invalid or expired refresh token"}}
        )

    user_id = token_data.get("sub")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found or inactive"}}
        )

    access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "region_id": user.region_id,
            "institution_id": user.institution_id,
        }
    }

@router.get("/me")
async def get_current_user_profile(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    token_data = decode_token(token)
    if not token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = token_data.get("sub")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "region_id": user.region_id,
        "institution_id": user.institution_id,
        "institution_name": user.institution.name if user.institution else None,
        "region_name": user.region.name if user.region else None,
        "is_active": user.is_active
    }

@router.post("/register-institution")
async def register_institution(payload: InstitutionRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if aicte_id or email already exists
    existing_inst = await db.execute(select(Institution).where(Institution.aicte_id == payload.aicte_id))
    if existing_inst.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "AICTE_ID_EXISTS", "message": "An institution with this AICTE Permanent ID is already registered"}}
        )

    existing_user = await db.execute(select(User).where(User.email == payload.contact_email.lower().strip()))
    if existing_user.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "EMAIL_EXISTS", "message": "This email address is already registered"}}
        )

    # Create Institution
    inst = Institution(
        aicte_id=payload.aicte_id,
        name=payload.name,
        type=payload.type,
        address=payload.address,
        state=payload.state,
        district=payload.district,
        pin_code=payload.pin_code,
        region_id=payload.region_id,
        university_affiliation=payload.university_affiliation,
        trust_society_name=payload.trust_society_name,
        contact_email=payload.contact_email.lower().strip(),
        contact_phone=payload.contact_phone,
        established_year=payload.established_year,
        status="ACTIVE",
        compliance_score=100.0
    )
    db.add(inst)
    await db.flush()

    # Create Admin User
    admin_user = User(
        name=payload.admin_name,
        email=payload.contact_email.lower().strip(),
        password_hash=get_password_hash(payload.admin_password),
        role=Role.COLLEGE_ADMIN.value,
        institution_id=inst.id,
        region_id=payload.region_id,
        is_active=True
    )
    db.add(admin_user)
    await db.commit()

    return {
        "message": "Institution registered successfully",
        "institution_id": inst.id,
        "aicte_id": inst.aicte_id,
        "email": admin_user.email
    }

