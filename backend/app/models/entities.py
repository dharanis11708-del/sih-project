import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.core.permissions import Role

def utc_now():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class Region(Base):
    __tablename__ = "regions"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False) # e.g. "Southern Regional Office", "Northern Regional Office"
    code = Column(String(20), unique=True, nullable=False) # e.g. "SRO", "NRO"
    headquarters = Column(String(100), nullable=False) # Chennai, Kanpur, etc.
    states_covered = Column(JSON, default=list) # ["Tamil Nadu", "Kerala", "Puducherry"]
    created_at = Column(DateTime, default=utc_now)

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=Role.AICTE_OFFICER.value)
    phone = Column(String(20), nullable=True)
    region_id = Column(String(36), ForeignKey("regions.id"), nullable=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    region = relationship("Region", lazy="selectin")
    institution = relationship("Institution", foreign_keys=[institution_id], back_populates="users", lazy="selectin")

class Institution(Base):
    __tablename__ = "institutions"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    aicte_id = Column(String(50), unique=True, index=True, nullable=False) # Permanent ID like "1-10948211"
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False) # ENGINEERING, POLYTECHNIC, MANAGEMENT, PHARMACY, ARCHITECTURE
    address = Column(Text, nullable=False)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False)
    pin_code = Column(String(10), nullable=True)
    region_id = Column(String(36), ForeignKey("regions.id"), nullable=False)
    university_affiliation = Column(String(200), nullable=True)
    trust_society_name = Column(String(200), nullable=True)
    contact_email = Column(String(150), nullable=False)
    contact_phone = Column(String(20), nullable=True)
    established_year = Column(Integer, nullable=True)
    status = Column(String(50), default="ACTIVE") # ACTIVE, PROBATION, WITHDRAWN
    compliance_score = Column(Float, default=100.0) # 0 to 100
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    region = relationship("Region")
    users = relationship("User", foreign_keys=[User.institution_id], back_populates="institution")
    applications = relationship("Application", back_populates="institution")
    documents = relationship("Document", back_populates="institution")
    compliance_items = relationship("ComplianceItem", back_populates="institution")

class AcademicYear(Base):
    __tablename__ = "academic_years"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    year = Column(String(20), unique=True, nullable=False) # "2026-2027"
    is_active = Column(Boolean, default=True)

class ApplicationType(Base):
    __tablename__ = "application_types"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False) # EOA, NEW_INSTITUTION, INCREASE_INTAKE, NEW_COURSE, CLOSURE
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    sla_total_days = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)

class WorkflowDefinition(Base):
    __tablename__ = "workflow_definitions"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_type_id = Column(String(36), ForeignKey("application_types.id"), nullable=False)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    stages = relationship("WorkflowStage", back_populates="workflow", order_by="WorkflowStage.stage_order")

class WorkflowStage(Base):
    __tablename__ = "workflow_stages"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    workflow_id = Column(String(36), ForeignKey("workflow_definitions.id"), nullable=False)
    name = Column(String(100), nullable=False) # "Document Scrutiny", "Deficiency / Clarification", "EVC Inspection"
    code = Column(String(50), nullable=False) # SCRUTINY, DEFICIENCY, EVC, SENIOR_REVIEW, DECISION, LETTER_ISSUED
    stage_order = Column(Integer, nullable=False)
    sla_days = Column(Integer, default=5)
    responsible_role = Column(String(50), default=Role.AICTE_OFFICER.value)
    auto_advance_conditions = Column(JSON, default=dict) # conditions for rule engine
    required_documents = Column(JSON, default=list) # codes of mandatory document types
    is_terminal = Column(Boolean, default=False)

    workflow = relationship("WorkflowDefinition", back_populates="stages")

class Application(Base):
    __tablename__ = "applications"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_no = Column(String(50), unique=True, index=True, nullable=False) # APP-2026-000101
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    type_id = Column(String(36), ForeignKey("application_types.id"), nullable=False)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    current_stage_id = Column(String(36), ForeignKey("workflow_stages.id"), nullable=True)
    status = Column(String(50), default="DRAFT", index=True) # DRAFT, SUBMITTED, UNDER_SCRUTINY, DEFICIENCY, EVC, SENIOR_REVIEW, APPROVED, REJECTED
    priority = Column(String(20), default="NORMAL") # NORMAL, HIGH, URGENT
    assigned_officer_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    details = Column(JSON, default=dict) # Courses, seats, infrastructure metrics
    submitted_at = Column(DateTime, nullable=True)
    due_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    risk_score = Column(Float, default=0.1) # 0.0 to 1.0
    risk_label = Column(String(20), default="LOW") # LOW, MEDIUM, HIGH
    risk_factors = Column(JSON, default=list) # ["High scrutiny delay", "3 active deficiencies"]
    is_overdue = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    institution = relationship("Institution", back_populates="applications", lazy="selectin")
    application_type = relationship("ApplicationType", lazy="selectin")
    academic_year = relationship("AcademicYear", lazy="selectin")
    current_stage = relationship("WorkflowStage", lazy="selectin")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id], lazy="selectin")
    history = relationship("ApplicationStageHistory", back_populates="application", order_by="ApplicationStageHistory.entered_at", lazy="selectin")
    deficiencies = relationship("Deficiency", back_populates="application", lazy="selectin")
    remarks = relationship("Remark", back_populates="application", lazy="selectin")
    documents = relationship("Document", back_populates="application", lazy="selectin")
    evc_visits = relationship("EVCVisit", back_populates="application", lazy="selectin")

