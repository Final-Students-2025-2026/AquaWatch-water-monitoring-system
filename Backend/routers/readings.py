# ============================================================
# SENSOR READINGS ROUTER
# ============================================================

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status

from database import db_pool, insert_reading, create_alerts_for_reading
from models import SensorReading
from routers.websocket import broadcast_telemetry

router = APIRouter(prefix="/readings", tags=["Sensor Readings"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_reading(
    reading: SensorReading,
    background_tasks: BackgroundTasks
):
    try:
        async with db_pool.acquire() as conn:
            reading_id, device_id, exceeded = await insert_reading(conn, reading)

            stored = await conn.fetchrow(
                "SELECT * FROM sensor_readings WHERE reading_id = $1",
                reading_id
            )

        await broadcast_telemetry({
            "type": "telemetry",
            "device_id": device_id,
            "reading_id": reading_id,
            "reading_timestamp": stored["reading_timestamp"].isoformat() if stored["reading_timestamp"] else None,
            "ph_value": float(stored["ph_value"]) if stored["ph_value"] is not None else None,
            "turbidity_value": float(stored["turbidity_value"]) if stored["turbidity_value"] is not None else None,
            "tds_value": float(stored["tds_value"]) if stored["tds_value"] is not None else None,
            "temperature_celsius": float(stored["temperature_celsius"]) if stored["temperature_celsius"] is not None else None,
            "ec_value": float(stored["ec_value"]) if stored["ec_value"] is not None else None,
            "is_alert": stored["is_alert"],
            "alert_reason": stored["alert_reason"],
        })

        if exceeded:
            background_tasks.add_task(
                create_alerts_for_reading,
                reading_id,
                device_id,
                exceeded,
                reading.alert_reason or "Threshold exceeded"
            )

        return {
            "status": "success",
            "message": "Reading stored successfully",
            "reading_id": reading_id,
            "device_id": device_id,
            "exceeded_sensors": exceeded
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/latest")
async def get_latest_reading(device_id: int = Query(..., description="Device ID")):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT *
                FROM sensor_readings
                WHERE device_id = $1
                ORDER BY reading_timestamp DESC
                LIMIT 1
            """, device_id)

            if row is None:
                return {"message": f"No readings found for device {device_id}"}

            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/history")
async def get_readings_history(
    device_id: int = Query(..., description="Device ID"),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back")
):
    try:
        async with db_pool.acquire() as conn:
            since = datetime.now(timezone.utc) - timedelta(hours=hours)
            rows = await conn.fetch("""
                SELECT reading_id, reading_timestamp,
                       ph_value, turbidity_value, tds_value,
                       temperature_celsius, ec_value, is_alert
                FROM sensor_readings
                WHERE device_id = $1 AND reading_timestamp >= $2
                ORDER BY reading_timestamp ASC
            """, device_id, since)

            return {
                "device_id": device_id,
                "hours": hours,
                "count": len(rows),
                "readings": [dict(r) for r in rows]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")
