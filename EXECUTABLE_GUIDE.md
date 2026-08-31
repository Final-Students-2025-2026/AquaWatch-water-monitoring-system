# AquaWatch — Executable / Run Guide

This folder contains everything needed to run the **AquaWatch IoT Water Quality
Monitoring System** on a single machine, without installing a separate web
server or Node toolchain.

> AquaWatch was built as a two-person team project by:
> **Dennis Opoku Amponsah** (backend, IoT firmware, deployment) and
> **Okoi Ampomaa Judith** (frontend dashboard, visualization).

---

## What this package contains

| Component | Description |
|-----------|-------------|
| `RUN.bat` / `RUN.sh` | One-click launcher that sets everything up and starts the app |
| `Backend/` | Django REST API (models, endpoints, authentication) |
| `Backend/frontend_build/` | The pre-built web dashboard served by Django |
| `ARDUINO_WITH_ASSIGNMENT.ino` | The ESP32 firmware for the sampling station |
| `Backend/API_DOCUMENTATION.md` | Full API reference |
| `README.md` | Full project documentation |

---

## How to run it (Windows)

1. Make sure **Python 3.10+** is installed (tick "Add Python to PATH").
2. Double-click **`RUN.bat`**.
3. The script will:
   - create a Python virtual environment,
   - install the dependencies,
   - set up the database,
   - start the server.
4. Open your browser at **http://localhost:8000** and log in.

### macOS / Linux

```
chmod +x RUN.sh
./RUN.sh
```

Then open **http://localhost:8000**.

---

## Login details

An admin account is created on first run. By default (set in `Backend/.env`):

- Username: **admin**
- Password: **admin123**

> Change the password after first login from the Settings panel.

---

## Architecture

The app runs as **one server** at `http://localhost:8000`:

- `/api/*` → Django REST backend (JSON endpoints)
- `/admin/` → Django admin panel
- everything else → the React web dashboard (served as static files)

The database used here is **PostgreSQL** (Neon) via `DATABASE_URL` in
`Backend/.env`. For an offline/demo run you can point `DATABASE_URL` at a local
Postgres instance or use SQLite by commenting out the `DATABASE_URL` line — see
`Backend/.env.example`.

---

## The system in action

1. The **ESP32** reads temperature, pH, TDS, EC and turbidity from the river.
2. It posts each reading to `POST /api/readings/` every few seconds.
3. The **dashboard** polls `GET /api/readings/latest/` and shows live values,
   charts, alerts and thresholds.
4. Alerts trigger automatically when a parameter leaves its safe range.

---

## Performance note

To make the dashboard show data as soon as the page loads:

- The backend caches the frequently-polled "latest reading" endpoint and uses
  database indexes on the readings/alerts tables.
- The frontend uses React Query to cache device, alert and history data and load
  them in parallel, so returning to a page is instant.

---

## Rebuilding the dashboard (optional)

If you change the frontend code and want to update the served build:

```
cd Frontend
pnpm install
pnpm build
```

Then copy the new build into the server's static folder:

```
cp -r Frontend/dist/* Backend/frontend_build/
```

(On Windows use `xcopy Frontend\dist Backend\frontend_build\ /E /I /Y`.)
