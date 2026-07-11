# ============================================================
# PYDANTIC DATA MODELS
# ============================================================

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, validator


class SensorReading(BaseModel):
    device_code: str = Field(..., min_length=1, max_length=50, description="Unique device identifier")
    ph_value: Optional[float] = Field(None, ge=0, le=14)
    turbidity_value: Optional[float] = Field(None, ge=0)
    tds_value: Optional[float] = Field(None, ge=0)
    temperature_celsius: Optional[float] = Field(None, ge=-10, le=60)
    is_alert: bool = False
    exceeded_sensors: List[str] = Field(default_factory=list)
    alert_reason: Optional[str] = None

    @validator("exceeded_sensors")
    def validate_sensor_names(cls, v):
        valid_sensors = {"ph", "turbidity", "tds", "temperature"}
        for sensor in v:
            if sensor not in valid_sensors:
                raise ValueError(f"Invalid sensor name: {sensor}")
        return v

    @validator("alert_reason", always=True)
    def validate_alert_logic(cls, v, values):
        if values.get("is_alert") and not values.get("exceeded_sensors"):
            raise ValueError("Alert readings must specify exceeded sensors")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "device_code": "ESP32_WATER_001",
                "ph_value": 4.2,
                "turbidity_value": 18.5,
                "tds_value": 850.0,
                "temperature_celsius": 27.1,
                "is_alert": True,
                "exceeded_sensors": ["ph", "turbidity"],
                "alert_reason": "Acidic and high turbidity detected"
            }
        }


class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime


class MockReadingResponse(BaseModel):
    status: str
    mock_reading_id: int
    message: str


# Authentication models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: Optional[str]
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# Device management models
class DeviceCreate(BaseModel):
    device_code: str
    water_body_name: Optional[str] = None
    location_description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DeviceUpdate(BaseModel):
    water_body_name: Optional[str] = None
    location_description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None


class DeviceResponse(BaseModel):
    device_id: int
    device_code: str
    water_body_name: Optional[str]
    location_description: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    is_active: bool
    created_at: Optional[datetime]


# Alert models
class AlertUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|acknowledged|resolved)$")


class AlertSeverityUpdate(BaseModel):
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")


# Threshold models
class ThresholdCreate(BaseModel):
    device_id: int
    parameter: str = Field(..., pattern="^(ph|tds|turbidity|temperature|ec)$")
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    warning_value: Optional[float] = None


class ThresholdUpdate(BaseModel):
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    warning_value: Optional[float] = None
    is_active: Optional[bool] = None


# Settings models
class SettingCreate(BaseModel):
    setting_key: str
    setting_value: Optional[str] = None


class SettingUpdate(BaseModel):
    setting_value: Optional[str] = None
