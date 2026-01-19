"""
Signals to broadcast WebSocket messages when updates/incidents are created
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

from .models import PollingStationUpdate, IncidentReport


@receiver(post_save, sender=PollingStationUpdate)
def broadcast_station_update(sender, instance, created, **kwargs):
    """Broadcast polling station update via WebSocket"""
    if created:
        channel_layer = get_channel_layer()
        if channel_layer:
            # Broadcast to election-specific room
            async_to_sync(channel_layer.group_send)(
                f'election_{instance.election.id}',
                {
                    'type': 'station_update',
                    'update': {
                        'id': instance.id,
                        'polling_station': instance.polling_station.name,
                        'update_type': instance.update_type,
                        'verification_status': instance.verification_status,
                        'created_at': instance.created_at.isoformat(),
                    }
                }
            )
            
            # Broadcast to live updates room
            async_to_sync(channel_layer.group_send)(
                'live_updates',
                {
                    'type': 'station_update',
                    'update': {
                        'id': instance.id,
                        'polling_station': instance.polling_station.name,
                        'update_type': instance.update_type,
                        'verification_status': instance.verification_status,
                        'created_at': instance.created_at.isoformat(),
                    }
                }
            )


@receiver(post_save, sender=IncidentReport)
def broadcast_incident_report(sender, instance, created, **kwargs):
    """Broadcast incident report via WebSocket"""
    if created:
        channel_layer = get_channel_layer()
        if channel_layer:
            # Broadcast to incident updates room
            async_to_sync(channel_layer.group_send)(
                'incident_updates',
                {
                    'type': 'incident_report',
                    'incident': {
                        'id': instance.id,
                        'incident_type': instance.incident_type,
                        'severity': instance.severity,
                        'verification_status': instance.verification_status,
                        'created_at': instance.created_at.isoformat(),
                    }
                }
            )
            
            # Broadcast to live updates room
            async_to_sync(channel_layer.group_send)(
                'live_updates',
                {
                    'type': 'incident_report',
                    'incident': {
                        'id': instance.id,
                        'incident_type': instance.incident_type,
                        'severity': instance.severity,
                        'verification_status': instance.verification_status,
                        'created_at': instance.created_at.isoformat(),
                    }
                }
            )
