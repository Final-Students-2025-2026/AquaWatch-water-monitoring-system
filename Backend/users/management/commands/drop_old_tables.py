from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Drop old FastAPI tables to allow Django to recreate them'

    def handle(self, *args, **options):
        tables_to_drop = [
            'users',
            'devices', 
            'sensor_readings',
            'thresholds',
            'alerts',
            'organizations'
        ]
        
        with connection.cursor() as cursor:
            for table in tables_to_drop:
                try:
                    cursor.execute(f'DROP TABLE IF EXISTS {table} CASCADE;')
                    self.stdout.write(self.style.SUCCESS(f'Dropped table: {table}'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Failed to drop {table}: {e}'))
        
        self.stdout.write(self.style.SUCCESS('Old tables dropped successfully'))
