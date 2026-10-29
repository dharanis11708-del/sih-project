from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.entities import (
    Application, Document, Deficiency, ComplianceItem, ComplianceRule,
    Institution, Notification, Escalation, User, JobRun, EVCVisit
)
from app.engine.rule_engine import RuleEngine
from app.notifications.email_service import EmailService
from app.core.permissions import Role
from app.core.logging import logger

async def run_sla_breach_check(db: AsyncSession) -> Dict[str, Any]:
    """Scans all non-terminal applications for SLA breaches and impending deadlines."""
    now = datetime.now(timezone.utc)
    job_run = JobRun(job_name="SLA_BREACH_CHECK", started_at=now, status="RUNNING")
    db.add(job_run)
    await db.commit()

    stats = {"scanned": 0, "breached": 0, "near_breach": 0, "escalated": 0}

    # Fetch active applications
    res = await db.execute(
        select(Application).where(
            Application.status.not_in(["APPROVED", "REJECTED", "DRAFT"])
        )
    )
    apps = res.scalars().all()
    stats["scanned"] = len(apps)

    for app in apps:
        if not app.due_at:
            continue

        # Overdue breach
        if now > app.due_at and not app.is_overdue:
            app.is_overdue = True
            stats["breached"] += 1

            # Create in-app notification for assigned officer
            if app.assigned_officer_id:
                notif = Notification(
                    user_id=app.assigned_officer_id,
                    title="SLA Breached: Action Overdue",
                    body=f"Application {app.application_no} has breached its stage SLA deadline.",
                    severity="DANGER",
                    entity_type="APPLICATION",
                    entity_id=app.id,
                    dedupe_key=f"SLA_BREACH_{app.id}_{app.current_stage_id}"
                )
                db.add(notif)

            # Auto-escalation: Create level 1 escalation if overdue > 2 days
            overdue_duration = (now - app.due_at).total_seconds() / 3600 # hours
            if overdue_duration >= 48:
                esc = Escalation(
                    entity_type="APPLICATION",
                    entity_id=app.id,
                    level=1,
                    reason=f"Application overdue by {int(overdue_duration // 24)} days in stage"
                )
                db.add(esc)
                stats["escalated"] += 1

                # Alert Senior Officers
                senior_res = await db.execute(
                    select(User).where(User.role.in_([Role.SENIOR_OFFICER.value, Role.SUPER_ADMIN.value]))
                )
                for senior in senior_res.scalars().all():
                    db.add(Notification(
                        user_id=senior.id,
                        title=f"Escalation (Level 1): Application {app.application_no}",
                        body=f"Application is {int(overdue_duration // 24)} days overdue. Immediate intervention or reassignment required.",
                        severity="DANGER",
                        entity_type="APPLICATION",
                        entity_id=app.id,
                        dedupe_key=f"ESC_LVL1_{app.id}"
                    ))

        # Impending breach warning (due within next 24 hours)
        elif now <= app.due_at <= now + timedelta(hours=24):
            stats["near_breach"] += 1
            if app.assigned_officer_id:
                db.add(Notification(
                    user_id=app.assigned_officer_id,
                    title="SLA Warning: Deadline within 24 hours",
                    body=f"Application {app.application_no} requires your decision before {app.due_at.strftime('%Y-%m-%d %H:%M')}.",
                    severity="WARNING",
                    entity_type="APPLICATION",
                    entity_id=app.id,
                    dedupe_key=f"SLA_WARN_{app.id}_{app.due_at.strftime('%Y%m%d')}"
                ))

    job_run.finished_at = datetime.now(timezone.utc)
    job_run.status = "SUCCESS"
    job_run.stats = stats
    await db.commit()
    return stats

