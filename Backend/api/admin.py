from django.contrib import admin
from .models import Organization, Device, SensorReading, Threshold, Alert


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['organization_id', 'organization_name', 'organization_type', 'created_at']
    search_fields = ['organization_name', 'organization_type']


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['device_id', 'device_name', 'device_code', 'device_type', 'organization', 'is_active', 'created_at']
    list_filter = ['is_active', 'device_type', 'organization']
    search_fields = ['device_name', 'device_code', 'location']


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['reading_id', 'device', 'reading_timestamp', 'ph_value', 'turbidity_value', 'tds_value', 'temperature_celsius', 'is_alert']
    list_filter = ['is_alert', 'reading_timestamp', 'device']
    search_fields = ['device__device_name', 'device__device_code']
    date_hierarchy = 'reading_timestamp'


@admin.register(Threshold)
class ThresholdAdmin(admin.ModelAdmin):
    list_display = ['threshold_id', 'device', 'sensor_type', 'min_value', 'max_value', 'is_active', 'created_at']
    list_filter = ['is_active', 'sensor_type', 'device']
    search_fields = ['device__device_name', 'sensor_type']


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['alert_id', 'device', 'alert_type', 'severity', 'status', 'created_at']
    list_filter = ['severity', 'status', 'created_at', 'device']
    search_fields = ['alert_type', 'alert_message', 'device__device_name']
    date_hierarchy = 'created_at'
