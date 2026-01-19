"""
Views for citizen reporting features - polling station updates, incidents, media uploads, etc.
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Count, F
from django.utils import timezone
from django.db import transaction

from .models import (
    PollingStationUpdate, IncidentReport, Verification, UserProfile,
    MediaUpload, LiveStream
)
from .serializers import (
    PollingStationUpdateSerializer, IncidentReportSerializer,
    VerificationSerializer, UserProfileSerializer,
    MediaUploadSerializer, MediaUploadCreateSerializer,
    LiveStreamSerializer, LiveStreamCreateSerializer
)


class PollingStationUpdateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for polling station updates submitted by citizens.
    Public can read, authenticated users can submit.
    """
    queryset = PollingStationUpdate.objects.select_related(
        'polling_station', 'election', 'submitted_by', 'verified_by'
    ).all()
    serializer_class = PollingStationUpdateSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['status_notes', 'polling_station__name']
    ordering_fields = ['created_at', 'verification_status']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by election
        election = self.request.query_params.get('election')
        if election:
            queryset = queryset.filter(election_id=election)
        
        # Filter by polling station
        polling_station = self.request.query_params.get('polling_station')
        if polling_station:
            queryset = queryset.filter(polling_station_id=polling_station)
        
        # Filter by verification status
        verification_status = self.request.query_params.get('verification_status')
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status)
        
        # Filter by update type
        update_type = self.request.query_params.get('update_type')
        if update_type:
            queryset = queryset.filter(update_type=update_type)
        
        # Show only verified updates for public, all for authenticated
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(verification_status='verified')
        
        return queryset
    
    def perform_create(self, serializer):
        """Set submitted_by to current user"""
        serializer.save(submitted_by=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify(self, request, pk=None):
        """Verify an update (admin/verified observer only)"""
        update = self.get_object()
        
        if not (request.user.is_staff or request.user.profile.is_verified_observer):
            return Response(
                {'error': 'Only verified observers or admins can verify updates'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        verification_status = request.data.get('status', 'verified')
        verification_notes = request.data.get('notes', '')
        
        if verification_status not in ['verified', 'unverified', 'disputed']:
            return Response(
                {'error': 'Invalid verification status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        update.verification_status = verification_status
        update.verified_by = request.user
        update.verified_at = timezone.now()
        update.verification_notes = verification_notes
        update.save()
        
        # Create verification record
        Verification.objects.create(
            verification_type='update',
            content_object=update,
            status=verification_status,
            verified_by=request.user,
            notes=verification_notes
        )
        
        serializer = self.get_serializer(update)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def live(self, request):
        """Get live updates from the last hour"""
        one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
        live_updates = self.get_queryset().filter(created_at__gte=one_hour_ago)
        
        serializer = self.get_serializer(live_updates, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get statistics about updates"""
        queryset = self.get_queryset()
        
        stats = {
            'total_updates': queryset.count(),
            'verified_updates': queryset.filter(verification_status='verified').count(),
            'pending_verification': queryset.filter(verification_status='pending').count(),
            'by_type': queryset.values('update_type').annotate(count=Count('id')),
            'by_status': queryset.values('verification_status').annotate(count=Count('id')),
        }
        
        return Response(stats)


class IncidentReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for incident reports submitted by citizens.
    Public can read verified incidents, authenticated users can submit.
    """
    queryset = IncidentReport.objects.select_related(
        'election', 'polling_station', 'submitted_by', 'verified_by'
    ).all()
    serializer_class = IncidentReportSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'location_description']
    ordering_fields = ['created_at', 'severity', 'verification_status']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by election
        election = self.request.query_params.get('election')
        if election:
            queryset = queryset.filter(election_id=election)
        
        # Filter by incident type
        incident_type = self.request.query_params.get('incident_type')
        if incident_type:
            queryset = queryset.filter(incident_type=incident_type)
        
        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter by verification status
        verification_status = self.request.query_params.get('verification_status')
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status)
        
        # Show only verified incidents for public, all for authenticated
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(verification_status='verified')
        
        return queryset
    
    def perform_create(self, serializer):
        """Set submitted_by to current user if authenticated, otherwise anonymous"""
        if self.request.user.is_authenticated:
            serializer.save(submitted_by=self.request.user, is_anonymous=False)
        else:
            serializer.save(is_anonymous=True)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify(self, request, pk=None):
        """Verify an incident report (admin/verified observer only)"""
        incident = self.get_object()
        
        if not (request.user.is_staff or request.user.profile.is_verified_observer):
            return Response(
                {'error': 'Only verified observers or admins can verify incidents'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        verification_status = request.data.get('status', 'verified')
        verification_notes = request.data.get('notes', '')
        
        if verification_status not in ['verified', 'unverified', 'disputed', 'resolved']:
            return Response(
                {'error': 'Invalid verification status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        incident.verification_status = verification_status
        incident.verified_by = request.user
        incident.verified_at = timezone.now()
        incident.verification_notes = verification_notes
        incident.save()
        
        # Create verification record
        Verification.objects.create(
            verification_type='incident',
            incident=incident,
            status=verification_status,
            verified_by=request.user,
            notes=verification_notes
        )
        
        serializer = self.get_serializer(incident)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def respond(self, request, pk=None):
        """Mark incident as responded to (admin only)"""
        incident = self.get_object()
        
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admins can mark incidents as responded'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        incident.responded_to = True
        incident.response_notes = request.data.get('response_notes', '')
        incident.save()
        
        serializer = self.get_serializer(incident)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def critical(self, request):
        """Get critical incidents"""
        critical_incidents = self.get_queryset().filter(
            severity='critical',
            verification_status__in=['pending', 'verified']
        )
        
        serializer = self.get_serializer(critical_incidents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get statistics about incidents"""
        queryset = self.get_queryset()
        
        stats = {
            'total_incidents': queryset.count(),
            'verified_incidents': queryset.filter(verification_status='verified').count(),
            'pending_verification': queryset.filter(verification_status='pending').count(),
            'critical_incidents': queryset.filter(severity='critical').count(),
            'by_type': queryset.values('incident_type').annotate(count=Count('id')),
            'by_severity': queryset.values('severity').annotate(count=Count('id')),
            'by_status': queryset.values('verification_status').annotate(count=Count('id')),
        }
        
        return Response(stats)


class VerificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing verification actions.
    Read-only for public, admins can create verifications.
    """
    queryset = Verification.objects.select_related('verified_by').all()
    serializer_class = VerificationSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        verification_type = self.request.query_params.get('verification_type')
        if verification_type:
            queryset = queryset.filter(verification_type=verification_type)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user profiles.
    Users can view/update their own profile, admins can view all.
    """
    queryset = UserProfile.objects.select_related('user').all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own profile unless admin"""
        if self.request.user.is_staff:
            return super().get_queryset()
        return super().get_queryset().filter(user=self.request.user)
    
    def get_object(self):
        """Get or create profile for current user"""
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile
    
    @action(detail=False, methods=['post'])
    def request_otp(self, request):
        """Request OTP for phone verification"""
        phone_number = request.data.get('phone_number')
        
        if not phone_number:
            return Response(
                {'error': 'Phone number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        profile.phone_number = phone_number
        
        # Generate OTP (simple implementation - use proper OTP service in production)
        import random
        otp = str(random.randint(100000, 999999))
        profile.otp_code = otp
        profile.otp_expires_at = timezone.now() + timezone.timedelta(minutes=10)
        profile.save()
        
        # TODO: Send OTP via SMS service (Twilio, etc.)
        # For now, return OTP in response (remove in production!)
        return Response({
            'message': 'OTP sent to phone number',
            'otp': otp  # Remove this in production!
        })
    
    @action(detail=False, methods=['post'])
    def verify_otp(self, request):
        """Verify OTP code"""
        otp_code = request.data.get('otp_code')
        
        if not otp_code:
            return Response(
                {'error': 'OTP code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found. Request OTP first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if profile.otp_code != otp_code:
            return Response(
                {'error': 'Invalid OTP code'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if profile.otp_expires_at < timezone.now():
            return Response(
                {'error': 'OTP code has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile.phone_verified = True
        profile.otp_code = ''
        profile.save()
        
        return Response({'message': 'Phone number verified successfully'})


class MediaUploadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for media uploads (photos, videos, audio).
    Supports file uploads and external URLs.
    """
    queryset = MediaUpload.objects.select_related(
        'uploaded_by', 'polling_station_update', 'incident_report'
    ).all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'media_type']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MediaUploadCreateSerializer
        return MediaUploadSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by media type
        media_type = self.request.query_params.get('media_type')
        if media_type:
            queryset = queryset.filter(media_type=media_type)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by association
        update_id = self.request.query_params.get('polling_station_update')
        if update_id:
            queryset = queryset.filter(polling_station_update_id=update_id)
        
        incident_id = self.request.query_params.get('incident_report')
        if incident_id:
            queryset = queryset.filter(incident_report_id=incident_id)
        
        # Only show approved media for unauthenticated users
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(is_approved=True)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set uploaded_by and process file"""
        upload = serializer.save(
            uploaded_by=self.request.user if self.request.user.is_authenticated else None
        )
        
        # Process the file asynchronously (in production, use Celery)
        if upload.file:
            self._process_media_file(upload)
    
    def _process_media_file(self, upload):
        """Process uploaded media file (generate thumbnails, extract metadata)"""
        import mimetypes
        
        if upload.file:
            # Get mime type
            mime_type, _ = mimetypes.guess_type(upload.file.name)
            upload.mime_type = mime_type or 'application/octet-stream'
            
            # For videos, try to generate thumbnail and get duration
            if upload.media_type == 'video':
                # In production, use ffmpeg or a video processing service
                pass
            
            upload.status = 'ready'
            upload.save()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def moderate(self, request, pk=None):
        """Moderate media content (admin only)"""
        media = self.get_object()
        
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admins can moderate media'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        media.is_moderated = True
        media.is_approved = request.data.get('approved', True)
        media.moderation_notes = request.data.get('notes', '')
        media.save()
        
        serializer = self.get_serializer(media)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent media uploads"""
        recent = self.get_queryset().filter(
            status='ready',
            is_approved=True
        )[:20]
        
        serializer = self.get_serializer(recent, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def videos(self, request):
        """Get recent video uploads"""
        videos = self.get_queryset().filter(
            media_type='video',
            status='ready',
            is_approved=True
        )[:20]
        
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def audio(self, request):
        """Get recent audio uploads"""
        audio = self.get_queryset().filter(
            media_type='audio',
            status='ready',
            is_approved=True
        )[:20]
        
        serializer = self.get_serializer(audio, many=True)
        return Response(serializer.data)


class LiveStreamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for live streams.
    """
    queryset = LiveStream.objects.select_related(
        'created_by', 'election', 'polling_station'
    ).all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'location_description']
    ordering_fields = ['created_at', 'viewer_count', 'started_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action in ['create']:
            return LiveStreamCreateSerializer
        return LiveStreamSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by election
        election = self.request.query_params.get('election')
        if election:
            queryset = queryset.filter(election_id=election)
        
        # Filter by stream type
        stream_type = self.request.query_params.get('stream_type')
        if stream_type:
            queryset = queryset.filter(stream_type=stream_type)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create a new live stream"""
        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None
        )
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get currently active (live) streams"""
        active_streams = self.get_queryset().filter(status='live')
        serializer = self.get_serializer(active_streams, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def start(self, request, pk=None):
        """Start a live stream"""
        stream = self.get_object()
        
        if stream.created_by != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only start your own streams'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if stream.status == 'live':
            return Response(
                {'error': 'Stream is already live'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stream.start_stream()
        serializer = self.get_serializer(stream)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def end(self, request, pk=None):
        """End a live stream"""
        stream = self.get_object()
        
        if stream.created_by != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only end your own streams'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if stream.status != 'live':
            return Response(
                {'error': 'Stream is not live'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stream.end_stream()
        serializer = self.get_serializer(stream)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def heartbeat(self, request, pk=None):
        """Update viewer count and keep stream alive"""
        stream = self.get_object()
        
        # Update viewer count
        viewer_count = request.data.get('viewer_count', 0)
        if viewer_count > 0:
            stream.viewer_count = viewer_count
            stream.total_views = F('total_views') + 1
            if viewer_count > stream.peak_viewers:
                stream.peak_viewers = viewer_count
            stream.save()
        
        return Response({'status': 'ok'})
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get streaming statistics"""
        stats = {
            'total_streams': self.get_queryset().count(),
            'active_streams': self.get_queryset().filter(status='live').count(),
            'total_viewers': self.get_queryset().filter(status='live').aggregate(
                total=Count('viewer_count')
            )['total'] or 0,
        }
        return Response(stats)