class ApplicationStageHistory(Base):
    __tablename__ = "application_stage_history"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id"), nullable=False)
    stage_id = Column(String(36), ForeignKey("workflow_stages.id"), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    entered_at = Column(DateTime, default=utc_now)
    exited_at = Column(DateTime, nullable=True)
    sla_due_at = Column(DateTime, nullable=True)
    is_breached = Column(Boolean, default=False)
    outcome = Column(String(50), nullable=True) # ADVANCED, DEFICIENCY_RAISED, APPROVED, REJECTED
    remarks = Column(Text, nullable=True)

    application = relationship("Application", back_populates="history")
    stage = relationship("WorkflowStage")
    actor = relationship("User")

class Deficiency(Base):
    __tablename__ = "deficiencies"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id"), nullable=False)
    raised_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    category = Column(String(100), nullable=False) # "Document Incomplete", "Land Lease Invalid", "Infrastructure Deficiency"
    description = Column(Text, nullable=False)
    status = Column(String(50), default="OPEN", index=True) # OPEN, RESPONDED, RESOLVED, REJECTED
    due_at = Column(DateTime, nullable=False)
    response_text = Column(Text, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    application = relationship("Application", back_populates="deficiencies")
    raised_by = relationship("User", foreign_keys=[raised_by_id])
    attachments = relationship("DeficiencyAttachment", back_populates="deficiency")

class DeficiencyAttachment(Base):
    __tablename__ = "deficiency_attachments"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    deficiency_id = Column(String(36), ForeignKey("deficiencies.id"), nullable=False)
    file_path = Column(String(255), nullable=False)
    original_name = Column(String(200), nullable=False)
    file_size = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=utc_now)

    deficiency = relationship("Deficiency", back_populates="attachments")

class Remark(Base):
    __tablename__ = "remarks"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False) # True = AICTE officer internal note, False = visible to College
    created_at = Column(DateTime, default=utc_now)

    application = relationship("Application", back_populates="remarks")
    author = relationship("User")

class DocumentType(Base):
    __tablename__ = "document_types"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False) # LAND_LEASE, FIRE_NOC, BUILDING_PLAN, AFFILIATION_LETTER, FACULTY_LIST
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    has_expiry = Column(Boolean, default=False)
    default_validity_years = Column(Integer, default=1)
    is_mandatory = Column(Boolean, default=True)

class Document(Base):
    __tablename__ = "documents"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id"), nullable=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    type_id = Column(String(36), ForeignKey("document_types.id"), nullable=False)
    file_path = Column(String(255), nullable=False)
    original_name = Column(String(200), nullable=False)
    mime_type = Column(String(100), default="application/pdf")
    file_size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    version = Column(Integer, default=1)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="UPLOADED", index=True) # UPLOADED, OCR_PENDING, OCR_DONE, VERIFIED, REJECTED, EXPIRED
    issue_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True, index=True)
    ocr_text = Column(Text, nullable=True)
    ocr_confidence = Column(Float, default=0.0)
    extracted_fields = Column(JSON, default=dict) # {"issue_date": "...", "expiry_date": "...", "lease_years": 30}
    verified_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    application = relationship("Application", back_populates="documents")
    institution = relationship("Institution", back_populates="documents")
    document_type = relationship("DocumentType")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    versions = relationship("DocumentVersion", back_populates="document", order_by="DocumentVersion.version")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    version = Column(Integer, nullable=False)
    file_path = Column(String(255), nullable=False)
    sha256 = Column(String(64), nullable=False)
    uploaded_at = Column(DateTime, default=utc_now)

    document = relationship("Document", back_populates="versions")

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False) # FIRE_NOC_VALID, FACULTY_RATIO_1_15, MANDATORY_DISCLOSURE
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    periodicity = Column(String(50), default="ANNUAL") # ONE_TIME, ANNUAL, QUARTERLY
    condition_json = Column(JSON, nullable=False) # JSON logic AST for Rule Engine
    is_active = Column(Boolean, default=True)

