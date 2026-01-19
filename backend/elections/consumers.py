"""
WebSocket consumers for real-time election updates
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import PollingStationUpdate, IncidentReport, Election


class ElectionUpdatesConsumer(AsyncWebsocketConsumer):
    """Consumer for election-specific updates"""
    
    async def connect(self):
        self.election_id = self.scope['url_route']['kwargs']['election_id']
        self.room_group_name = f'election_{self.election_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial data
        updates = await self.get_recent_updates()
        await self.send(text_data=json.dumps({
            'type': 'initial_data',
            'updates': updates
        }))
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Receive message from WebSocket"""
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))
    
    async def station_update(self, event):
        """Send polling station update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'station_update',
            'update': event['update']
        }))
    
    async def result_update(self, event):
        """Send result update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'result_update',
            'result': event['result']
        }))
    
    @database_sync_to_async
    def get_recent_updates(self):
        """Get recent updates for this election"""
        try:
            election = Election.objects.get(id=self.election_id)
            updates = PollingStationUpdate.objects.filter(
                election=election,
                created_at__gte=timezone.now() - timezone.timedelta(hours=1)
            ).order_by('-created_at')[:50]
            
            return [
                {
                    'id': update.id,
                    'polling_station': update.polling_station.name,
                    'update_type': update.update_type,
                    'verification_status': update.verification_status,
                    'created_at': update.created_at.isoformat(),
                }
                for update in updates
            ]
        except Election.DoesNotExist:
            return []


class LiveUpdatesConsumer(AsyncWebsocketConsumer):
    """Consumer for all live updates across elections"""
    
    async def connect(self):
        self.room_group_name = 'live_updates'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def station_update(self, event):
        """Send polling station update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'station_update',
            'update': event['update']
        }))
    
    async def incident_report(self, event):
        """Send incident report to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'incident_report',
            'incident': event['incident']
        }))


class IncidentUpdatesConsumer(AsyncWebsocketConsumer):
    """Consumer for incident reports"""
    
    async def connect(self):
        self.room_group_name = 'incident_updates'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def incident_report(self, event):
        """Send incident report to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'incident_report',
            'incident': event['incident']
        }))
    
    async def incident_verified(self, event):
        """Send verification update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'incident_verified',
            'incident': event['incident']
        }))
