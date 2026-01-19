"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from backend.elections import views
from backend.elections import citizen_views
from backend.elections import auth_views

router = DefaultRouter()
router.register(r'elections', views.ElectionViewSet, basename='election')
router.register(r'positions', views.PositionViewSet, basename='position')
router.register(r'constituencies', views.ConstituencyViewSet, basename='constituency')
router.register(r'candidates', views.CandidateViewSet, basename='candidate')
router.register(r'polling-stations', views.PollingStationViewSet, basename='pollingstation')
router.register(r'results', views.ResultViewSet, basename='result')
router.register(r'voter-education', views.VoterEducationViewSet, basename='votereducation')
router.register(r'iebc-sync', views.IEBCSyncViewSet, basename='iebcsync')

# Citizen reporting endpoints
router.register(r'station-updates', citizen_views.PollingStationUpdateViewSet, basename='stationupdate')
router.register(r'incidents', citizen_views.IncidentReportViewSet, basename='incident')
router.register(r'verifications', citizen_views.VerificationViewSet, basename='verification')
router.register(r'profile', citizen_views.UserProfileViewSet, basename='profile')

# Media and live streaming endpoints
router.register(r'media', citizen_views.MediaUploadViewSet, basename='media')
router.register(r'livestreams', citizen_views.LiveStreamViewSet, basename='livestream')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    
    # Authentication endpoints
    path('api/auth/register/', auth_views.register, name='auth_register'),
    path('api/auth/login/', auth_views.login, name='auth_login'),
    path('api/auth/logout/', auth_views.logout, name='auth_logout'),
    path('api/auth/me/', auth_views.me, name='auth_me'),
    path('api/auth/update-profile/', auth_views.update_profile, name='auth_update_profile'),
    path('api/auth/change-password/', auth_views.change_password, name='auth_change_password'),
    path('api/auth/token/', obtain_auth_token, name='api_token_auth'),  # Legacy token endpoint
    
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files in development
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
