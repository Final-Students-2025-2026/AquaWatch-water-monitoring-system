# AquaWatch — Desktop Application (Windows .exe)

This is the **standalone desktop build** of the AquaWatch dashboard. It is a
portable Windows executable — no installation required.

## The deliverable

- **`release/AquaWatch-1.0.0.exe`** — a single, double-clickable Windows program
  (~69 MB) that opens the AquaWatch dashboard in its own desktop window.

This is a genuine **executable file** (`.exe`), which is what the project
supervisor asked for.

## How to run it

1. Copy **`AquaWatch-1.0.0.exe`** to any Windows PC (Windows 10/11, 64-bit).
2. **Double-click** it.
3. The AquaWatch dashboard opens in a desktop window.
4. Log in with the demo credentials (**admin / admin123**).

> The app loads live data from the deployed AquaWatch backend over the internet,
> so the PC needs an internet connection to display readings.

## What's inside

The exe bundles the fully built React dashboard (all JS/CSS/images) plus a
small local web server that powers the app window. It talks to the AquaWatch
API (`https://aquawatch-188s.onrender.com`) to fetch live sensor readings,
history, alerts and thresholds — the same data shown in the web version.

## Rebuilding the exe (optional, for the team)

```bash
cd desktop
npm install
pnpm --dir ../Frontend build          # or: cd ../Frontend && pnpm build
# copy the new build into the desktop app
rm -rf desktop/web && cp -r ../Frontend/dist desktop/web
npm run dist                          # outputs release/AquaWatch-1.0.0.exe
```

## Note

AquaWatch was developed as a two-person final year project by
**Dennis Opoku Amponsah** and **Okoi Ampomaa Judith**.
