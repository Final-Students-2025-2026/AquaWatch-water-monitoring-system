from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Q
from django.http import HttpResponse
from datetime import datetime, timezone, timedelta
from django.utils import timezone as django_timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
import csv

from .models import Organization, Device, SensorReading, Threshold, Alert
from .serializers import (
    OrganizationSerializer, 
    DeviceSerializer, 
    SensorReadingSerializer, 
    ThresholdSerializer, 
    AlertSerializer
)


# Device Views
class DeviceListCreateView(generics.ListCreateAPIView):
    queryset = Device.objects.filter(is_active=True)
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]


class DeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]


# Sensor Reading Views
class SensorReadingListView(generics.ListCreateAPIView):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """Return different permissions based on request method."""
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        device_id = self.request.query_params.get('device_id')
        if device_id:
            return SensorReading.objects.filter(device_id=device_id)
        return SensorReading.objects.all()

    def create(self, request, *args, **kwargs):
        """Handle Arduino sensor data POST requests."""
        try:
            # Parse plain text format: TEMP:27.1,TDS:77,EC:121,NTU:8.4,PH:0.00,ORP:414,TIER:2
            data_str = request.body.decode('utf-8')
            data_dict = {}
            
            for item in data_str.split(','):
                if ':' in item:
                    key, value = item.split(':', 1)
                    data_dict[key.strip()] = value.strip()
            
            # Validate sensor data ranges
            temp = float(data_dict.get('TEMP', 0))
            ph = float(data_dict.get('PH', 0))
            tds = float(data_dict.get('TDS', 0))
            ec = float(data_dict.get('EC', 0))
            turbidity = float(data_dict.get('NTU', 0))
            
            # Add reasonable range validation
            if not (-50 <= temp <= 100):  # Reasonable temperature range
                raise ValidationError(f"Temperature {temp}°C out of valid range (-50 to 100)")
            if not (0 <= ph <= 14):  # Valid pH range
                raise ValidationError(f"pH {ph} out of valid range (0 to 14)")
            if not (0 <= tds <= 5000):  # Reasonable TDS range
                raise ValidationError(f"TDS {tds} mg/L out of valid range (0 to 5000)")
            if not (0 <= ec <= 5000):  # Reasonable EC range
                raise ValidationError(f"EC {ec} µS/cm out of valid range (0 to 5000)")
            if not (0 <= turbidity <= 100):  # Reasonable turbidity range
                raise ValidationError(f"Turbidity {turbidity} NTU out of valid range (0 to 100)")
            
            # Get or create device (default to device_id=1 for Arduino)
            device_id = request.query_params.get('device_id', 1)
            
            # Get or create organization first
            org, _ = Organization.objects.get_or_create(
                organization_id=1,
                defaults={
                    'organization_name': "Default Organization",
                    'organization_type': "Default"
                }
            )
            
            # Get or create device using device_code instead of device_id
            device_code = f"ARDUINO_{device_id}"
            device, created = Device.objects.get_or_create(
                device_code=device_code,
                defaults={
                    'device_name': f"Arduino Device {device_id}",
                    'device_type': "IoT Sensor",
                    'organization': org
                }
            )
            
            # Map Arduino fields to model fields
            reading = SensorReading.objects.create(
                device=device,
                temperature_celsius=temp,
                tds_value=tds,
                ec_value=ec,
                turbidity_value=turbidity,
                ph_value=ph,
                is_alert=int(data_dict.get('TIER', 0)) > 0,
                alert_reason=f"TIER: {data_dict.get('TIER', 0)}, ORP: {data_dict.get('ORP', 0)}" if int(data_dict.get('TIER', 0)) > 0 else None
            )
            
            return Response(
                {'status': 'success', 'reading_id': reading.id},
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return Response(
                {'status': 'error', 'message': f'Validation error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            return Response(
                {'status': 'error', 'message': str(e), 'details': error_details},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_latest_reading(request):
    """Get the latest reading for a device."""
    device_id = request.query_params.get('device_id')
    if not device_id:
        return Response(
            {'detail': 'device_id parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        reading = SensorReading.objects.filter(device_id=device_id).first()
        if not reading:
            # Return default values when no readings exist
            return Response({
                'reading_id': None,
                'device_id': int(device_id),
                'reading_timestamp': None,
                'ph_value': 0.0,
                'turbidity_value': 0.0,
                'tds_value': 0.0,
                'temperature_celsius': 0.0,
                'ec_value': 0.0,
                'is_alert': False,
                'alert_reason': None,
                'message': f'No readings found for device {device_id}'
            })
        return Response(SensorReadingSerializer(reading).data)
    except Exception as e:
        # Return 200 with error message instead of 500
        return Response({
            'reading_id': None,
            'device_id': int(device_id) if device_id else None,
            'reading_timestamp': None,
            'ph_value': 0.0,
            'turbidity_value': 0.0,
            'tds_value': 0.0,
            'temperature_celsius': 0.0,
            'ec_value': 0.0,
            'is_alert': False,
            'alert_reason': None,
            'message': f'Error retrieving reading: {str(e)}'
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_readings_history(request):
    """Get readings history for a device."""
    device_id = request.query_params.get('device_id')
    hours = int(request.query_params.get('hours', 24))
    
    if not device_id:
        return Response(
            {'detail': 'device_id parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        since = django_timezone.now() - timedelta(hours=hours)
        readings = SensorReading.objects.filter(
            device_id=device_id,
            reading_timestamp__gte=since
        ).order_by('reading_timestamp')
        
        return Response(SensorReadingSerializer(readings, many=True).data)
    except Exception as e:
        # Return 200 with empty array instead of 500
        return Response({
            'data': [],
            'message': f'Error retrieving readings history: {str(e)}'
        }, status=status.HTTP_200_OK)


# Threshold Views
class ThresholdListCreateView(generics.ListCreateAPIView):
    serializer_class = ThresholdSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        device_id = self.request.query_params.get('device_id')
        if device_id:
            return Threshold.objects.filter(device_id=device_id, is_active=True)
        return Threshold.objects.filter(is_active=True)


class ThresholdDetailView(generics.RetrieveUpdateAPIView):
    queryset = Threshold.objects.all()
    serializer_class = ThresholdSerializer
    permission_classes = [IsAuthenticated]


# Alert Views
class AlertListView(generics.ListAPIView):
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        device_id = self.request.query_params.get('device_id')
        status_filter = self.request.query_params.get('status')
        
        queryset = Alert.objects.all()
        if device_id:
            queryset = queryset.filter(device_id=device_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')


class AlertDetailView(generics.RetrieveUpdateAPIView):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]


# Organization Views
class OrganizationListView(generics.ListAPIView):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]


# Dashboard Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Get dashboard summary statistics."""
    try:
        total_devices = Device.objects.filter(is_active=True).count()
        active_alerts = Alert.objects.filter(status='active').count()
        total_readings = SensorReading.objects.count()
        
        # Get latest reading
        latest_reading = SensorReading.objects.first()
        latest_data = None
        if latest_reading:
            latest_data = SensorReadingSerializer(latest_reading).data
        
        return Response({
            'total_devices': total_devices,
            'active_alerts': active_alerts,
            'total_readings': total_readings,
            'latest_reading': latest_data
        })
    except Exception as e:
        # Return 200 with default values instead of 500
        return Response({
            'total_devices': 0,
            'active_alerts': 0,
            'total_readings': 0,
            'latest_reading': None,
            'message': f'Error retrieving dashboard summary: {str(e)}'
        }, status=status.HTTP_200_OK)


# Data Export Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_readings_csv(request):
    """Export sensor readings to CSV file."""
    device_id = request.query_params.get('device_id')
    hours = int(request.query_params.get('hours', 24))
    
    try:
        since = django_timezone.now() - timedelta(hours=hours)
        readings = SensorReading.objects.all()
        
        if device_id:
            readings = readings.filter(device_id=device_id)
        
        readings = readings.filter(reading_timestamp__gte=since).order_by('reading_timestamp')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="sensor_readings_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'Device ID', 'Device Name', 'Temperature (°C)', 'pH', 'TDS (mg/L)', 'EC (μS/cm)', 'Turbidity (NTU)', 'Alert', 'Alert Reason'])
        
        for reading in readings:
            writer.writerow([
                reading.reading_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                reading.device.id,
                reading.device.device_name,
                reading.temperature_celsius,
                reading.ph_value,
                reading.tds_value,
                reading.ec_value,
                reading.turbidity_value,
                'Yes' if reading.is_alert else 'No',
                reading.alert_reason or ''
            ])
        
        return response
    except Exception as e:
        return Response(
            {'error': f'Error exporting data: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Analytics Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_summary(request):
    """Get analytics summary for sensor data."""
    device_id = request.query_params.get('device_id')
    hours = int(request.query_params.get('hours', 24))
    
    try:
        since = django_timezone.now() - timedelta(hours=hours)
        readings = SensorReading.objects.filter(reading_timestamp__gte=since)
        
        if device_id:
            readings = readings.filter(device_id=device_id)
        
        if not readings.exists():
            return Response({
                'message': 'No data available for the specified period',
                'statistics': {}
            })
        
        # Calculate statistics
        readings_list = list(readings)
        
        stats = {
            'total_readings': len(readings_list),
            'temperature': {
                'min': min(r.temperature_celsius for r in readings_list),
                'max': max(r.temperature_celsius for r in readings_list),
                'avg': sum(r.temperature_celsius for r in readings_list) / len(readings_list),
                'current': readings_list[-1].temperature_celsius if readings_list else None
            },
            'ph': {
                'min': min(r.ph_value for r in readings_list),
                'max': max(r.ph_value for r in readings_list),
                'avg': sum(r.ph_value for r in readings_list) / len(readings_list),
                'current': readings_list[-1].ph_value if readings_list else None
            },
            'tds': {
                'min': min(r.tds_value for r in readings_list),
                'max': max(r.tds_value for r in readings_list),
                'avg': sum(r.tds_value for r in readings_list) / len(readings_list),
                'current': readings_list[-1].tds_value if readings_list else None
            },
            'ec': {
                'min': min(r.ec_value for r in readings_list),
                'max': max(r.ec_value for r in readings_list),
                'avg': sum(r.ec_value for r in readings_list) / len(readings_list),
                'current': readings_list[-1].ec_value if readings_list else None
            },
            'turbidity': {
                'min': min(r.turbidity_value for r in readings_list),
                'max': max(r.turbidity_value for r in readings_list),
                'avg': sum(r.turbidity_value for r in readings_list) / len(readings_list),
                'current': readings_list[-1].turbidity_value if readings_list else None
            },
            'alerts': {
                'total': sum(1 for r in readings_list if r.is_alert),
                'percentage': (sum(1 for r in readings_list if r.is_alert) / len(readings_list)) * 100 if readings_list else 0
            },
            'time_period': {
                'start': since.isoformat(),
                'end': django_timezone.now().isoformat(),
                'hours': hours
            }
        }
        
        return Response({'statistics': stats})
        
    except Exception as e:
        return Response(
            {'error': f'Error generating analytics: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
