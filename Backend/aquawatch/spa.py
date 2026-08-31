"""Helper view that serves the built React dashboard from Django.

This lets the whole AquaWatch app run from a single server (one command)
instead of needing a separate Vite/Node process. The React build is placed
under Backend/frontend_build/ by the run scripts, and Django serves it here
as a static SPA.
"""
import os
from pathlib import Path

from django.http import HttpResponse, HttpResponseNotFound
from django.contrib.staticfiles import finders

BACKEND_DIR = Path(__file__).resolve().parent.parent
BUILD_DIR = BACKEND_DIR / "frontend_build"


def frontend(request, path=""):
    """Serve the built SPA. Returns index.html for any non-API route so the
    React router can handle client-side navigation."""
    # Only serve the SPA for browser (GET/HEAD) page requests, not the API.
    if path.startswith("api/") or path == "api":
        return HttpResponseNotFound("Not found")

    candidate = (BUILD_DIR / path).resolve() if path else BUILD_DIR / "index.html"

    # Guard against path traversal.
    try:
        candidate.relative_to(BUILD_DIR.resolve())
    except ValueError:
        candidate = BUILD_DIR / "index.html"

    if candidate.is_file() and (candidate.parent == BUILD_DIR.resolve() or BUILD_DIR.resolve() in candidate.parents):
        content_type = {
            ".html": "text/html",
            ".js": "application/javascript",
            ".css": "text/css",
            ".json": "application/json",
            ".png": "image/png",
            ".jpeg": "image/jpeg",
            ".jpg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
            ".txt": "text/plain",
            ".webp": "image/webp",
        }.get(candidate.suffix.lower(), "application/octet-stream")
        with open(candidate, "rb") as f:
            return HttpResponse(f.read(), content_type=content_type)

    # Fall back to index.html for client-side routes (SPA rewrite).
    index = BUILD_DIR / "index.html"
    if index.is_file():
        with open(index, "rb") as f:
            return HttpResponse(f.read(), content_type="text/html")

    return HttpResponseNotFound("Frontend build not found. Run the setup script first.")


def frontend_index(request):
    return frontend(request, "")
