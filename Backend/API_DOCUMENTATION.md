# AquaWatch API Documentation

This document describes the REST API that the web dashboard and the ESP32
firmware talk to. The backend is a Django REST Framework project; all endpoints
live under the `/api/` prefix.

Base URL used in these examples:

```
https://aquawatch-188s.onrender.com/api
```

When running locally the base URL is `http://localhost:8000/api`.

---

## Authentication

Most endpoints require a JWT access token. You get one from the login endpoint
and send it in the `Authorization` header:

```
Authorization: Bearer <token>
```

The following endpoints are public (no token needed):

- `POST /auth/login/`
- `POST /auth/register/`
- `POST /readings/` (the Arduino posts here)
- `GET /readings/latest/`
- `GET /arduino/assignment/`

---

## Authentication & profile

### `POST /auth/register/`

Create a new account.

```json
{
  "username": "jane",
  "email": "jane@example.com",
  "password": "secret123",
  "password2": "secret123",
  "phone": "+233201234567",
  "pin": "1234"
}
```

Returns the user object plus a fresh token pair.

### `POST /auth/login/`

```json
{
  "username": "jane",
  "password": "secret123"
}
```

Returns the user and a token pair:

```json
{
  "user": {
    "id": 1,
    "username": "jane",
    "email": "jane@example.com"
  },
  "token": "<access_token>",
  "refresh": "<refresh_token>"
}
```

### `GET /auth/me/`

Returns the profile of the currently authenticated user. Requires a token.

### Profile update endpoints (all `POST`, all require a token)

| Endpoint | Body field |
|----------|------------|
| `POST /auth/change-password/` | `current_password`, `new_password` |
| `POST /auth/change-username/` | `new_username` |
| `POST /auth/change-pin/` | `old_pin`, `new_pin` |
| `POST /auth/change-email/` | `email` |
| `POST /auth/change-phone/` | `phone` |
| `POST /auth/change-company-name/` | `company_name` |
| `POST /auth/change-location/` | `location` |
| `POST /auth/change-profile-picture/` | `profile_picture` |

---

## Devices

Devices are the registered monitoring stations.

### `GET /devices/`

List all active devices. Public for reads, requires a token to create.

### `POST /devices/`

Create a new device. The device is assigned to the calling user's organization
(or a default one if no organization is set).

```json
{
  "device_name": "Ankobra — Bogoso",
  "device_code": "ARDUINO_7",
  "device_type": "IoT Sensor",
  "location": "Bogoso",
  "arduino_mac_address": "AA:BB:CC:DD:EE:FF"
}
```

### `GET /devices/<id>/`

Fetch a single device.

### `DELETE /devices/<id>/`

Soft-deletes a device by marking it inactive. Requires a token.

---

## Sensor readings

### `POST /readings/?mac_address=...`

**Public.** This is what the ESP32 calls. The body is plain text, not JSON, with
the values separated by commas:

```
TEMP:27.1,TDS:77,EC:121,NTU:8.4,PH:7.2,ORP:414,TIER:0
```

You identify the device with either a `mac_address` or a `device_id` query
parameter. If the device can't be found by MAC you get a `404`; if neither
parameter is present you get a `400`.

On success:

```json
{
  "status": "success",
  "reading_id": 123
}
```

The stored fields are temperature (`TEMP`), TDS (`TDS`), EC (`EC`), turbidity
(`NTU`) and pH (`PH`). A `TIER` greater than 0 marks the reading as an alert and
records the reason.

### `GET /readings/latest/?device_id=<id>`

**Public.** Returns the most recent reading for a device, or a zeroed response
with a `message` field if no reading has been stored yet.

### `GET /readings/history/?device_id=<id>&hours=24`

Returns the readings for a device within the last `hours` (default 24), ordered
oldest first. Requires a token.

### `GET /readings/export/csv/?device_id=<id>&hours=24`

Streams the readings as a CSV download. Requires a token. The file is named
`sensor_readings_<timestamp>.csv` and includes timestamp, device, temperature,
pH, TDS, EC, turbidity and alert columns.

---

## Thresholds

Thresholds define the min/max range that turns a reading into an alert.

### `GET /thresholds/?device_id=<id>`

Lists active thresholds for a device (or all active thresholds if no device is
given). Requires a token.

### `POST /thresholds/`

Create or update a threshold. One threshold per `device` + `sensor_type`.

```json
{
  "device": 7,
  "sensor_type": "ph",
  "min_value": 6.5,
  "max_value": 8.5,
  "is_active": true
}
```

### `GET /thresholds/<id>/`

Fetch a single threshold.

---

## Alerts

### `GET /alerts/?device_id=<id>&status=active`

Lists alerts, newest first. Optionally filter by `device_id` and `status`
(e.g. `active` or `acknowledged`). Requires a token.

### `GET /alerts/<id>/`

Fetch a single alert. Requires a token.

(Alerts are acknowledged by the frontend with a `PATCH` setting
`status: "acknowledged"`.)

---

## Organizations

### `GET /organizations/`

Lists all organizations. Requires a token.

---

## Dashboard & analytics

### `GET /dashboard/summary/`

Returns quick counts for the dashboard header: total active devices, active
alerts, total readings, and the latest reading object. Requires a token.

### `GET /analytics/summary/?device_id=<id>&hours=24`

Computes min / max / average / current for each parameter over the window, plus
alert counts. Requires a token.

```json
{
  "statistics": {
    "total_readings": 100,
    "temperature": { "min": 20.5, "max": 28.3, "avg": 24.1, "current": 27.1 },
    "ph": { "min": 6.8, "max": 7.8, "avg": 7.2, "current": 7.2 },
    "tds": { "min": 60, "max": 200, "avg": 120, "current": 77 },
    "ec": { "min": 90, "max": 300, "avg": 180, "current": 121 },
    "turbidity": { "min": 2.0, "max": 9.0, "avg": 5.2, "current": 8.4 },
    "alerts": { "total": 5, "percentage": 5.0 }
  }
}
```

---

## Arduino assignment

The ESP32 uses these to find out which station it belongs to.

### `GET /arduino/assignment/?mac_address=<mac>`

**Public.** Returns the assigned device, or `assigned: false` if the MAC isn't
linked to any station.

### `POST /arduino/assign/`

Link an Arduino MAC address to a device.

```json
{
  "device_id": 7,
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
```

Any previous MAC assignment on that address is cleared first (a MAC can only be
assigned to one device). Requires a token.

### `POST /arduino/unassign/`

Remove the Arduino from a device.

```json
{ "device_id": 7 }
```

Requires a token.

---

## Common error responses

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (soft delete returns this) |
| 400 | Bad request / validation error |
| 401 | Missing or invalid token |
| 403 | Not permitted (e.g. disabled account) |
| 404 | Resource not found |
| 500 | Server error |

---

## Sensor data format (for the Arduino)

Plain text, comma separated, sent with a `text/plain` content type:

```
TEMP:{temperature_celsius},TDS:{tds},EC:{ec},NTU:{turbidity},PH:{ph},ORP:{orp},TIER:{tier}
```

- `TEMP` — water temperature in °C
- `TDS` — total dissolved solids in mg/L
- `EC` — electrical conductivity in µS/cm
- `NTU` — turbidity in NTU
- `PH` — pH (roughly 0–14)
- `ORP` — oxidation-reduction potential in mV (logged but not stored)
- `TIER` — 0 normal, 1 warning, 2 critical (drives the alert flag)
