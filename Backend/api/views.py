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


# ────────────────────────── Device CRUD ──────────────────────────


class DeviceListCreateView(generics.ListCreateAPIView):
    queryset = Device.objects.filter(is_active=True)
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Assign device to the user's org (or a default one)."""
        from .models import Organization
        try:
            org = None
            if hasattr(self.request.user, 'organization_id') and self.request.user.organization_id:
                try:
                    org = Organization.objects.get(organization_id=self.request.user.organization_id)
                except Organization.DoesNotExist:
                    pass
            
            if not org:
                org, _ = Organization.objects.get_or_create(
                    organization_name="Default Organization",
                    defaults={'description': 'Default organization for AquaWatch'}
                )
            
            if 'organization' not in self.request.data:
                device = serializer.save(organization=org, is_active=True)
            else:
                device = serializer.save(is_active=True)
        except Exception as e:
            raise


class DeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: mark inactive instead of removing row."""
        device = self.get_object()
        device.is_active = False
        device.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ────────────────────────── Sensor Readings ──────────────────────────


class SensorReadingListView(generics.ListCreateAPIView):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        device_id = self.request.query_params.get('device_id')
        if device_id:
            return SensorReading.objects.filter(device_id=device_id)
        return SensorReading.objects.all()

    def create(self, request, *args, **kwargs):
        """
        Accept a plain-text POST body from the Arduino:
          "TEMP:24.5,TDS:120,EC:180,NTU:5.2,PH:7.1,TIER:0,ORP:230"
        Look up the device by mac_address or device_id query param.
        """
        try:
            data_str = request.body.decode('utf-8')
            data_dict = {}
            
            for item in data_str.split(','):
                if ':' in item:
                    key, value = item.split(':', 1)
                    data_dict[key.strip()] = value.strip()
            
            mac_address = request.query_params.get('mac_address')
            device_id = request.query_params.get('device_id')
            
            org, _ = Organization.objects.get_or_create(
                organization_id=1,
                defaults={
                    'organization_name': "Default Organization",
                    'organization_type': "Default"
                }
            )
            
            device = None
            
            if mac_address:
                try:
                    device = Device.objects.get(arduino_mac_address=mac_address)
                    if not device.is_active:
                        device.is_active = True
                        device.save()
                except Device.DoesNotExist:
                    return Response(
                        {'status': 'error', 'message': f'No device found with MAC address: {mac_address}'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            elif device_id:
                try:
                    device = Device.objects.get(id=device_id)
                    if not device.is_active:
                        device.is_active = True
                        device.save()
                except Device.DoesNotExist:
                    # Auto-register unknown Arduino by numeric ID
                    device_code = f"ARDUINO_{device_id}"
                    device, created = Device.objects.get_or_create(
                        device_code=device_code,
                        defaults={
                            'device_name': f"Arduino Device {device_id}",
                            'device_type': "IoT Sensor",
                            'organization': org,
                            'is_active': True
                        }
                    )
            else:
                return Response(
                    {'status': 'error', 'message': 'Either mac_address or device_id parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
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
            
            return Response(
                {'status': 'success', 'reading_id': reading.id},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ────────────────────────── Latest Reading ──────────────────────────


@api_view(['GET'])
@permission_classes([AllowAny])
def get_latest_reading(request):
    device_id = request.query_params.get('device_id')
    if not device_id:
        return Response(
            {'detail': 'device_id parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        device_code = f"ARDUINO_{device_id}"
        device = Device.objects.filter(device_code=device_code).first()
        
        if not device:
            device = Device.objects.filter(id=device_id).first()
        
        if not device:
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
        
        reading = SensorReading.objects.filter(device=device).order_by('-reading_timestamp').first()
        if not reading:
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


# ────────────────────────── Readings History ──────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_readings_history(request):
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
        return Response({
            'data': [],
            'message': f'Error retrieving readings history: {str(e)}'
        }, status=status.HTTP_200_OK)


# ────────────────────────── Thresholds ──────────────────────────


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


# ────────────────────────── Alerts ──────────────────────────


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


# ────────────────────────── Organizations ──────────────────────────


class OrganizationListView(generics.ListAPIView):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]


# ────────────────────────── Dashboard & Export ──────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    try:
        total_devices = Device.objects.filter(is_active=True).count()
        active_alerts = Alert.objects.filter(status='active').count()
        total_readings = SensorReading.objects.count()
        
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
        return Response({
            'total_devices': 0,
            'active_alerts': 0,
            'total_readings': 0,
            'latest_reading': None,
            'message': f'Error retrieving dashboard summary: {str(e)}'
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_readings_csv(request):
    """Stream the recent readings out as a downloadable CSV file."""
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


# ────────────────────────── Arduino Assignment ──────────────────────────


@api_view(['GET'])
@permission_classes([AllowAny])
def get_arduino_assigned_device(request):
    mac_address = request.query_params.get('mac_address')
    
    if not mac_address:
        return Response(
            {'error': 'mac_address parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        device = Device.objects.filter(arduino_mac_address=mac_address, is_active=True).first()
        
        if device:
            return Response({
                'device_id': device.id,
                'device_name': device.device_name,
                'device_code': device.device_code,
                'assigned': True
            })
        else:
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
    device_id = request.data.get('device_id')
    mac_address = request.data.get('mac_address')
    
    if not device_id or not mac_address:
        return Response(
            {'error': 'device_id and mac_address are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        Device.objects.filter(arduino_mac_address=mac_address).update(arduino_mac_address=None)
        
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


# ────────────────────────── Analytics ──────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_summary(request):
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
