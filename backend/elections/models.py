from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from auditlog.registry import auditlog
from django.utils import timezone


class Election(models.Model):
    """Represents an election event (general, by-election, etc.)"""
    ELECTION_TYPES = [
        ('general', 'General Election'),
        ('by_election', 'By-Election'),
        ('referendum', 'Referendum'),
    ]
    
    name = models.CharField(max_length=200)
    date = models.DateField()
    type = models.CharField(max_length=20, choices=ELECTION_TYPES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    source_url = models.URLField(blank=True, help_text="Official source for this election data")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='elections_created')
    
    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['date', 'type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.date})"


class Position(models.Model):
    """Represents a political position being contested"""
    LEVELS = [
        ('national', 'National'),
        ('county', 'County'),
        ('constituency', 'Constituency'),
        ('ward', 'Ward'),
    ]
    
    name = models.CharField(max_length=100)
    level = models.CharField(max_length=20, choices=LEVELS)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['level', 'name']
        unique_together = [['name', 'level']]
    
    def __str__(self):
        return f"{self.name} ({self.get_level_display()})"


class Constituency(models.Model):
    """Represents a constituency in Kenya"""
    name = models.CharField(max_length=200, unique=True)
    county = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['county', 'name']
        verbose_name_plural = 'Constituencies'
    
    def __str__(self):
        return f"{self.name}, {self.county}"


class Candidate(models.Model):
    """Represents a candidate running for office"""
    name = models.CharField(max_length=200)
    party = models.CharField(max_length=100)
    position = models.ForeignKey(Position, on_delete=models.CASCADE, related_name='candidates')
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='candidates', null=True, blank=True)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='candidates')
    photo_url = models.URLField(blank=True)
    biography = models.TextField(blank=True)
    manifesto_url = models.URLField(blank=True)
    is_independent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    source_url = models.URLField(blank=True, help_text="Official source for candidate information")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='candidates_created')
    
    class Meta:
        ordering = ['election', 'position', 'name']
        indexes = [
            models.Index(fields=['election', 'position']),
            models.Index(fields=['party']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.party}) - {self.position.name}"


class PollingStation(models.Model):
    """Represents a polling station"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='polling_stations')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    registered_voters = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['constituency', 'name']
        indexes = [
            models.Index(fields=['constituency']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Result(models.Model):
    """Represents election results for a candidate at a polling station"""
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='results')
    polling_station = models.ForeignKey(PollingStation, on_delete=models.CASCADE, related_name='results', null=True, blank=True)
    votes = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    verified = models.BooleanField(default=False, help_text="Whether this result has been officially verified")
    source_url = models.URLField(blank=True, help_text="Official source for this result")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='results_created')
    
    class Meta:
        ordering = ['-votes']
        indexes = [
            models.Index(fields=['candidate', 'polling_station']),
            models.Index(fields=['verified']),
        ]
        unique_together = [['candidate', 'polling_station']]
    
    def __str__(self):
        station = self.polling_station.name if self.polling_station else "Aggregate"
        return f"{self.candidate.name}: {self.votes} votes ({station})"


class VoterEducation(models.Model):
    """Voter education content"""
    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.CharField(max_length=50, choices=[
        ('voting_process', 'Voting Process'),
        ('candidates', 'Candidates'),
        ('positions', 'Positions'),
        ('timeline', 'Timeline'),
        ('general', 'General Information'),
    ])
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='voter_education', null=True, blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='voter_education_created')
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'is_published']),
        ]
    
    def __str__(self):
        return self.title


class UserProfile(models.Model):
    """Extended user profile with phone verification"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    phone_verified = models.BooleanField(default=False)
    otp_code = models.CharField(max_length=6, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    is_verified_observer = models.BooleanField(default=False, help_text="Accredited observer/CSO")
    organization = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.phone_number or 'No phone'}"
    
    class Meta:
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['phone_verified']),
        ]


