from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
import os

from . import spa

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/', include('api.urls')),
]

# Serve the built React dashboard (single-server mode).
if not settings.DEBUG or os.environ.get('SERVE_FRONTEND', '') == '1':
    urlpatterns += [
        path('', spa.frontend_index, name='frontend-index'),
        re_path(r'^(?P<path>.*)$', spa.frontend, name='frontend'),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
