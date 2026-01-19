from rest_framework import serializers
from django.db.models import Sum
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework.authtoken.models import Token
from .models import (
    Election, Position, Constituency, Candidate, 
    PollingStation, Result, VoterEducation,
    UserProfile, PollingStationUpdate, IncidentReport, Verification,
    MediaUpload, LiveStream
)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    organization = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone_number', 'organization']
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs
    
    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number', '')
        organization = validated_data.pop('organization', '')
        validated_data.pop('password_confirm')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        
        # Create user profile
        UserProfile.objects.create(
            user=user,
            phone_number=phone_number if phone_number else None,
            organization=organization,
        )
        
        # Create auth token
        Token.objects.create(user=user)
        
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details"""
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True)
    phone_verified = serializers.BooleanField(source='profile.phone_verified', read_only=True)
    is_verified_observer = serializers.BooleanField(source='profile.is_verified_observer', read_only=True)
    organization = serializers.CharField(source='profile.organization', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'phone_number', 'phone_verified', 'is_verified_observer', 'organization',
                  'date_joined', 'is_staff']
        read_only_fields = ['date_joined', 'is_staff']


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ['id', 'name', 'level', 'description', 'created_at']


class ConstituencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Constituency
        fields = ['id', 'name', 'county', 'code', 'latitude', 'longitude', 'created_at']


class ElectionSerializer(serializers.ModelSerializer):
    candidate_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Election
        fields = [
            'id', 'name', 'date', 'type', 'description', 'is_active',
            'created_at', 'updated_at', 'source_url', 'candidate_count'
        ]
        read_only_fields = ['created_at', 'updated_at', 'candidate_count']
    
    def get_candidate_count(self, obj):
        return obj.candidates.count()


class CandidateSerializer(serializers.ModelSerializer):
    position_name = serializers.CharField(source='position.name', read_only=True)
    position_level = serializers.CharField(source='position.level', read_only=True)
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)
    election_name = serializers.CharField(source='election.name', read_only=True)
    total_votes = serializers.SerializerMethodField()
    
    class Meta:
        model = Candidate
        fields = [
            'id', 'name', 'party', 'position', 'position_name', 'position_level',
            'constituency', 'constituency_name', 'election', 'election_name',
            'photo_url', 'biography', 'manifesto_url', 'is_independent',
            'created_at', 'updated_at', 'source_url', 'total_votes'
        ]
        read_only_fields = ['created_at', 'updated_at', 'total_votes']
    
    def get_total_votes(self, obj):
        return obj.results.aggregate(total=Sum('votes'))['total'] or 0


class PollingStationSerializer(serializers.ModelSerializer):
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)
    
    class Meta:
        model = PollingStation
        fields = [
            'id', 'name', 'code', 'constituency', 'constituency_name',
            'latitude', 'longitude', 'registered_voters', 'created_at'
        ]
        read_only_fields = ['created_at']


class ResultSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.name', read_only=True)
    candidate_party = serializers.CharField(source='candidate.party', read_only=True)
    polling_station_name = serializers.CharField(source='polling_station.name', read_only=True)
    
    class Meta:
        model = Result
        fields = [
            'id', 'candidate', 'candidate_name', 'candidate_party',
            'polling_station', 'polling_station_name', 'votes', 'verified',
            'source_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class VoterEducationSerializer(serializers.ModelSerializer):
    election_name = serializers.CharField(source='election.name', read_only=True)
    
    class Meta:
        model = VoterEducation
        fields = [
            'id', 'title', 'content', 'category', 'election', 'election_name',
            'is_published', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ElectionDetailSerializer(ElectionSerializer):
    """Extended serializer with nested candidates"""
    candidates = CandidateSerializer(many=True, read_only=True)
    positions = serializers.SerializerMethodField()
    
    class Meta(ElectionSerializer.Meta):
        fields = ElectionSerializer.Meta.fields + ['candidates', 'positions']
    
    def get_positions(self, obj):
        positions = Position.objects.filter(
            candidates__election=obj
        ).distinct()
        return PositionSerializer(positions, many=True).data


class ConstituencyResultsSerializer(serializers.Serializer):
    """Serializer for constituency-level results aggregation"""
    constituency = ConstituencySerializer()
    candidates = CandidateSerializer(many=True)
    total_votes = serializers.IntegerField()
    turnout_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'phone_number', 'phone_verified', 
                  'is_verified_observer', 'organization', 'created_at']
        read_only_fields = ['created_at']


class PollingStationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for polling station updates"""
    polling_station_name = serializers.CharField(source='polling_station.name', read_only=True)
    polling_station_code = serializers.CharField(source='polling_station.code', read_only=True)
    election_name = serializers.CharField(source='election.name', read_only=True)
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True, allow_null=True)
    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = PollingStationUpdate
        fields = [
            'id', 'polling_station', 'polling_station_name', 'polling_station_code',
            'election', 'election_name', 'update_type', 'opening_time', 'closing_time',
            'estimated_turnout', 'queue_wait_time', 'queue_length', 'status_notes',
            'photo_url', 'video_url', 'latitude', 'longitude', 'verification_status',
            'verified_by', 'verified_by_username', 'verified_at', 'verification_notes',
            'submitted_by', 'submitted_by_username', 'is_anonymous', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'verified_by', 'verified_at']


