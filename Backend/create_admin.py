#!/usr/bin/env python
"""Script to generate Django password hash for admin user."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aquawatch.settings')
django.setup()

from django.contrib.auth.hashers import make_password

# Generate password hash for admin123
password = "admin123"
password_hash = make_password(password)
print(f"Password hash for '{password}':")
print(password_hash)
