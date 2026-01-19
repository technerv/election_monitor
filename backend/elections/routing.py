"""
WebSocket URL routing for real-time election updates
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/elections/(?P<election_id>\w+)/$', consumers.ElectionUpdatesConsumer.as_asgi()),
    re_path(r'ws/live-updates/$', consumers.LiveUpdatesConsumer.as_asgi()),
    re_path(r'ws/incidents/$', consumers.IncidentUpdatesConsumer.as_asgi()),
]