class ComplianceItem(Base):
    __tablename__ = "compliance_items"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    rule_id = Column(String(36), ForeignKey("compliance_rules.id"), nullable=False)
    application_id = Column(String(36), ForeignKey("applications.id"), nullable=True)
    status = Column(String(50), default="PENDING", index=True) # PENDING, COMPLIANT, NON_COMPLIANT, OVERDUE, WAIVED
    due_date = Column(DateTime, nullable=True)
    evidence_document_id = Column(String(36), ForeignKey("documents.id"), nullable=True)
    last_evaluated_at = Column(DateTime, default=utc_now)
    evaluation_result = Column(JSON, default=dict) # {"passed": true, "explain": "Fire NOC valid for 280 days"}
    notes = Column(Text, nullable=True)

    institution = relationship("Institution", back_populates="compliance_items")
    rule = relationship("ComplianceRule")
    evidence_document = relationship("Document")

class ComplianceScore(Base):
    __tablename__ = "compliance_scores"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    score = Column(Float, nullable=False) # 0 to 100
    grade = Column(String(5), default="A") # A, B, C, D
    breakdown = Column(JSON, default=dict) # Category scores
    evaluated_at = Column(DateTime, default=utc_now)

class EVCVisit(Base):
    __tablename__ = "evc_visits"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id"), nullable=False)
    scheduled_date = Column(DateTime, nullable=False)
    start_time = Column(String(10), default="09:30")
    end_time = Column(String(10), default="17:00")
    status = Column(String(50), default="SCHEDULED") # SCHEDULED, CONFIRMED, COMPLETED, CANCELLED, RESCHEDULED
    coordinator_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    report_due_at = Column(DateTime, nullable=False)
    report_submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    application = relationship("Application", back_populates="evc_visits")
    coordinator = relationship("User", foreign_keys=[coordinator_id])
    members = relationship("EVCMember", back_populates="visit")
    report = relationship("EVCReport", back_populates="visit", uselist=False)

class EVCMember(Base):
    __tablename__ = "evc_members"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    visit_id = Column(String(36), ForeignKey("evc_visits.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="MEMBER") # CHAIRPERSON, MEMBER
    response = Column(String(50), default="PENDING") # PENDING, ACCEPTED, DECLINED
    conflict_of_interest_declared = Column(Boolean, default=False)
    response_notes = Column(Text, nullable=True)

    visit = relationship("EVCVisit", back_populates="members")
    user = relationship("User")

class EVCReport(Base):
    __tablename__ = "evc_reports"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    visit_id = Column(String(36), ForeignKey("evc_visits.id"), nullable=False, unique=True)
    recommendation = Column(String(50), nullable=False) # APPROVE, APPROVE_WITH_CONDITIONS, REJECT
    findings_checklist = Column(JSON, default=dict) # {"infrastructure": "Pass", "labs": "Pass", ...}
    remarks = Column(Text, nullable=True)
    deficiencies_found = Column(JSON, default=list)
    submitted_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime, default=utc_now)

    visit = relationship("EVCVisit", back_populates="report")
    submitted_by = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    channel = Column(String(20), default="IN_APP") # IN_APP, EMAIL
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    severity = Column(String(20), default="INFO") # INFO, WARNING, DANGER
    entity_type = Column(String(50), nullable=True) # APPLICATION, DEFICIENCY, DOCUMENT, EVC
    entity_id = Column(String(36), nullable=True)
    status = Column(String(20), default="UNREAD", index=True) # UNREAD, READ, SENT, FAILED
    dedupe_key = Column(String(100), unique=True, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    read_at = Column(DateTime, nullable=True)

    user = relationship("User")

class Escalation(Base):
    __tablename__ = "escalations"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    entity_type = Column(String(50), nullable=False) # APPLICATION, DEFICIENCY
    entity_id = Column(String(36), nullable=False)
    level = Column(Integer, default=1) # 1 = Senior Officer, 2 = Regional Head / Admin
    reason = Column(String(200), nullable=False)
    triggered_at = Column(DateTime, default=utc_now)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True) # LOGIN, APPLICATION_SUBMIT, TRANSITION, VERIFY_DOCUMENT
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(36), nullable=False)
    before_state = Column(JSON, default=dict)
    after_state = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    prev_hash = Column(String(64), nullable=True)
    hash = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, index=True)

    actor = relationship("User")

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class JobRun(Base):
    __tablename__ = "job_runs"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_name = Column(String(100), nullable=False) # SLA_BREACH_CHECK, DOC_EXPIRY_SCAN, COMPLIANCE_EVALUATION
    started_at = Column(DateTime, default=utc_now)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="RUNNING") # RUNNING, SUCCESS, FAILED
    stats = Column(JSON, default=dict) # {"scanned": 150, "alerts_sent": 12, "escalations": 3}
