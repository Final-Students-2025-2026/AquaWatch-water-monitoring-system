from rest_framework import serializers
from .models import Organization, Device, SensorReading, Threshold, Alert


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'


class DeviceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.organization_name', read_only=True)
    device_id = serializers.IntegerField(source='id', read_only=True)
    arduino_mac_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    organization = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=Organization.objects.all())
    
    def validate_arduino_mac_address(self, value):
        """Allow None and empty strings, but validate uniqueness only if provided."""
        if value:
            existing = Device.objects.filter(arduino_mac_address=value).first()
            if existing and (not self.instance or existing.id != self.instance.id):
                raise serializers.ValidationError("A device with this MAC address already exists.")
        return value
    
    class Meta:
        model = Device
        fields = ['device_id', 'organization', 'organization_name', 'device_name', 'device_code', 
                  'device_type', 'location', 'is_active', 'arduino_mac_address', 'created_at', 'updated_at']
        read_only_fields = ['device_id', 'created_at', 'updated_at']


class SensorReadingSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_code = serializers.CharField(source='device.device_code', read_only=True)
    reading_id = serializers.IntegerField(source='id', read_only=True)
    device_id = serializers.IntegerField(source='device.id', read_only=True)
    
    class Meta:
        model = SensorReading
        fields = ['reading_id', 'device', 'device_id', 'device_name', 'device_code', 'reading_timestamp',
                  'ph_value', 'turbidity_value', 'tds_value', 'temperature_celsius', 
                  'ec_value', 'is_alert', 'alert_reason']
        read_only_fields = ['reading_id', 'reading_timestamp']


class ThresholdSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    
    class Meta:
        model = Threshold
        fields = ['threshold_id', 'device', 'device_name', 'sensor_type', 'min_value', 
                  'max_value', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['threshold_id', 'created_at', 'updated_at']


class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_code = serializers.CharField(source='device.device_code', read_only=True)
    
    class Meta:
        model = Alert
        fields = ['alert_id', 'reading', 'device', 'device_name', 'device_code', 'alert_type',
                  'alert_message', 'severity', 'status', 'created_at', 'updated_at']
        read_only_fields = ['alert_id', 'created_at', 'updated_at']
