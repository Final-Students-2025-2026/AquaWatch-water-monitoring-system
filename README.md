# AquaWatch — IoT Water Quality Monitoring System

AquaWatch is our final year project. It's an end-to-end water quality monitoring
system that reads live sensor data from an ESP32 installed on a sampling station,
sends it to a cloud backend, and lets you view everything through a web dashboard.

AquaWatch was designed and developed as a two-person team project:

- **Dennis Opoku Amponsah** — Index 3388322 — backend API, cloud deployment,
  telemetry pipeline and the ESP32 firmware.
- **Okoi Ampomaa Judith** — Index 3405922 — frontend dashboard, UI/UX design and
  the visualization layers.

The system tracks temperature, pH, total dissolved solids (TDS), electrical
conductivity (EC) and turbidity, and raises alerts whenever a reading goes
outside acceptable limits. The whole setup is split into three parts:

- **Arduino / ESP32 firmware** (`ARDUINO_WITH_ASSIGNMENT.ino`) that reads the
  sensors, shows a live summary on a small OLED screen, and posts the readings
  to the backend over WiFi.
- **Django REST backend** (`Backend/`) that stores the readings, manages the
  devices and organizations, computes statistics, and exposes a JSON API.
- **React web dashboard** (`Frontend/`) built with Vite that displays the live
  readings, history, alerts, and lets you configure thresholds and assign an
  Arduino to a station.

We have used a monitoring station on a river as the running example throughout, but
the same firmware and dashboard would work with any body of water.

---

## System overview

Readings flow in one direction most of the time:

```
[sensors] --> [ESP32] --> [Django API] --> [database] --> [React dashboard]
                     \----------> [OLED display + buzzer] (on the unit)
```

On a typical loop the ESP32:

1. takes a reading from each sensor (temperature, pH, TDS, EC, turbidity),
2. works out a simple tier (0 = normal, 1 = warning, 2 = critical),
3. shows the result on the OLED screen and beeps the buzzer if it's critical,
4. sends the reading to the backend, which stores it and flags any alerts.

The dashboard then reads that data back through the API, so you can watch the
monitoring station live from anywhere with internet access.

### Hardware pins

The firmware assumes the following wiring on the ESP32:

| Function          | Pin |
|-------------------|-----|
| Water temperature (DS18B20) | 23 |
| pH sensor         | 33 |
| TDS sensor        | 34 |
| Turbidity sensor  | 32 |
| Buzzer            | 16 |

The sensor readings are voltage based (mostly `analogRead` on a 0–3.3 V range),
so separate probe driver boards are needed for pH and TDS.

---

## Project layout

```
ARDUINO_WITH_ASSIGNMENT.ino   ESP32 firmware
Backend/                      Django REST API
  aquawatch/                  project settings / urls
  api/                        models, serializers, views for devices/readings
  users/                      custom user model + auth/profile endpoints
  manage.py                   Django management entry point
Frontend/                     React + Vite dashboard
  src/pages/                  one file per screen (overview, sensors, ...)
  src/contexts/               auth, telemetry, toast state
  src/components/ui/          shared UI components
```

---

## Running the backend

### 1. Set up a virtual environment and install packages

```bash
cd Backend
python -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env` or create one with at least:

```
SECRET_KEY=<a long random string>
DEBUG=True
DATABASE_URL=postgresql://user:password@host:5432/aquawatch
```

The project is set up to use Postgres via `dj-database-url`, but you can point
`DATABASE_URL` at a local Postgres or any compatible host. `DEBUG` controls
whether Django serves static files locally.

### 3. Run the migrations and start the server

```bash
python manage.py migrate
python manage.py create_admin        # creates an admin user from ADMIN_USERNAME/ADMIN_PASSWORD
python manage.py runserver
```

The API is now available at `http://localhost:8000/api/`. The Django admin panel
is at `/admin/`.

---

## Running the web dashboard

```bash
cd Frontend
pnpm install
pnpm dev
```

By default the dashboard expects the backend at `http://localhost:8000`. To point
it somewhere else, create a `Frontend/.env` file:

```
VITE_BACKEND_URL=http://localhost:8000
```

The dashboard has a few screens:

- **System Overview** — a live snapshot of the latest reading and the telemetry
  trend, plus a safety status banner.
- **Historical Data** — past readings and a trend chart over a configurable window.
- **Alerts** — active and acknowledged alerts, with the option to acknowledge
  them (silence).
- **Sensors** — the registered monitoring stations, their latest readings, and
  where you assign an Arduino MAC address to a station.
- **Thresholds** — the min/max ranges that trigger a warning or critical alert
  for each parameter.

---

## The ESP32 firmware

The `.ino` sketch is written for an ESP32 with an SH1106 128x64 OLED and a
WiFiManager for initial WiFi setup.

On first boot the ESP32 opens a captive portal (SSID `AquaWatch_AP`). You connect
to it from your phone, enter your WiFi credentials, and the device then joins your
network. You can also edit the backend URL from the portal's settings page.

Once connected, the firmware:

- queries `/api/arduino/assignment/?mac_address=...` to find out which station it
  has been assigned to in the dashboard,
- reads all the sensors and applies a running average / median filter to keep the
  values stable,
- posts the reading to `/api/readings/` in plain text:

```
TEMP:27.1,TDS:77,EC:121,NTU:8.4,PH:7.2,ORP:414,TIER:0
```

Only the pH, temperature, TDS, EC and turbidity values are stored; ORP is sent
along for reference.

---

## A note on scope and limitations

A few things we kept deliberately simple, mainly because of the constraints of a
two-person final year project:

- Sensor calibration is done through the two constant values in the firmware
  (`calibph7` / `calibph4`). In a proper deployment you'd want an in-field
  calibration routine rather than hard-coded numbers.
- Battery level and signal strength aren't reported — the dashboard currently
  has no telemetry for the power/system status of each node.
- Alerts are raised by comparing readings against the configured thresholds;
  there's no push notification service wired up (that's flagged in the roadmap).

---

## Deployment notes

The backend is deployed on **Render** (Gunicorn + Postgres) and the dashboard on
**Vercel**. The `Procfile` runs migrations, creates the admin user, and starts
gunicorn:

```
web: python manage.py migrate --run-syncdb && python manage.py create_admin && gunicorn aquawatch.wsgi:application
```

`vercel.json` handles the Vercel build and SPA rewrites for the frontend.

---

## Tools & libraries

- **ESP32**: Arduino framework, WiFiManager, DallasTemperature, Adafruit SH110X
- **Backend**: Django, Django REST Framework, SimpleJWT, dj-database-url, psycopg2
- **Frontend**: React 18, Vite, wouter (routing), recharts (charts), Tailwind CSS
  with shadcn-style components
