from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Sum, Count, Q
from django.utils import timezone

from .models import (
    Election, Position, Constituency, Candidate,
    PollingStation, Result, VoterEducation
)
from .serializers import (
    ElectionSerializer, ElectionDetailSerializer,
    PositionSerializer, ConstituencySerializer,
    CandidateSerializer, PollingStationSerializer,
    ResultSerializer, VoterEducationSerializer,
    ConstituencyResultsSerializer
)


class ElectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing elections.
    Read-only for public, write requires authentication.
    """
    queryset = Election.objects.all()
    serializer_class = ElectionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        election_type = self.request.query_params.get('type')
        is_active = self.request.query_params.get('is_active')
        
        if election_type:
            queryset = queryset.filter(type=election_type)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ElectionDetailSerializer
        return ElectionSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return super().get_permissions()
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get statistics for a specific election"""
        election = self.get_object()
        
        stats = {
            'total_candidates': election.candidates.count(),
            'total_positions': Position.objects.filter(
                candidates__election=election
            ).distinct().count(),
            'total_constituencies': Constituency.objects.filter(
                candidates__election=election
            ).distinct().count(),
            'total_votes': Result.objects.filter(
                candidate__election=election
            ).aggregate(total=Sum('votes'))['total'] or 0,
            'verified_results': Result.objects.filter(
                candidate__election=election,
                verified=True
            ).count(),
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """Get election timeline information"""
        election = self.get_object()
        
        timeline = {
            'election_date': election.date,
            'days_until': (election.date - timezone.now().date()).days,
            'is_upcoming': election.date > timezone.now().date(),
            'is_past': election.date < timezone.now().date(),
        }
        
        return Response(timeline)


class PositionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing positions (read-only)"""
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        level = self.request.query_params.get('level')
        if level:
            queryset = queryset.filter(level=level)
        return queryset


class ConstituencyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing constituencies (read-only)"""
    queryset = Constituency.objects.all()
    serializer_class = ConstituencySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'county', 'code']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        county = self.request.query_params.get('county')
        if county:
            queryset = queryset.filter(county=county)
        return queryset
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get results for a specific constituency"""
        constituency = self.get_object()
        
        # Get all candidates for this constituency
        candidates = Candidate.objects.filter(constituency=constituency)
        
        # Get results for these candidates
        results = Result.objects.filter(
            candidate__in=candidates
        ).select_related('candidate', 'polling_station')
        
        # Aggregate votes per candidate
        candidate_votes = {}
        for result in results:
            candidate_id = result.candidate.id
            if candidate_id not in candidate_votes:
                candidate_votes[candidate_id] = {
                    'candidate': result.candidate,
                    'votes': 0
                }
            candidate_votes[candidate_id]['votes'] += result.votes
        
        # Calculate total votes
        total_votes = sum(v['votes'] for v in candidate_votes.values())
        
        # Get registered voters from polling stations
        total_registered = PollingStation.objects.filter(
            constituency=constituency
        ).aggregate(total=Sum('registered_voters'))['total'] or 0
        
        turnout_percentage = (total_votes / total_registered * 100) if total_registered > 0 else 0
        
        serializer = ConstituencyResultsSerializer({
            'constituency': constituency,
            'candidates': [v['candidate'] for v in candidate_votes.values()],
            'total_votes': total_votes,
            'turnout_percentage': turnout_percentage
        })
        
        return Response(serializer.data)


class CandidateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing candidates"""
    queryset = Candidate.objects.select_related('position', 'constituency', 'election').all()
    serializer_class = CandidateSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'party']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        election = self.request.query_params.get('election')
        position = self.request.query_params.get('position')
        party = self.request.query_params.get('party')
        constituency = self.request.query_params.get('constituency')
        
        if election:
            queryset = queryset.filter(election_id=election)
        if position:
            queryset = queryset.filter(position_id=position)
        if party:
            queryset = queryset.filter(party=party)
        if constituency:
            queryset = queryset.filter(constituency_id=constituency)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get all results for a specific candidate"""
        candidate = self.get_object()
        results = Result.objects.filter(candidate=candidate).select_related('polling_station')
        serializer = ResultSerializer(results, many=True)
        return Response(serializer.data)


class PollingStationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing polling stations (read-only)"""
    queryset = PollingStation.objects.select_related('constituency').all()
    serializer_class = PollingStationSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        constituency = self.request.query_params.get('constituency')
        if constituency:
            queryset = queryset.filter(constituency_id=constituency)
        return queryset


class ResultViewSet(viewsets.ModelViewSet):
    """ViewSet for managing results"""
    queryset = Result.objects.select_related('candidate', 'polling_station').all()
    serializer_class = ResultSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['votes', 'created_at']
    ordering = ['-votes']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        candidate = self.request.query_params.get('candidate')
        polling_station = self.request.query_params.get('polling_station')
        verified = self.request.query_params.get('verified')
        
        if candidate:
            queryset = queryset.filter(candidate_id=candidate)
        if polling_station:
            queryset = queryset.filter(polling_station_id=polling_station)
        if verified is not None:
            queryset = queryset.filter(verified=verified.lower() == 'true')
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def aggregate(self, request):
        """Get aggregated results by candidate"""
        election_id = request.query_params.get('election')
        position_id = request.query_params.get('position')
        constituency_id = request.query_params.get('constituency')
        
        queryset = self.get_queryset()
        
        if election_id:
            queryset = queryset.filter(candidate__election_id=election_id)
        if position_id:
            queryset = queryset.filter(candidate__position_id=position_id)
        if constituency_id:
            queryset = queryset.filter(candidate__constituency_id=constituency_id)
        
        # Aggregate votes by candidate
        aggregated = queryset.values(
            'candidate__id',
            'candidate__name',
            'candidate__party',
            'candidate__position__name'
        ).annotate(
            total_votes=Sum('votes')
        ).order_by('-total_votes')
        
        return Response(aggregated)


class VoterEducationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing voter education content"""
    queryset = VoterEducation.objects.filter(is_published=True)
    serializer_class = VoterEducationSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content']
    
    def get_queryset(self):
        """Admins can see all, public only sees published"""
        queryset = VoterEducation.objects.all() if self.request.user.is_staff else VoterEducation.objects.filter(is_published=True)
        
        category = self.request.query_params.get('category')
        election = self.request.query_params.get('election')
        
        if category:
            queryset = queryset.filter(category=category)
        if election:
            queryset = queryset.filter(election_id=election)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class IEBCSyncViewSet(viewsets.ViewSet):
    """
    ViewSet for manually triggering IEBC data synchronization.
    Requires admin authentication.
    """
    permission_classes = [IsAdminUser]
    
    @action(detail=False, methods=['post'])
    def sync_all(self, request):
        """Sync all IEBC data (announcements + results)"""
        from .tasks import check_for_new_elections, check_for_official_results
        
        election_result = check_for_new_elections()
        results_result = check_for_official_results()
        
        return Response({
            'elections': election_result,
            'results': results_result,
            'synced_at': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['post'])
    def sync_results(self, request):
        """Sync results only for a specific election"""
        election_id = request.data.get('election_id')
        if not election_id:
            return Response(
                {'error': 'election_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .tasks import check_for_official_results
        result = check_for_official_results(election_id=election_id)
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def sync_live(self, request):
        """Fetch live results for active elections"""
        from .tasks import fetch_live_results
        result = fetch_live_results()
        return Response(result)