class MediaUpload(models.Model):
    """Media uploads (photos, videos, audio) for reports"""
    MEDIA_TYPES = [
        ('photo', 'Photo'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('live_video', 'Live Video Stream'),
        ('live_audio', 'Live Audio Stream'),
    ]
    
    UPLOAD_STATUS = [
        ('uploading', 'Uploading'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
        ('live', 'Live Streaming'),
        ('ended', 'Stream Ended'),
    ]
    
    # Media file
    file = models.FileField(upload_to='uploads/%Y/%m/%d/', blank=True, null=True)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    status = models.CharField(max_length=20, choices=UPLOAD_STATUS, default='uploading')
    
    # External URL (for externally hosted media)
    external_url = models.URLField(blank=True)
    
    # File metadata
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True, help_text="File size in bytes")
    mime_type = models.CharField(max_length=100, blank=True)
    duration = models.IntegerField(null=True, blank=True, help_text="Duration in seconds for video/audio")
    
    # Thumbnail for videos
    thumbnail = models.ImageField(upload_to='thumbnails/%Y/%m/%d/', blank=True, null=True)
    
    # Live streaming fields
    stream_key = models.CharField(max_length=100, blank=True, unique=True, null=True)
    stream_url = models.URLField(blank=True, help_text="HLS/RTMP stream URL")
    live_started_at = models.DateTimeField(null=True, blank=True)
    live_ended_at = models.DateTimeField(null=True, blank=True)
    viewer_count = models.IntegerField(default=0)
    
    # Associations
    polling_station_update = models.ForeignKey(
        'PollingStationUpdate', 
        on_delete=models.CASCADE, 
        null=True, blank=True, 
        related_name='media_files'
    )
    incident_report = models.ForeignKey(
        'IncidentReport', 
        on_delete=models.CASCADE, 
        null=True, blank=True, 
        related_name='media_files'
    )
    
    # Location (where media was captured)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    captured_at = models.DateTimeField(null=True, blank=True, help_text="When the media was captured")
    
    # Metadata
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='media_uploads')
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Content moderation
    is_moderated = models.BooleanField(default=False)
    moderation_notes = models.TextField(blank=True)
    is_approved = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['media_type', 'status']),
            models.Index(fields=['uploaded_by']),
            models.Index(fields=['created_at']),
            models.Index(fields=['stream_key']),
        ]
    
    def __str__(self):
        return f"{self.get_media_type_display()} - {self.file_name or self.id}"
    
    @property
    def url(self):
        """Return the URL for accessing this media"""
        if self.file:
            return self.file.url
        return self.external_url
    
    def generate_stream_key(self):
        """Generate a unique stream key for live streaming"""
        import secrets
        self.stream_key = secrets.token_urlsafe(32)
        return self.stream_key


