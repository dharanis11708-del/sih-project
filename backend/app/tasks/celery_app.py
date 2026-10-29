import asyncio
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.tasks.scheduled_jobs import (
    run_sla_breach_check,
    run_document_expiry_scan,
    run_compliance_evaluation
)

celery_app = Celery(
    "approvaltrack_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "sla-breach-check-hourly": {
            "task": "app.tasks.celery_app.celery_sla_check",
            "schedule": crontab(minute=0), # every hour
        },
        "doc-expiry-scan-daily": {
            "task": "app.tasks.celery_app.celery_doc_expiry_scan",
            "schedule": crontab(hour=6, minute=0), # 6:00 AM daily
        },
        "compliance-evaluation-daily": {
            "task": "app.tasks.celery_app.celery_compliance_eval",
            "schedule": crontab(hour=2, minute=0), # 2:00 AM daily
        },
    }
)

def run_async(coro):
    return asyncio.run(coro)

@celery_app.task
def celery_sla_check():
    async def _runner():
        async with AsyncSessionLocal() as session:
            return await run_sla_breach_check(session)
    return run_async(_runner())

@celery_app.task
def celery_doc_expiry_scan():
    async def _runner():
        async with AsyncSessionLocal() as session:
            return await run_document_expiry_scan(session)
    return run_async(_runner())

@celery_app.task
def celery_compliance_eval():
    async def _runner():
        async with AsyncSessionLocal() as session:
            return await run_compliance_evaluation(session)
    return run_async(_runner())

