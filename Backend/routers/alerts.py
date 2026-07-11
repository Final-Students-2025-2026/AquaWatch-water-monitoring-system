# ============================================================
# ALERTS ROUTER
# ============================================================

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from database import db_pool
from models import AlertUpdate, AlertSeverityUpdate

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
async def list_alerts(
    status: Optional[str] = Query(None, pattern="^(active|acknowledged|resolved)$"),
    severity: Optional[str] = Query(None, pattern="^(low|medium|high|critical)$"),
    device_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=500)
):
    try:
        async with db_pool.acquire() as conn:
            query = """
                SELECT a.alert_id, a.reading_id, a.device_id, d.device_code,
                       a.alert_type, a.alert_message, a.severity, a.status, a.resolved,
                       a.created_at, r.ph_value, r.turbidity_value, r.tds_value,
                       r.temperature_celsius, r.reading_timestamp
                FROM alerts a
                JOIN devices d ON a.device_id = d.device_id
                LEFT JOIN sensor_readings r ON a.reading_id = r.reading_id
                WHERE 1=1
            """
            params = []
            param_idx = 1

            if status:
                query += f" AND a.status = ${param_idx}"
                params.append(status)
                param_idx += 1
            if severity:
                query += f" AND a.severity = ${param_idx}"
                params.append(severity)
                param_idx += 1
            if device_id:
                query += f" AND a.device_id = ${param_idx}"
                params.append(device_id)
                param_idx += 1

            query += f" ORDER BY a.created_at DESC LIMIT ${param_idx}"
            params.append(limit)

            rows = await conn.fetch(query, *params)
            return {
                "count": len(rows),
                "alerts": [dict(r) for r in rows]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/summary")
async def get_alerts_summary():
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT severity, status, COUNT(*) as count
                FROM alerts
                GROUP BY severity, status
            """)

            summary = {
                "total": 0,
                "active": 0,
                "acknowledged": 0,
                "resolved": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
            }

            for row in rows:
                summary["total"] += row["count"]
                if row["status"] in summary:
                    summary[row["status"]] += row["count"]
                if row["severity"] in summary:
                    summary[row["severity"]] += row["count"]

            return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.put("/{alert_id}/status")
async def update_alert_status(alert_id: int, update: AlertUpdate):
    try:
        async with db_pool.acquire() as conn:
            resolved = update.status == "resolved"
            row = await conn.fetchrow("""
                UPDATE alerts
                SET status = $2, resolved = $3
                WHERE alert_id = $1
                RETURNING alert_id, status, resolved
            """, alert_id, update.status, resolved)

            if row is None:
                raise HTTPException(status_code=404, detail="Alert not found")

            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.put("/{alert_id}/severity")
async def update_alert_severity(alert_id: int, update: AlertSeverityUpdate):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                UPDATE alerts
                SET severity = $2
                WHERE alert_id = $1
                RETURNING alert_id, severity
            """, alert_id, update.severity)

            if row is None:
                raise HTTPException(status_code=404, detail="Alert not found")

            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")
