import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd

from app.db.session import get_db
from app.models.entities import Application, Institution, User
from app.core.permissions import require_roles, Role

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/pendency")
async def export_pendency_report(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AUDITOR]))
):
    res = await db.execute(
        select(Application).where(Application.status.not_in(["APPROVED", "REJECTED", "DRAFT"])).order_by(Application.created_at.desc())
    )
    apps = res.scalars().all()
    now = datetime.now(timezone.utc)

    rows = []
    for a in apps:
        ref_time = a.submitted_at or a.created_at
        days_in_stage = int((now - ref_time).total_seconds() / 86400)
        days_overdue = int((now - a.due_at).total_seconds() / 86400) if a.due_at and now > a.due_at else 0

        rows.append({
            "Application No": a.application_no,
            "Institution": a.institution.name if a.institution else "",
            "State": a.institution.state if a.institution else "",
            "Stage": a.current_stage.name if a.current_stage else a.status,
            "Assigned Officer": a.assigned_officer.name if a.assigned_officer else "Unassigned",
            "Days in Stage": days_in_stage,
            "Days Overdue": days_overdue,
            "Risk Label": a.risk_label,
            "SLA Breached": "Yes" if a.is_overdue else "No"
        })

    df = pd.DataFrame(rows)

    if format == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Pendency Report")
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=aicte_pendency_report.xlsx"}
        )
    else:
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(
            content=stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=aicte_pendency_report.csv"}
        )
