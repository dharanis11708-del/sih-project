from enum import Enum
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class Role(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    AICTE_OFFICER = "AICTE_OFFICER"
    SENIOR_OFFICER = "SENIOR_OFFICER"
    EVC_MEMBER = "EVC_MEMBER"
    COLLEGE_ADMIN = "COLLEGE_ADMIN"
    AUDITOR = "AUDITOR"

class CurrentUser:
    def __init__(self, id: str, email: str, name: str, role: Role, region_id: Optional[str] = None, institution_id: Optional[str] = None):
        self.id = id
        self.email = email
        self.name = name
        self.role = role
        self.region_id = region_id
        self.institution_id = institution_id

def require_roles(allowed_roles: List[Role]):
    def role_checker(token: str = Depends(oauth2_scheme)):
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": {"code": "INVALID_TOKEN", "message": "Could not validate credentials"}}
            )
        user_role = payload.get("role")
        if user_role not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Insufficient permissions for this operation"}}
            )
        return payload
    return role_checker

