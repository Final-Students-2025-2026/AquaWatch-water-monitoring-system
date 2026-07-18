from django.core.management.base import BaseCommand
from django.conf import settings
from django.core import management
import os
import gzip
import shutil


class Command(BaseCommand):
    help = 'Restore database from a JSON backup file'

    def add_arguments(self, parser):
        parser.add_argument(
            'backup_file',
            type=str,
            help='Path to the backup file to restore'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompt'
        )

    def handle(self, *args, **options):
        backup_file = options['backup_file']
        
        # Check if backup file exists
        if not os.path.exists(backup_file):
            self.stdout.write(self.style.ERROR(f'Backup file not found: {backup_file}'))
            return
        
        # Handle compressed backups
        temp_file = None
        if backup_file.endswith('.gz'):
            temp_file = backup_file[:-3]  # Remove .gz extension
            self.stdout.write(f'Decompressing backup to {temp_file}...')
            
            try:
                with gzip.open(backup_file, 'rb') as f_in:
                    with open(temp_file, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                file_to_restore = temp_file
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Decompression failed: {str(e)}'))
                return
        else:
            file_to_restore = backup_file
        
        # Confirm restoration
        if not options['confirm']:
            confirm = input(f'Are you sure you want to restore from {backup_file}? This will replace existing data. Type "yes" to confirm: ')
            if confirm.lower() != 'yes':
                self.stdout.write('Restore cancelled.')
                if temp_file:
                    os.remove(temp_file)
                return
        
        self.stdout.write(f'Starting database restore from {file_to_restore}...')
        
        try:
            # Call Django's loaddata command
            with open(file_to_restore, 'r') as f:
                management.call_command('loaddata', file_to_restore, stdout=f)
            
            self.stdout.write(self.style.SUCCESS(
                f'Database restored successfully from {backup_file}'
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Restore failed: {str(e)}'))
            raise
        finally:
            # Clean up temporary decompressed file
            if temp_file and os.path.exists(temp_file):
                os.remove(temp_file)
                self.stdout.write(f'Cleaned up temporary file: {temp_file}')
