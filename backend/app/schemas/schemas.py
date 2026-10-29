from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field

# --- Auth & User ---
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    phone: Optional[str] = None
    region_id: Optional[str] = None
    institution_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    region_id: Optional[str] = None
    institution_id: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class InstitutionRegisterRequest(BaseModel):
    aicte_id: str
    name: str
    type: str # ENGINEERING, POLYTECHNIC, etc.
    address: str
    state: str
    district: str
    pin_code: Optional[str] = None
    region_id: str
    university_affiliation: Optional[str] = None
    trust_society_name: Optional[str] = None
    contact_email: str
    contact_phone: Optional[str] = None
    established_year: Optional[int] = None
    admin_name: str
    admin_password: str

# --- Institution ---
class InstitutionResponse(BaseModel):
    id: str
    aicte_id: str
    name: str
    type: str
    address: str
    state: str
    district: str
    pin_code: Optional[str] = None
    region_id: str
    university_affiliation: Optional[str] = None
    trust_society_name: Optional[str] = None
    contact_email: str
    contact_phone: Optional[str] = None
    established_year: Optional[int] = None
    status: str
    compliance_score: float
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Application ---
class ApplicationCreate(BaseModel):
    institution_id: Optional[str] = None # Inferred from current user if College Admin
    type_code: str # EOA, NEW_INSTITUTION, etc.
    academic_year: Optional[str] = "2026-2027"
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ApplicationTransitionRequest(BaseModel):
    target_stage_code: str
    outcome: Optional[str] = "ADVANCED"
    remarks: Optional[str] = None

class ApplicationReassignRequest(BaseModel):
    officer_id: str
    remarks: Optional[str] = None

class ApplicationEscalateRequest(BaseModel):
    reason: str
    level: Optional[int] = 1

class ApplicationResponse(BaseModel):
    id: str
    application_no: str
    institution_id: str
    type_id: str
    academic_year_id: str
    current_stage_id: Optional[str] = None
    status: str
    priority: str
    assigned_officer_id: Optional[str] = None
    details: Dict[str, Any]
    submitted_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    risk_score: float
    risk_label: str
    risk_factors: List[str]
    is_overdue: bool
    created_at: datetime
    updated_at: datetime
    institution_name: Optional[str] = None
    type_name: Optional[str] = None
    stage_name: Optional[str] = None
    assigned_officer_name: Optional[str] = None

    model_config = {"from_attributes": True}

# --- Deficiency ---
class DeficiencyCreate(BaseModel):
    category: str
    description: str
    due_days: Optional[int] = 5

class DeficiencyRespondRequest(BaseModel):
    response_text: str

class DeficiencyResponse(BaseModel):
    id: str
    application_id: str
    raised_by_id: str
    category: str
    description: str
    status: str
    due_at: datetime
    response_text: Optional[str] = None
    responded_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    raised_by_name: Optional[str] = None

    model_config = {"from_attributes": True}

# --- Document ---
class DocumentResponse(BaseModel):
    id: str
    application_id: Optional[str] = None
    institution_id: str
    type_id: str
    original_name: str
    mime_type: str
    file_size: int
    sha256: str
    status: str
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    ocr_confidence: float
    extracted_fields: Dict[str, Any]
    verified_at: Optional[datetime] = None
    verification_remarks: Optional[str] = None
    document_type_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class DocumentVerifyRequest(BaseModel):
    status: str # VERIFIED or REJECTED
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    remarks: Optional[str] = None

# --- Compliance ---
class ComplianceRuleCreate(BaseModel):
    code: str
    title: str
    description: Optional[str] = None
    severity: str = "HIGH"
    periodicity: str = "ANNUAL"
    condition_json: Dict[str, Any]

class ComplianceItemResponse(BaseModel):
    id: str
    institution_id: str
    rule_id: str
    application_id: Optional[str] = None
    status: str
    due_date: Optional[datetime] = None
    last_evaluated_at: datetime
    evaluation_result: Dict[str, Any]
    rule_title: Optional[str] = None
    rule_code: Optional[str] = None
    severity: Optional[str] = None

    model_config = {"from_attributes": True}

# --- EVC ---
class EVCVisitCreate(BaseModel):
    application_id: str
    scheduled_date: datetime
    start_time: str = "09:30"
    end_time: str = "17:00"
    member_user_ids: List[str]
    coordinator_id: Optional[str] = None
    report_due_days: int = 3

class EVCVisitRespondRequest(BaseModel):
    response: str # ACCEPTED, DECLINED
    conflict_of_interest: bool = False
    notes: Optional[str] = None

class EVCReportSubmitRequest(BaseModel):
    recommendation: str # APPROVE, APPROVE_WITH_CONDITIONS, REJECT
    findings_checklist: Dict[str, Any]
    remarks: Optional[str] = None
    deficiencies_found: List[str] = Field(default_factory=list)

class EVCVisitResponse(BaseModel):
    id: str
    application_id: str
    application_no: Optional[str] = None
    institution_name: Optional[str] = None
    scheduled_date: datetime
    start_time: str
    end_time: str
    status: str
    report_due_at: datetime
    report_submitted_at: Optional[datetime] = None
    coordinator_name: Optional[str] = None
    members: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = {"from_attributes": True}

# --- Remarks ---
class RemarkCreate(BaseModel):
    text: str
    is_internal: bool = False

# --- Audit Log ---
class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    before_state: Dict[str, Any]
    after_state: Dict[str, Any]
    ip_address: Optional[str] = None
    hash: str
    prev_hash: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Dashboard ---
class DashboardSummaryResponse(BaseModel):
    total_applications: int
    pending_applications: int
    overdue_applications: int
    approved_applications: int
    rejected_applications: int
    sla_compliance_rate: float
    avg_processing_days: float
    high_risk_count: int