class IncidentReportSerializer(serializers.ModelSerializer):
    """Serializer for incident reports"""
    election_name = serializers.CharField(source='election.name', read_only=True)
    polling_station_name = serializers.CharField(source='polling_station.name', read_only=True, allow_null=True)
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True, allow_null=True)
    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = IncidentReport
        fields = [
            'id', 'election', 'election_name', 'polling_station', 'polling_station_name',
            'incident_type', 'severity', 'description', 'latitude', 'longitude',
            'location_description', 'photo_url', 'video_url', 'verification_status',
            'verified_by', 'verified_by_username', 'verified_at', 'verification_notes',
            'responded_to', 'response_notes', 'submitted_by', 'submitted_by_username',
            'is_anonymous', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'verified_by', 'verified_at']


class VerificationSerializer(serializers.ModelSerializer):
    """Serializer for verification actions"""
    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True)
    
    class Meta:
        model = Verification
        fields = [
            'id', 'verification_type', 'content_object', 'incident', 'result',
            'status', 'verified_by', 'verified_by_username', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']


class MediaUploadSerializer(serializers.ModelSerializer):
    """Serializer for media uploads (photos, videos, audio)"""
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True, allow_null=True)
    url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MediaUpload
        fields = [
            'id', 'file', 'media_type', 'status', 'external_url', 'url',
            'file_name', 'file_size', 'mime_type', 'duration',
            'thumbnail', 'thumbnail_url', 'stream_key', 'stream_url',
            'live_started_at', 'live_ended_at', 'viewer_count',
            'polling_station_update', 'incident_report',
            'latitude', 'longitude', 'captured_at',
            'uploaded_by', 'uploaded_by_username', 'is_anonymous',
            'is_moderated', 'is_approved', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'status', 'file_size', 'mime_type',
            'stream_key', 'viewer_count', 'live_started_at', 'live_ended_at'
        ]
    
    def get_url(self, obj):
        return obj.url
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None


class MediaUploadCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating media uploads"""
    
    class Meta:
        model = MediaUpload
        fields = [
            'file', 'media_type', 'external_url', 'file_name',
            'polling_station_update', 'incident_report',
            'latitude', 'longitude', 'captured_at', 'is_anonymous'
        ]
    
    def create(self, validated_data):
        # Get file metadata
        file = validated_data.get('file')
        if file:
            validated_data['file_name'] = file.name
            validated_data['file_size'] = file.size
            validated_data['mime_type'] = file.content_type
            validated_data['status'] = 'processing'
        elif validated_data.get('external_url'):
            validated_data['status'] = 'ready'
        
        return super().create(validated_data)


class LiveStreamSerializer(serializers.ModelSerializer):
    """Serializer for live streams"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    election_name = serializers.CharField(source='election.name', read_only=True, allow_null=True)
    polling_station_name = serializers.CharField(source='polling_station.name', read_only=True, allow_null=True)
    
    class Meta:
        model = LiveStream
        fields = [
            'id', 'title', 'description', 'stream_key', 'stream_type',
            'rtmp_url', 'hls_url', 'webrtc_url', 'status',
            'started_at', 'ended_at', 'viewer_count', 'peak_viewers', 'total_views',
            'election', 'election_name', 'polling_station', 'polling_station_name',
            'latitude', 'longitude', 'location_description',
            'is_recorded', 'recording_url',
            'created_by', 'created_by_username', 'is_anonymous',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'stream_key', 'rtmp_url', 'hls_url',
            'webrtc_url', 'started_at', 'ended_at', 'viewer_count',
            'peak_viewers', 'total_views', 'recording_url'
        ]


class LiveStreamCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating live streams"""
    
    class Meta:
        model = LiveStream
        fields = [
            'title', 'description', 'stream_type',
            'election', 'polling_station',
            'latitude', 'longitude', 'location_description',
            'is_recorded', 'is_anonymous'
        ]
    
    def create(self, validated_data):
        instance = super().create(validated_data)
        instance.generate_stream_key()
        
        # Generate stream URLs (these would normally come from a streaming server)
        base_url = 'rtmp://stream.electionmonitor.ke/live'
        instance.rtmp_url = f"{base_url}/{instance.stream_key}"
        instance.hls_url = f"https://stream.electionmonitor.ke/hls/{instance.stream_key}/index.m3u8"
        instance.webrtc_url = f"wss://stream.electionmonitor.ke/webrtc/{instance.stream_key}"
        instance.save()
        
        return instance
