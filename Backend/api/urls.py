from django.urls import path
from . import views

urlpatterns = [
    # Device endpoints
    path('devices/', views.DeviceListCreateView.as_view(), name='device-list-create'),
    path('devices/<int:pk>/', views.DeviceDetailView.as_view(), name='device-detail'),
    
    # Sensor reading endpoints
    path('readings/', views.SensorReadingListView.as_view(), name='reading-list'),
    path('readings/latest/', views.get_latest_reading, name='latest-reading'),
    path('readings/history/', views.get_readings_history, name='readings-history'),
    path('readings/export/csv/', views.export_readings_csv, name='export-readings-csv'),
    
    # Threshold endpoints
    path('thresholds/', views.ThresholdListCreateView.as_view(), name='threshold-list-create'),
    path('thresholds/<int:pk>/', views.ThresholdDetailView.as_view(), name='threshold-detail'),
    
    # Alert endpoints
    path('alerts/', views.AlertListView.as_view(), name='alert-list'),
    path('alerts/<int:pk>/', views.AlertDetailView.as_view(), name='alert-detail'),
    
    # Organization endpoints
    path('organizations/', views.OrganizationListView.as_view(), name='organization-list'),
    
    # Dashboard endpoints
    path('dashboard/summary/', views.dashboard_summary, name='dashboard-summary'),
    
    # Analytics endpoints
    path('analytics/summary/', views.analytics_summary, name='analytics-summary'),
]
