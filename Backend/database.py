# ============================================================
# DATABASE MANAGEMENT AND HELPER FUNCTIONS
# ============================================================

from datetime import datetime, timezone
from typing import Optional, List, Dict

import asyncpg
import logging
from fastapi import HTTPException

from config import DATABASE_URL, MAX_RETRIES, RETRY_DELAY, EC_CONVERSION_FACTOR

logger = logging.getLogger(__name__)

db_pool: Optional[asyncpg.Pool] = None


async def create_pool():
    global db_pool
    for attempt in range(MAX_RETRIES):
        try:
            db_pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=1,
                max_size=10
            )
            logger.info("Database connection pool created")
            return
        except Exception as e:
            logger.error(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import asyncio
                await asyncio.sleep(RETRY_DELAY)
            else:
                logger.error("Could not connect to database")
                raise


async def close_pool():
    if db_pool:
        await db_pool.close()
        logger.info("Database pool closed")


async def get_db():
    if db_pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    async with db_pool.acquire() as conn:
        yield conn


def calculate_ec(tds_value: Optional[float]) -> Optional[float]:
    """Calculate Electrical Conductivity from TDS using standard conversion."""
    if tds_value is None:
        return None
    return round(tds_value / EC_CONVERSION_FACTOR, 2)


def calculate_severity(parameter: str, value: Optional[float], threshold: Optional[Dict]) -> str:
    """Calculate 3-tier severity based on thresholds."""
    if value is None or threshold is None:
        return "low"

    min_val = threshold.get("min_value")
    max_val = threshold.get("max_value")
    warning_val = threshold.get("warning_value")

    if min_val is not None and value < min_val:
        return "critical"
    if max_val is not None and value > max_val:
        return "critical"
    if warning_val is not None:
        if max_val is not None and value > warning_val:
            return "medium"
        if min_val is not None and value < warning_val:
            return "medium"
    return "low"


async def get_thresholds_for_device(conn, device_id: int) -> Dict[str, Dict]:
    """Get active thresholds for a device."""
    rows = await conn.fetch("""
        SELECT parameter, min_value, max_value, warning_value
        FROM thresholds
        WHERE device_id = $1 AND is_active = TRUE
    """, device_id)

    thresholds = {}
    for row in rows:
        thresholds[row["parameter"]] = {
            "min_value": float(row["min_value"]) if row["min_value"] is not None else None,
            "max_value": float(row["max_value"]) if row["max_value"] is not None else None,
            "warning_value": float(row["warning_value"]) if row["warning_value"] is not None else None,
        }
    return thresholds


async def insert_reading(conn, reading) -> tuple:
    """Insert sensor reading and return reading_id, device_id, exceeded sensors."""
    # 1. Get or create the device using device_code
    device_row = await conn.fetchrow("""
        INSERT INTO devices (device_code, organization_id, water_body_name, is_active)
        VALUES ($1, 1, 'Auto-registered device', TRUE)
        ON CONFLICT (device_code) DO UPDATE SET is_active = TRUE
        RETURNING device_id
    """, reading.device_code)

    device_id = device_row["device_id"]

    # 2. Calculate EC from TDS
    ec_value = calculate_ec(reading.tds_value)

    # 3. Get thresholds and detect exceeded sensors
    thresholds = await get_thresholds_for_device(conn, device_id)

    exceeded = list(reading.exceeded_sensors) if reading.exceeded_sensors else []
    if not exceeded:
        checks = [
            ("ph", reading.ph_value),
            ("turbidity", reading.turbidity_value),
            ("tds", reading.tds_value),
            ("temperature", reading.temperature_celsius),
        ]
        for param, value in checks:
            if value is None:
                continue
            thresh = thresholds.get(param)
            if thresh:
                min_val = thresh.get("min_value")
                max_val = thresh.get("max_value")
                if (min_val is not None and value < min_val) or (max_val is not None and value > max_val):
                    exceeded.append(param)

    is_alert = reading.is_alert or len(exceeded) > 0

    # 4. Insert the sensor reading
    row = await conn.fetchrow("""
        INSERT INTO sensor_readings (
            device_id, reading_timestamp, ph_value, turbidity_value, tds_value,
            temperature_celsius, ec_value, is_alert, alert_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING reading_id
    """,
        device_id,
        datetime.now(timezone.utc),
        reading.ph_value,
        reading.turbidity_value,
        reading.tds_value,
        reading.temperature_celsius,
        ec_value,
        is_alert,
        reading.alert_reason
    )

    return row["reading_id"], device_id, exceeded


async def create_alerts_for_reading(
    reading_id: int,
    device_id: int,
    exceeded_sensors: List[str],
    reason: Optional[str]
):
    """Create alert records for exceeded sensors."""
    async with db_pool.acquire() as conn:
        thresholds = await get_thresholds_for_device(conn, device_id)

        reading = await conn.fetchrow("""
            SELECT ph_value, turbidity_value, tds_value, temperature_celsius
            FROM sensor_readings
            WHERE reading_id = $1
        """, reading_id)

        value_map = {
            "ph": reading["ph_value"],
            "turbidity": reading["turbidity_value"],
            "tds": reading["tds_value"],
            "temperature": reading["temperature_celsius"],
        }

        for sensor in exceeded_sensors:
            try:
                value = value_map.get(sensor)
                severity = calculate_severity(sensor, value, thresholds.get(sensor))

                await conn.execute("""
                    INSERT INTO alerts (
                        reading_id, device_id, alert_type, alert_message, severity, status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                """,
                    reading_id,
                    device_id,
                    f"HIGH_{sensor.upper()}",
                    f"{sensor.upper()} threshold exceeded: {reason}",
                    severity,
                    "active"
                )

                logger.info(f"Alert created for {sensor} with severity {severity}")
            except Exception as e:
                logger.error(f"Failed to create alert: {e}")


async def initialize_schema():
    """Initialize database schema by executing schema.sql statements separately."""
    import os
    
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    
    if not os.path.exists(schema_path):
        logger.warning(f"Schema file not found at {schema_path}")
        return
    
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
    
    # Split the schema into individual statements
    # Remove comments first
    statements = []
    current_statement = []
    in_comment = False
    
    for line in schema_sql.split('\n'):
        stripped = line.strip()
        
        # Skip comment lines
        if stripped.startswith('--'):
            continue
        
        # Skip empty lines
        if not stripped:
            continue
        
        current_statement.append(line)
        
        # Check if the statement ends with a semicolon
        if stripped.endswith(';'):
            statement = '\n'.join(current_statement).strip()
            if statement:
                statements.append(statement)
            current_statement = []
    
    # Execute each statement separately
    async with db_pool.acquire() as conn:
        for i, statement in enumerate(statements, 1):
            try:
                await conn.execute(statement)
                logger.info(f"Executed schema statement {i}/{len(statements)}")
            except Exception as e:
                logger.error(f"Failed to execute schema statement {i}: {e}")
                logger.error(f"Statement: {statement[:100]}...")
                raise
    
    logger.info("Database schema initialized successfully")
