from django.db import models
from django.conf import settings


class Organization(models.Model):
    organization_id = models.AutoField(primary_key=True)
    organization_name = models.CharField(max_length=255)
    organization_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'organizations'
        verbose_name = 'Organization'
        verbose_name_plural = 'Organizations'

    def __str__(self):
        return self.organization_name


class Device(models.Model):
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    device_name = models.CharField(max_length=255)
    device_code = models.CharField(max_length=100, unique=True)
    device_type = models.CharField(max_length=100)
    location = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    arduino_mac_address = models.CharField(max_length=100, blank=True, null=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'devices'
        verbose_name = 'Device'
        verbose_name_plural = 'Devices'

    def __str__(self):
        return self.device_name


class SensorReading(models.Model):
    id = models.AutoField(primary_key=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    reading_timestamp = models.DateTimeField(auto_now_add=True)
    ph_value = models.FloatField()
    turbidity_value = models.FloatField()
    tds_value = models.FloatField()
    temperature_celsius = models.FloatField()
    ec_value = models.FloatField()
    is_alert = models.BooleanField(default=False)
    alert_reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'sensor_readings'
        verbose_name = 'Sensor Reading'
        verbose_name_plural = 'Sensor Readings'
        ordering = ['-reading_timestamp']

    def __str__(self):
        return f"Reading {self.reading_id} - {self.reading_timestamp}"


class Threshold(models.Model):
    threshold_id = models.AutoField(primary_key=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    sensor_type = models.CharField(max_length=50)  # ph, turbidity, tds, temperature, ec
    min_value = models.FloatField()
    max_value = models.FloatField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'thresholds'
        verbose_name = 'Threshold'
        verbose_name_plural = 'Thresholds'
        unique_together = ['device', 'sensor_type']

    def __str__(self):
        return f"{self.device.device_name} - {self.sensor_type}"


class Alert(models.Model):
    alert_id = models.AutoField(primary_key=True)
    reading = models.ForeignKey(SensorReading, on_delete=models.CASCADE)
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    alert_type = models.CharField(max_length=100)
    alert_message = models.TextField()
    severity = models.CharField(max_length=50)  # low, medium, high, critical
    status = models.CharField(max_length=50, default='active')  # active, silenced, resolved
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'alerts'
        verbose_name = 'Alert'
        verbose_name_plural = 'Alerts'
        ordering = ['-created_at']

    def __str__(self):
        return f"Alert {self.alert_id} - {self.alert_type}"
