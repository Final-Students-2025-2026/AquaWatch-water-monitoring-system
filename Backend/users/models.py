from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model for AquaWatch system."""
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(unique=True, blank=True, null=True)
    company_name = models.CharField(max_length=200, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    pin = models.CharField(max_length=6, blank=True, null=True)
    profile_picture = models.TextField(blank=True, null=True)
    organization_id = models.IntegerField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.username
