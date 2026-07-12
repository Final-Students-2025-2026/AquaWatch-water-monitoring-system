from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Create default admin user if not exists'

    def handle(self, *args, **options):
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'Admin user "{username}" already exists'))
            return
        
        user = User.objects.create_superuser(
            username=username,
            email='',
            password=password
        )
        self.stdout.write(self.style.SUCCESS(f'Successfully created admin user "{username}"'))