async def run_document_expiry_scan(db: AsyncSession) -> Dict[str, Any]:
    """Scans all documents with expiry dates and alerts institutions at T-90, T-60, T-30, and T-7."""
    now = datetime.now(timezone.utc)
    job_run = JobRun(job_name="DOC_EXPIRY_SCAN", started_at=now, status="RUNNING")
    db.add(job_run)
    await db.commit()

    stats = {"scanned": 0, "expiring_soon": 0, "expired": 0, "notifications": 0}

    res = await db.execute(
        select(Document).where(Document.expiry_date.isnot(None))
    )
    docs = res.scalars().all()
    stats["scanned"] = len(docs)

    for doc in docs:
        if not doc.expiry_date:
            continue

        days_to_expiry = (doc.expiry_date - now).total_seconds() / 86400

        if days_to_expiry < 0:
            doc.status = "EXPIRED"
            stats["expired"] += 1
        elif days_to_expiry <= 90:
            stats["expiring_soon"] += 1

            # Fetch college admin user
            user_res = await db.execute(
                select(User).where(
                    and_(
                        User.institution_id == doc.institution_id,
                        User.role == Role.COLLEGE_ADMIN.value
                    )
                )
            )
            college_admin = user_res.scalars().first()
            if college_admin:
                severity = "DANGER" if days_to_expiry <= 15 else "WARNING"
                dedupe = f"DOC_EXPIRY_{doc.id}_{int(days_to_expiry // 15)}"
                db.add(Notification(
                    user_id=college_admin.id,
                    title=f"Document Expiring: {doc.original_name}",
                    body=f"Your {doc.document_type.name if doc.document_type else 'document'} expires in {int(days_to_expiry)} days. Please upload renewal.",
                    severity=severity,
                    entity_type="DOCUMENT",
                    entity_id=doc.id,
                    dedupe_key=dedupe
                ))
                stats["notifications"] += 1

    job_run.finished_at = datetime.now(timezone.utc)
    job_run.status = "SUCCESS"
    job_run.stats = stats
    await db.commit()
    return stats

async def run_compliance_evaluation(db: AsyncSession) -> Dict[str, Any]:
    """Evaluates all compliance rules for all institutions and computes overall score (0-100)."""
    now = datetime.now(timezone.utc)
    job_run = JobRun(job_name="COMPLIANCE_EVALUATION", started_at=now, status="RUNNING")
    db.add(job_run)
    await db.commit()

    stats = {"institutions_evaluated": 0, "compliant_items": 0, "non_compliant_items": 0}

    inst_res = await db.execute(select(Institution))
    institutions = inst_res.scalars().all()

    rules_res = await db.execute(select(ComplianceRule).where(ComplianceRule.is_active == True))
    rules = rules_res.scalars().all()

    for inst in institutions:
        total_weight = 0
        passed_weight = 0

        # Facts for this institution
        # Count verified documents
        doc_count_res = await db.execute(
            select(func.count(Document.id)).where(
                and_(Document.institution_id == inst.id, Document.status == "VERIFIED")
            )
        )
        verified_docs = doc_count_res.scalar() or 0

        facts = {
            "institution": {
                "type": inst.type,
                "state": inst.state,
                "established_year": inst.established_year or 2010,
            },
            "verified_documents_count": verified_docs,
            "has_mandatory_disclosure": True,
        }

        for rule in rules:
            passed, trace = RuleEngine.evaluate(rule.condition_json, facts)
            weight = 3 if rule.severity == "CRITICAL" else (2 if rule.severity == "HIGH" else 1)
            total_weight += weight

            # Upsert compliance item
            item_res = await db.execute(
                select(ComplianceItem).where(
                    and_(
                        ComplianceItem.institution_id == inst.id,
                        ComplianceItem.rule_id == rule.id
                    )
                )
            )
            item = item_res.scalars().first()
            if not item:
                item = ComplianceItem(
                    institution_id=inst.id,
                    rule_id=rule.id,
                )
                db.add(item)

            item.status = "COMPLIANT" if passed else "NON_COMPLIANT"
            item.last_evaluated_at = now
            item.evaluation_result = trace

            if passed:
                passed_weight += weight
                stats["compliant_items"] += 1
            else:
                stats["non_compliant_items"] += 1

        # Calculate score (0-100)
        score = (passed_weight / total_weight * 100.0) if total_weight > 0 else 100.0
        inst.compliance_score = round(score, 1)
        stats["institutions_evaluated"] += 1

    job_run.finished_at = datetime.now(timezone.utc)
    job_run.status = "SUCCESS"
    job_run.stats = stats
    await db.commit()
    return stats

