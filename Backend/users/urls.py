from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('me/', views.me, name='me'),
    path('change-password/', views.change_password, name='change_password'),
    path('change-username/', views.change_username, name='change_username'),
    path('change-pin/', views.change_pin, name='change_pin'),
    path('change-email/', views.change_email, name='change_email'),
    path('change-phone/', views.change_phone, name='change_phone'),
    path('change-company-name/', views.change_company_name, name='change_company_name'),
    path('change-location/', views.change_location, name='change_location'),
    path('change-profile-picture/', views.change_profile_picture, name='change_profile_picture'),
]
