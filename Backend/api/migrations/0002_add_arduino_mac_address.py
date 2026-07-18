# Generated migration for Arduino MAC address assignment

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0001_initial'),  # This should reference your existing initial migration
    ]

    operations = [
        migrations.AddField(
            model_name='device',
            name='arduino_mac_address',
            field=models.CharField(max_length=100, blank=True, null=True, unique=True),
        ),
    ]
