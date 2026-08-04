"""
APScheduler Background Scheduler — Module 3

Runs periodic jobs to keep deadline statuses and health scores fresh.
Jobs:
  - Every 6 hours: mark expired deadlines
  - Every day at 8 AM IST: log health score summaries
"""
from __future__ import annotations
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.logging import get_logger

logger = get_logger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _job_expire_deadlines():
    """Mark overdue active deadlines as expired."""
    try:
        from app.modules.deadline_engine.service import update_expired_statuses
        count = await update_expired_statuses()
        logger.info(f"[Scheduler] Expired {count} overdue deadline(s)")
    except Exception as e:
        logger.error(f"[Scheduler] expire_deadlines job failed: {e}")


async def _job_log_health_summary():
    """Log a brief health summary across all users (diagnostic only)."""
    try:
        from app.database.mongodb import get_database
        db = get_database()
        total = await db["deadlines"].count_documents({})
        expired = await db["deadlines"].count_documents({"status": "expired"})
        active = await db["deadlines"].count_documents({"status": "active"})
        logger.info(
            f"[Scheduler] Health Summary — Total: {total}, Active: {active}, Expired: {expired}"
        )
    except Exception as e:
        logger.error(f"[Scheduler] health_summary job failed: {e}")


async def _job_send_reminders():
    """Check deadlines and send WhatsApp/SMS/console reminders (Feature 4)."""
    try:
        from app.modules.notifications.service import check_and_send_reminders
        sent = await check_and_send_reminders()
        logger.info(f"[Scheduler] Sent {sent} deadline reminder(s)")
    except Exception as e:
        logger.error(f"[Scheduler] send_reminders job failed: {e}")


def start_scheduler() -> AsyncIOScheduler:
    """Initialize and start the APScheduler. Call once on app startup."""
    global _scheduler

    if _scheduler and _scheduler.running:
        logger.warning("Scheduler already running — skipping start")
        return _scheduler

    _scheduler = AsyncIOScheduler()

    # Job 1: Expire deadlines every 6 hours
    _scheduler.add_job(
        _job_expire_deadlines,
        trigger=IntervalTrigger(hours=6),
        id="expire_deadlines",
        name="Expire Overdue Deadlines",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Job 2: Daily 8AM IST summary (UTC+5:30 → 2:30 UTC)
    _scheduler.add_job(
        _job_log_health_summary,
        trigger=CronTrigger(hour=2, minute=30),
        id="health_summary",
        name="Daily Legal Health Summary",
        replace_existing=True,
        misfire_grace_time=600,
    )

    # Job 3: Daily 8AM IST deadline reminders (Feature 4)
    _scheduler.add_job(
        _job_send_reminders,
        trigger=CronTrigger(hour=2, minute=30),
        id="send_reminders",
        name="Daily Deadline Reminders",
        replace_existing=True,
        misfire_grace_time=600,
    )

    _scheduler.start()
    logger.info("APScheduler started — deadline jobs running")
    return _scheduler


def stop_scheduler():
    """Gracefully stop the scheduler on app shutdown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
