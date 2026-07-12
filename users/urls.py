from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('me/', views.me, name='me'),
    path('change-password/', views.change_password, name='change_password'),
    path('change-username/', views.change_username, name='change_username'),
    path('change-pin/', views.change_pin, name='change_pin'),
]
