from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from .models import (
    Election, Position, Constituency, Candidate,
    PollingStation, Result, VoterEducation
)


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'type', 'is_active', 'candidate_count', 'created_at']
    list_filter = ['type', 'is_active', 'date']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'date', 'type', 'description', 'is_active')
        }),
        ('Source Information', {
            'fields': ('source_url',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def candidate_count(self, obj):
        return obj.candidates.count()
    candidate_count.short_description = 'Candidates'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ['name', 'level', 'created_at']
    list_filter = ['level']
    search_fields = ['name', 'description']


@admin.register(Constituency)
class ConstituencyAdmin(admin.ModelAdmin):
    list_display = ['name', 'county', 'code', 'created_at']
    list_filter = ['county']
    search_fields = ['name', 'county', 'code']


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ['name', 'party', 'position', 'election', 'total_votes_display', 'created_at']
    list_filter = ['party', 'position', 'election', 'is_independent']
    search_fields = ['name', 'party']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'total_votes_display']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'party', 'is_independent', 'position', 'constituency', 'election')
        }),
        ('Additional Information', {
            'fields': ('photo_url', 'biography', 'manifesto_url')
        }),
        ('Source Information', {
            'fields': ('source_url',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at', 'total_votes_display'),
            'classes': ('collapse',)
        }),
    )
    
    def total_votes_display(self, obj):
        total = obj.results.aggregate(total=Sum('votes'))['total'] or 0
        return format_html('<strong>{}</strong>', total)
    total_votes_display.short_description = 'Total Votes'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(PollingStation)
class PollingStationAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'constituency', 'registered_voters', 'created_at']
    list_filter = ['constituency__county']
    search_fields = ['name', 'code', 'constituency__name']


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ['candidate', 'polling_station', 'votes', 'verified', 'created_at']
    list_filter = ['verified', 'candidate__election', 'candidate__position']
    search_fields = ['candidate__name', 'polling_station__name']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(VoterEducation)
class VoterEducationAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'election', 'is_published', 'created_at']
    list_filter = ['category', 'is_published', 'election']
    search_fields = ['title', 'content']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
