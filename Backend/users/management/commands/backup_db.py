from django.core.management.base import BaseCommand
from django.conf import settings
from django.core import management
import os
from datetime import datetime
import shutil


class Command(BaseCommand):
    help = 'Backup database to a JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default=None,
            help='Output directory for backup file (default: BACKUP_DIR setting or ./backups)'
        )
        parser.add_argument(
            '--compress',
            action='store_true',
            help='Compress backup file with gzip'
        )

    def handle(self, *args, **options):
        # Determine output directory
        output_dir = options['output'] or getattr(settings, 'BACKUP_DIR', os.path.join(settings.BASE_DIR, 'backups'))
        
        # Create backup directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'aquawatch_backup_{timestamp}.json'
        backup_path = os.path.join(output_dir, backup_filename)
        
        self.stdout.write(f'Starting database backup to {backup_path}...')
        
        try:
            # Call Django's dumpdata command
            with open(backup_path, 'w') as f:
                management.call_command('dumpdata', stdout=f, indent=2)
            
            # Compress if requested
            if options['compress']:
                import gzip
                compressed_path = backup_path + '.gz'
                with open(backup_path, 'rb') as f_in:
                    with gzip.open(compressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                os.remove(backup_path)
                backup_path = compressed_path
                self.stdout.write(self.style.SUCCESS(f'Backup compressed: {backup_path}'))
            
            # Get file size
            file_size = os.path.getsize(backup_path) / (1024 * 1024)  # Convert to MB
            
            self.stdout.write(self.style.SUCCESS(
                f'Backup completed successfully!\n'
                f'File: {backup_path}\n'
                f'Size: {file_size:.2f} MB\n'
                f'Timestamp: {timestamp}'
            ))
            
            # Clean up old backups (keep last 10)
            self.cleanup_old_backups(output_dir, keep=10)
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Backup failed: {str(e)}'))
            raise

    def cleanup_old_backups(self, backup_dir, keep=10):
        """Remove old backup files, keeping only the most recent ones."""
        try:
            backup_files = []
            for filename in os.listdir(backup_dir):
                if filename.startswith('aquawatch_backup_') and (filename.endswith('.json') or filename.endswith('.json.gz')):
                    filepath = os.path.join(backup_dir, filename)
                    backup_files.append((filepath, os.path.getmtime(filepath)))
            
            # Sort by modification time (oldest first)
            backup_files.sort(key=lambda x: x[1])
            
            # Remove old backups
            files_to_remove = len(backup_files) - keep
            for i in range(files_to_remove):
                os.remove(backup_files[i][0])
                self.stdout.write(f'Removed old backup: {backup_files[i][0]}')
            
            if files_to_remove > 0:
                self.stdout.write(f'Cleaned up {files_to_remove} old backup files')
                
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Could not clean up old backups: {str(e)}'))
