#!/usr/bin/env python
"""Run Django development server or Gunicorn for production."""
import os
import sys

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aquawatch.settings')
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Check if running in production (Render)
    if os.environ.get('RENDER'):
        # Use Gunicorn for production
        import subprocess
        subprocess.run(['gunicorn', 'aquawatch.wsgi:application', '--bind', '0.0.0.0:8000'])
    else:
        # Use Django's development server
        execute_from_command_line(sys.argv)
