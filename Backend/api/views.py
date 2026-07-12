from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Q
from datetime import datetime, timezone, timedelta
from django.utils import timezone as django_timezone

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
class SensorReadingListView(generics.ListAPIView):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        device_id = self.request.query_params.get('device_id')
        if device_id:
            return SensorReading.objects.filter(device_id=device_id)
        return SensorReading.objects.all()


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
