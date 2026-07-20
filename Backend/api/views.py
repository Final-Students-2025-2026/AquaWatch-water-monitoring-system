from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Q
from django.http import HttpResponse
from datetime import datetime, timezone, timedelta
from django.utils import timezone as django_timezone
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

    def get_permissions(self):
        """Return different permissions based on request method."""
        if self.request.method == 'GET':
            return [AllowAny()]  # Allow public read access to devices
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Automatically assign organization if not provided."""
        # Get or create default organization
        from .models import Organization
        org, _ = Organization.objects.get_or_create(
            organization_name="Default Organization",
            defaults={'description': 'Default organization for AquaWatch'}
        )
        # If organization not provided in request, use default
        if 'organization' not in self.request.data:
            serializer.save(organization=org, is_active=True)
        else:
            serializer.save(is_active=True)


class DeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        """Soft delete by setting is_active=False instead of hard delete."""
        device = self.get_object()
        device.is_active = False
        device.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Sensor Reading Views
class SensorReadingListView(generics.ListCreateAPIView):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """Return different permissions based on request method."""
        if self.request.method == 'POST':
            return [AllowAny()]
        if self.request.method == 'GET':
            return [AllowAny()]  # Allow public read access to sensor data
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
            print(f"DEBUG POST: Received data: {data_str}")
            data_dict = {}
            
            for item in data_str.split(','):
                if ':' in item:
                    key, value = item.split(':', 1)
                    data_dict[key.strip()] = value.strip()
            
            print(f"DEBUG POST: Parsed data: {data_dict}")
            
            # Get or create device (default to device_id=1 for Arduino)
            device_id = request.query_params.get('device_id', 1)
            print(f"DEBUG POST: device_id from query: {device_id}")
            
            # Get or create organization first
            org, _ = Organization.objects.get_or_create(
                organization_id=1,
                defaults={
                    'organization_name': "Default Organization",
                    'organization_type': "Default"
                }
            )
            
            # Get device using numeric device_id directly
            try:
                device = Device.objects.get(id=device_id)
                # Ensure device is active when Arduino posts to it
                if not device.is_active:
                    device.is_active = True
                    device.save()
                print(f"DEBUG POST: Found device ID: {device.id}")
            except Device.DoesNotExist:
                # Fallback to device_code if numeric ID not found
                device_code = f"ARDUINO_{device_id}"
                device, created = Device.objects.get_or_create(
                    device_code=device_code,
                    defaults={
                        'device_name': f"Arduino Device {device_id}",
                        'device_type': "IoT Sensor",
                        'organization': org,
                        'is_active': True  # Ensure new devices are active
                    }
                )
                print(f"DEBUG POST: Created device from code, ID: {device.id}")
            
            # Map Arduino fields to model fields
            reading = SensorReading.objects.create(
                device=device,
                temperature_celsius=float(data_dict.get('TEMP', 0)),
                tds_value=float(data_dict.get('TDS', 0)),
                ec_value=float(data_dict.get('EC', 0)),
                turbidity_value=float(data_dict.get('NTU', 0)),
                ph_value=float(data_dict.get('PH', 0)),
                is_alert=int(data_dict.get('TIER', 0)) > 0,
                alert_reason=f"TIER: {data_dict.get('TIER', 0)}, ORP: {data_dict.get('ORP', 0)}" if int(data_dict.get('TIER', 0)) > 0 else None
            )
            
            print(f"DEBUG POST: Created reading ID: {reading.id}, timestamp: {reading.reading_timestamp}")
            
            return Response(
                {'status': 'success', 'reading_id': reading.id},
                status=status.HTTP_201_CREATED
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
    """Get the latest reading for a device. Returns most recent by timestamp."""
    device_id = request.query_params.get('device_id')
    if not device_id:
        return Response(
            {'detail': 'device_id parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Try to find device by device_code first (ARDUINO_{device_id})
        device_code = f"ARDUINO_{device_id}"
        device = Device.objects.filter(device_code=device_code).first()
        
        # If not found by code, try by id
        if not device:
            device = Device.objects.filter(id=device_id).first()
        
        if not device:
            # Return default values when device not found
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
                'message': f'Device {device_id} not found'
            }, status=status.HTTP_200_OK)
        
        # Debug: Check all readings for this device
        all_readings = SensorReading.objects.filter(device=device)
        print(f"DEBUG: Total readings for device {device_id} (actual device ID: {device.id}): {all_readings.count()}")
        if all_readings.exists():
            latest = all_readings.order_by('-reading_timestamp').first()
            print(f"DEBUG: Latest reading ID: {latest.id}, timestamp: {latest.reading_timestamp}")
            print(f"DEBUG: Last 3 readings: {list(all_readings.order_by('-reading_timestamp')[:3].values('id', 'reading_timestamp', 'tds_value'))}")
        
        reading = SensorReading.objects.filter(device=device).order_by('-reading_timestamp').first()
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


# Arduino Device Assignment Views
@api_view(['GET'])
@permission_classes([AllowAny])
def get_arduino_assigned_device(request):
    """Arduino calls this on startup to get its assigned device_id."""
    mac_address = request.query_params.get('mac_address')
    
    if not mac_address:
        return Response(
            {'error': 'mac_address parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Debug logging
        print(f"DEBUG: Looking for device with MAC: {mac_address}")
        
        # First try without is_active filter to see if device exists
        device_any = Device.objects.filter(arduino_mac_address=mac_address).first()
        if device_any:
            print(f"DEBUG: Found device with MAC, is_active: {device_any.is_active}, device_id: {device_any.id}")
        else:
            print(f"DEBUG: No device found with MAC: {mac_address}")
        
        # Find device assigned to this Arduino MAC address (must be active)
        device = Device.objects.filter(arduino_mac_address=mac_address, is_active=True).first()
        
        if device:
            print(f"DEBUG: Returning assigned device: {device.id}")
            return Response({
                'device_id': device.id,
                'device_name': device.device_name,
                'device_code': device.device_code,
                'assigned': True
            })
        else:
            print(f"DEBUG: No active device assigned for MAC: {mac_address}")
            return Response({
                'assigned': False,
                'message': 'No device assigned to this Arduino. Please assign via dashboard.'
            })
    except Exception as e:
        return Response(
            {'error': f'Error getting assigned device: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_arduino_to_device(request):
    """Assign Arduino to a device via dashboard."""
    device_id = request.data.get('device_id')
    mac_address = request.data.get('mac_address')
    
    if not device_id or not mac_address:
        return Response(
            {'error': 'device_id and mac_address are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Remove Arduino from any previous device assignment
        Device.objects.filter(arduino_mac_address=mac_address).update(arduino_mac_address=None)
        
        # Assign Arduino to the specified device
        device = Device.objects.get(id=device_id)
        device.arduino_mac_address = mac_address
        device.save()
        
        return Response({
            'success': True,
            'message': f'Arduino assigned to device {device.device_name}',
            'device_id': device.id
        })
    except Device.DoesNotExist:
        return Response(
            {'error': 'Device not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Error assigning Arduino: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unassign_arduino(request):
    """Remove Arduino assignment from a device."""
    device_id = request.data.get('device_id')
    
    if not device_id:
        return Response(
            {'error': 'device_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        device = Device.objects.get(id=device_id)
        mac_address = device.arduino_mac_address
        
        if mac_address:
            device.arduino_mac_address = None
            device.save()
            return Response({
                'success': True,
                'message': 'Arduino unassigned from device'
            })
        else:
            return Response({
                'success': False,
                'message': 'No Arduino assigned to this device'
            })
    except Device.DoesNotExist:
        return Response(
            {'error': 'Device not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Error unassigning Arduino: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
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


# Arduino Device Assignment Views
@api_view(['GET'])
@permission_classes([AllowAny])
def get_arduino_assigned_device(request):
    """Arduino calls this on startup to get its assigned device_id."""
    mac_address = request.query_params.get('mac_address')
    
    if not mac_address:
        return Response(
            {'error': 'mac_address parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Debug logging
        print(f"DEBUG: Looking for device with MAC: {mac_address}")
        
        # First try without is_active filter to see if device exists
        device_any = Device.objects.filter(arduino_mac_address=mac_address).first()
        if device_any:
            print(f"DEBUG: Found device with MAC, is_active: {device_any.is_active}, device_id: {device_any.id}")
        else:
            print(f"DEBUG: No device found with MAC: {mac_address}")
        
        # Find device assigned to this Arduino MAC address (must be active)
        device = Device.objects.filter(arduino_mac_address=mac_address, is_active=True).first()
        
        if device:
            print(f"DEBUG: Returning assigned device: {device.id}")
            return Response({
                'device_id': device.id,
                'device_name': device.device_name,
                'device_code': device.device_code,
                'assigned': True
            })
        else:
            print(f"DEBUG: No active device assigned for MAC: {mac_address}")
            return Response({
                'assigned': False,
                'message': 'No device assigned to this Arduino. Please assign via dashboard.'
            })
    except Exception as e:
        return Response(
            {'error': f'Error getting assigned device: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_arduino_to_device(request):
    """Assign Arduino to a device via dashboard."""
    device_id = request.data.get('device_id')
    mac_address = request.data.get('mac_address')
    
    if not device_id or not mac_address:
        return Response(
            {'error': 'device_id and mac_address are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Remove Arduino from any previous device assignment
        Device.objects.filter(arduino_mac_address=mac_address).update(arduino_mac_address=None)
        
        # Assign Arduino to the specified device
        device = Device.objects.get(id=device_id)
        device.arduino_mac_address = mac_address
        device.save()
        
        return Response({
            'success': True,
            'message': f'Arduino assigned to device {device.device_name}',
            'device_id': device.id
        })
    except Device.DoesNotExist:
        return Response(
            {'error': 'Device not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Error assigning Arduino: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unassign_arduino(request):
    """Remove Arduino assignment from a device."""
    device_id = request.data.get('device_id')
    
    if not device_id:
        return Response(
            {'error': 'device_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        device = Device.objects.get(id=device_id)
        mac_address = device.arduino_mac_address
        
        if mac_address:
            device.arduino_mac_address = None
            device.save()
            return Response({
                'success': True,
                'message': 'Arduino unassigned from device'
            })
        else:
            return Response({
                'success': False,
                'message': 'No Arduino assigned to this device'
            })
    except Device.DoesNotExist:
        return Response(
            {'error': 'Device not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Error unassigning Arduino: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
