from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import (
    Application, ApplicationStageHistory, WorkflowStage, WorkflowDefinition,
    User, Document, Deficiency, Region
)
from app.engine.rule_engine import RuleEngine
from app.core.permissions import Role

class WorkflowEngine:
    """
    Automated workflow execution engine for AICTE applications.
    Manages stage transitions, SLA computing (working days), auto-assignment, and stage auto-advance.
    """

    @staticmethod
    def calculate_sla_due_date(start_date: datetime, working_days: int) -> datetime:
        """Calculates SLA due date by skipping Saturdays and Sundays."""
        current = start_date
        added_days = 0
        while added_days < working_days:
            current += timedelta(days=1)
            # Monday is 0, Sunday is 6 -> weekday < 5 is Monday to Friday
            if current.weekday() < 5:
                added_days += 1
        return current

    @classmethod
    async def auto_assign_officer(cls, db: AsyncSession, application: Application) -> Optional[User]:
        """
        Least-loaded round-robin assignment strategy:
        Selects an AICTE_OFFICER within the application's institution's region with the fewest active applications.
        """
        institution = application.institution
        region_id = institution.region_id if institution else None

        query = select(User).where(
            and_(
                User.role == Role.AICTE_OFFICER.value,
                User.is_active == True
            )
        )
        if region_id:
            query = query.where(User.region_id == region_id)

        result = await db.execute(query)
        officers = result.scalars().all()

        if not officers:
            # Fallback to any active officer
            fallback_res = await db.execute(
                select(User).where(and_(User.role == Role.AICTE_OFFICER.value, User.is_active == True))
            )
            officers = fallback_res.scalars().all()

        if not officers:
            return None

        # Count open applications per officer
        best_officer = officers[0]
        min_load = float("inf")

        for officer in officers:
            count_res = await db.execute(
                select(func.count(Application.id)).where(
                    and_(
                        Application.assigned_officer_id == officer.id,
                        Application.status.not_in(["APPROVED", "REJECTED", "DRAFT"])
                    )
                )
            )
            load = count_res.scalar() or 0
            if load < min_load:
                min_load = load
                best_officer = officer

        return best_officer

    @classmethod
    async def check_stage_auto_advance(cls, db: AsyncSession, application: Application) -> Tuple[bool, Optional[str]]:
        """
        Evaluates whether an application meets prerequisites to automatically advance to the next stage.
        Returns: (can_advance: bool, reason: str)
        """
        if not application.current_stage:
            return False, "No current stage assigned"

        current_stage = application.current_stage

        # Terminal stages cannot advance
        if current_stage.is_terminal:
            return False, "Stage is terminal"

        # Check for open deficiencies
        deficiency_res = await db.execute(
            select(func.count(Deficiency.id)).where(
                and_(
                    Deficiency.application_id == application.id,
                    Deficiency.status == "OPEN"
                )
            )
        )
        open_deficiencies = deficiency_res.scalar() or 0
        if open_deficiencies > 0:
            return False, f"Application has {open_deficiencies} open deficiencies"

        # Check required documents
        required_doc_codes = current_stage.required_documents or []
        if required_doc_codes:
            for code in required_doc_codes:
                doc_res = await db.execute(
                    select(Document).join(Document.document_type).where(
                        and_(
                            Document.application_id == application.id,
                            Document.status == "VERIFIED",
                            Document.document_type.has(code=code)
                        )
                    )
                )
                verified_doc = doc_res.scalars().first()
                if not verified_doc:
                    return False, f"Mandatory document '{code}' has not been verified"

        # Evaluate auto-advance conditions via RuleEngine if defined
        if current_stage.auto_advance_conditions:
            facts = {
                "application": {
                    "priority": application.priority,
                    "risk_score": application.risk_score,
                },
                "open_deficiencies": open_deficiencies,
            }
            passed, _ = RuleEngine.evaluate(current_stage.auto_advance_conditions, facts)
            if not passed:
                return False, "Custom auto-advance stage condition not satisfied"

        return True, "All stage conditions satisfied"

    @classmethod
    async def advance_stage(
        cls,
        db: AsyncSession,
        application: Application,
        target_stage: WorkflowStage,
        actor: Optional[User] = None,
        outcome: str = "ADVANCED",
        remarks: Optional[str] = None
    ) -> ApplicationStageHistory:
        """Transitions the application to target stage, closes previous stage history, and sets SLA timers."""
        now = datetime.now(timezone.utc)

        # Close current stage history
        latest_history_res = await db.execute(
            select(ApplicationStageHistory).where(
                and_(
                    ApplicationStageHistory.application_id == application.id,
                    ApplicationStageHistory.exited_at.is_(None)
                )
            )
        )
        active_history = latest_history_res.scalars().first()
        if active_history:
            active_history.exited_at = now
            active_history.outcome = outcome
            if active_history.sla_due_at and now > active_history.sla_due_at:
                active_history.is_breached = True

        # Calculate SLA due date for new stage
        sla_days = target_stage.sla_days or 5
        sla_due_at = cls.calculate_sla_due_date(now, sla_days)

        # Update application
        application.current_stage_id = target_stage.id
        application.due_at = sla_due_at
        application.is_overdue = False
        application.status = target_stage.code

        if target_stage.is_terminal:
            application.completed_at = now

        # Create new stage history record
        new_history = ApplicationStageHistory(
            application_id=application.id,
            stage_id=target_stage.id,
            actor_id=actor.id if actor else None,
            entered_at=now,
            sla_due_at=sla_due_at,
            is_breached=False,
            remarks=remarks
        )
        db.add(new_history)
        return new_history