class LiveStream(models.Model):
    """Active live streams"""
    STREAM_STATUS = [
        ('pending', 'Pending'),
        ('live', 'Live'),
        ('paused', 'Paused'),
        ('ended', 'Ended'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Stream configuration
    stream_key = models.CharField(max_length=100, unique=True)
    stream_type = models.CharField(max_length=20, choices=[
        ('video', 'Video'),
        ('audio', 'Audio Only'),
    ], default='video')
    
    # Stream URLs
    rtmp_url = models.URLField(blank=True, help_text="RTMP ingest URL")
    hls_url = models.URLField(blank=True, help_text="HLS playback URL")
    webrtc_url = models.URLField(blank=True, help_text="WebRTC URL for low-latency")
    
    # Status
    status = models.CharField(max_length=20, choices=STREAM_STATUS, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Metrics
    viewer_count = models.IntegerField(default=0)
    peak_viewers = models.IntegerField(default=0)
    total_views = models.IntegerField(default=0)
    
    # Associations
    election = models.ForeignKey('Election', on_delete=models.CASCADE, related_name='live_streams', null=True, blank=True)
    polling_station = models.ForeignKey('PollingStation', on_delete=models.CASCADE, related_name='live_streams', null=True, blank=True)
    
    # Location
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_description = models.CharField(max_length=500, blank=True)
    
    # Recording
    is_recorded = models.BooleanField(default=True)
    recording_url = models.URLField(blank=True, help_text="URL to recorded stream")
    
    # Creator
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='live_streams')
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['stream_key']),
            models.Index(fields=['election', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
    
    def generate_stream_key(self):
        """Generate unique stream key"""
        import secrets
        self.stream_key = f"live_{secrets.token_urlsafe(24)}"
        return self.stream_key
    
    def start_stream(self):
        """Mark stream as live"""
        self.status = 'live'
        self.started_at = timezone.now()
        self.save()
    
    def end_stream(self):
        """Mark stream as ended"""
        self.status = 'ended'
        self.ended_at = timezone.now()
        self.save()


class PollingStationUpdate(models.Model):
    """Live updates from polling stations submitted by citizens"""
    UPDATE_TYPES = [
        ('opening', 'Station Opening'),
        ('closing', 'Station Closing'),
        ('turnout', 'Voter Turnout'),
        ('queue', 'Queue Status'),
        ('general', 'General Update'),
    ]
    
    polling_station = models.ForeignKey(PollingStation, on_delete=models.CASCADE, related_name='updates')
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='station_updates')
    update_type = models.CharField(max_length=20, choices=UPDATE_TYPES)
    
    # Update details
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    estimated_turnout = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    queue_wait_time = models.IntegerField(null=True, blank=True, help_text="Wait time in minutes", validators=[MinValueValidator(0)])
    queue_length = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    
    # Status
    status_notes = models.TextField(blank=True, help_text="Additional notes about the polling station")
    
    # Media
    photo_url = models.URLField(blank=True)
    video_url = models.URLField(blank=True)
    
    # Location
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Verification
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Verification'),
            ('verified', 'Verified'),
            ('unverified', 'Unverified'),
            ('disputed', 'Disputed'),
        ],
        default='pending'
    )
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_updates')
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_notes = models.TextField(blank=True)
    
    # Metadata
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='submitted_updates')
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['polling_station', 'election']),
            models.Index(fields=['verification_status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['update_type']),
        ]
    
    def __str__(self):
        return f"{self.polling_station.name} - {self.get_update_type_display()} ({self.created_at})"


class IncidentReport(models.Model):
    """Incident reports from citizens"""
    INCIDENT_TYPES = [
        ('violence', 'Violence or Intimidation'),
        ('irregularity', 'Electoral Irregularity'),
        ('disruption', 'Disruption or Interference'),
        ('technical', 'Technical Issue (Power/Communication)'),
        ('other', 'Other'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='incidents')
    polling_station = models.ForeignKey(PollingStation, on_delete=models.CASCADE, related_name='incidents', null=True, blank=True)
    
    # Incident details
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='medium')
    description = models.TextField()
    
    # Location
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_description = models.CharField(max_length=500, blank=True)
    
    # Media evidence
    photo_url = models.URLField(blank=True)
    video_url = models.URLField(blank=True)
    
    # Verification
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Verification'),
            ('verified', 'Verified'),
            ('unverified', 'Unverified'),
            ('disputed', 'Disputed'),
            ('resolved', 'Resolved'),
        ],
        default='pending'
    )
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_incidents')
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_notes = models.TextField(blank=True)
    
    # Response
    responded_to = models.BooleanField(default=False)
    response_notes = models.TextField(blank=True)
    
    # Metadata
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='submitted_incidents')
    is_anonymous = models.BooleanField(default=True, help_text="Anonymous reporting protects citizen privacy")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['election', 'incident_type']),
            models.Index(fields=['verification_status']),
            models.Index(fields=['severity']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_incident_type_display()} - {self.polling_station or 'Unknown Location'} ({self.created_at})"


class Verification(models.Model):
    """Verification actions by trusted observers/CSOs"""
    VERIFICATION_TYPES = [
        ('update', 'Polling Station Update'),
        ('incident', 'Incident Report'),
        ('result', 'Election Result'),
    ]
    
    verification_type = models.CharField(max_length=20, choices=VERIFICATION_TYPES)
    content_object = models.ForeignKey('PollingStationUpdate', on_delete=models.CASCADE, null=True, blank=True)
    incident = models.ForeignKey(IncidentReport, on_delete=models.CASCADE, null=True, blank=True)
    result = models.ForeignKey(Result, on_delete=models.CASCADE, null=True, blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('verified', 'Verified'),
            ('unverified', 'Unverified'),
            ('disputed', 'Disputed'),
        ]
    )
    
    verified_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verifications')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['verification_type', 'status']),
            models.Index(fields=['verified_by']),
        ]
    
    def __str__(self):
        return f"{self.get_verification_type_display()} - {self.get_status_display()} by {self.verified_by.username}"


# Register models for audit logging
auditlog.register(Election)
auditlog.register(Candidate)
auditlog.register(Result)
auditlog.register(VoterEducation)
auditlog.register(PollingStationUpdate)
auditlog.register(IncidentReport)
auditlog.register(Verification)
