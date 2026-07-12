# ============================================================
# DEVICES ROUTER
# ============================================================

from typing import List

import asyncpg
from fastapi import APIRouter, HTTPException

from config import DEFAULT_ORGANIZATION_ID
from database import db_pool
from models import DeviceCreate, DeviceUpdate, DeviceResponse

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=List[DeviceResponse])
async def list_devices():
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT device_id, device_code, water_body_name, location_description,
                       latitude, longitude, is_active, created_at
                FROM devices
                ORDER BY created_at DESC
            """)
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(device_id: int):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT device_id, device_code, water_body_name, location_description,
                       latitude, longitude, is_active, created_at
                FROM devices
                WHERE device_id = $1
            """, device_id)

            if row is None:
                raise HTTPException(status_code=404, detail="Device not found")

            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.post("", response_model=DeviceResponse)
async def create_device(device: DeviceCreate):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO devices (device_code, organization_id, water_body_name,
                                     location_description, latitude, longitude, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, TRUE)
                RETURNING device_id, device_code, water_body_name, location_description,
                          latitude, longitude, is_active, created_at
            """, device.device_code, DEFAULT_ORGANIZATION_ID, device.water_body_name,
                device.location_description, device.latitude, device.longitude)

            return dict(row)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Device code already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(device_id: int, device: DeviceUpdate):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                UPDATE devices
                SET water_body_name = COALESCE($2, water_body_name),
                    location_description = COALESCE($3, location_description),
                    latitude = COALESCE($4, latitude),
                    longitude = COALESCE($5, longitude),
                    is_active = COALESCE($6, is_active)
                WHERE device_id = $1
                RETURNING device_id, device_code, water_body_name, location_description,
                          latitude, longitude, is_active, created_at
            """, device_id, device.water_body_name, device.location_description,
                device.latitude, device.longitude, device.is_active)

            if row is None:
                raise HTTPException(status_code=404, detail="Device not found")

            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{device_id}")
async def delete_device(device_id: int):
    try:
        async with db_pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM devices WHERE device_id = $1",
                device_id
            )

            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Device not found")

            return {"message": "Device deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")
