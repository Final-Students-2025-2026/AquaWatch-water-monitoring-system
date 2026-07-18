# AquaWatch API Documentation

## Base URL
```
https://aquawatch-p2mc.onrender.com/api
```

## Authentication
All endpoints require authentication unless marked as public.
Include JWT token in Authorization header:
```
Authorization: Bearer <your_token>
```

## Endpoints

### Authentication
#### POST /auth/login/
Login with username and password.
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```
Response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "user@example.com",
    "email": "user@example.com"
  }
}
```

### Devices
#### GET /devices/
List all devices (requires authentication).

#### POST /devices/
Create a new device (requires authentication).

#### GET /devices/{id}/
Get device details (requires authentication).

### Sensor Readings
#### POST /readings/
**Public endpoint** - Accept Arduino sensor data in plain text format.
```
TEMP:27.1,TDS:77,EC:121,NTU:8.4,PH:7.2,ORP:414,TIER:0
```

Data validation ranges:
- Temperature: -50°C to 100°C
- pH: 0 to 14
- TDS: 0 to 5000 mg/L
- EC: 0 to 5000 µS/cm
- Turbidity: 0 to 100 NTU

Response:
```json
{
  "status": "success",
  "reading_id": 123
}
```

#### GET /readings/latest/?device_id={id}
**Public endpoint** - Get latest reading for a device.

#### GET /readings/history/?device_id={id}&hours={24}
Get readings history for a device (requires authentication).

#### GET /readings/export/csv/?device_id={id}&hours={24}
Export readings to CSV file (requires authentication).

### Analytics
#### GET /analytics/summary/?device_id={id}&hours={24}
Get analytics summary with min/max/avg statistics (requires authentication).

Response:
```json
{
  "statistics": {
    "total_readings": 100,
    "temperature": {
      "min": 20.5,
      "max": 28.3,
      "avg": 24.1,
      "current": 27.1
    },
    "ph": {
      "min": 6.8,
      "max": 7.8,
      "avg": 7.2,
      "current": 7.2
    },
    "alerts": {
      "total": 5,
      "percentage": 5.0
    }
  }
}
```

### Thresholds
#### GET /thresholds/?device_id={id}
List thresholds for a device (requires authentication).

#### POST /thresholds/
Create a new threshold (requires authentication).

### Alerts
#### GET /alerts/?device_id={id}&status={active}
List alerts (requires authentication).

### Dashboard
#### GET /dashboard/summary/
Get dashboard summary statistics (requires authentication).

## Data Backup & Recovery

### Backup Database
```bash
python manage.py backup_db --output ./backups --compress
```

### Restore Database
```bash
python manage.py restore_db ./backups/aquawatch_backup_20250718_120000.json.gz --confirm
```

## Error Codes
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting
API endpoints are rate-limited to prevent abuse:
- Arduino POST endpoint: 10 requests per minute
- Other endpoints: 100 requests per minute per user

## Sensor Data Format
Arduino POST data format:
```
TEMP:{temperature},TDS:{tds},EC:{ec},NTU:{turbidity},PH:{ph},ORP:{orp},TIER:{tier}
```

Where:
- TEMP: Temperature in Celsius
- TDS: Total Dissolved Solids in mg/L
- EC: Electrical Conductivity in µS/cm
- NTU: Turbidity in NTU
- PH: pH level (0-14)
- ORP: Oxidation-Reduction Potential in mV
- TIER: Water quality tier (0=normal, 1=warning, 2=critical)
