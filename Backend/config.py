# ============================================================
# CONFIGURATION
# ============================================================

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Admin credentials for production
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

MAX_RETRIES = 3
RETRY_DELAY = 1

DEFAULT_ORGANIZATION_ID = 1
DEFAULT_DEVICE_ID = 1
DEFAULT_DEVICE_CODE = "ESP32_WATER_001"

# EC conversion factor: TDS (ppm) = EC (µS/cm) * 0.64
EC_CONVERSION_FACTOR = 0.64

# Valid sensor names for alerts
VALID_SENSORS = {"ph", "turbidity", "tds", "temperature"}

# Severity tiers for 3-tier alert system
SEVERITY_CRITICAL = {"high", "critical"}
SEVERITY_WARNING = {"medium", "warning"}
