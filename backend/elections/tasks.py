from celery import shared_task
from django.utils import timezone
from django.db.models import Q, Sum
from django.core.exceptions import ValidationError
import logging
from .models import Election, Candidate, Result, Constituency, PollingStation, Position
from .iebc_fetcher import IEBCFetcher, sync_iebc_data_to_database

logger = logging.getLogger(__name__)


@shared_task
def check_for_new_elections():
    """
    Daily task to check for new election announcements from IEBC.
    Fetches from IEBC official sources and creates/updates election records.
    """
    fetcher = IEBCFetcher()
    announcements = fetcher.fetch_election_announcements()
    
    created_count = 0
    updated_count = 0
    
    for announcement in announcements:
        try:
            # Try to find existing election by title or create new one
            election, created = Election.objects.get_or_create(
                name=announcement.get('title', 'Unknown Election'),
                defaults={
                    'date': timezone.now().date(),  # Default date, should be parsed from announcement
                    'type': 'general',  # Default type, should be parsed
                    'source_url': announcement.get('source_url', ''),
                    'is_active': True,
                }
            )
            
            if created:
                created_count += 1
                logger.info(f"Created new election: {election.name}")
            elif announcement.get('source_url') and election.source_url != announcement.get('source_url'):
                # Update source URL if different
                election.source_url = announcement.get('source_url')
                election.save()
                updated_count += 1
        except Exception as e:
            logger.error(f"Error processing election announcement: {str(e)}")
            continue
    
    upcoming_elections = Election.objects.filter(
        date__gte=timezone.now().date(),
        is_active=True
    )
    
    return {
        'announcements_fetched': len(announcements),
        'elections_created': created_count,
        'elections_updated': updated_count,
        'upcoming_elections': upcoming_elections.count(),
        'checked_at': timezone.now().isoformat()
    }


@shared_task
def update_candidate_lists():
    """
    Daily task to check for updated candidate lists.
    """
    # Placeholder for actual data fetching logic
    elections = Election.objects.filter(is_active=True)
    
    for election in elections:
        candidate_count = election.candidates.count()
        # In production, compare with official sources
        
    return {
        'elections_checked': elections.count(),
        'checked_at': timezone.now().isoformat()
    }


@shared_task
def check_for_official_results(election_id=None):
    """
    Task to check for official result releases from IEBC.
    Fetches results and updates the database.
    
    Args:
        election_id: Optional election ID to check specific election
    """
    fetcher = IEBCFetcher()
    
    if election_id:
        elections = Election.objects.filter(id=election_id, is_active=True)
    else:
        elections = Election.objects.filter(
            date__lte=timezone.now().date(),
            is_active=True
        )
    
    results_fetched = 0
    results_created = 0
    results_updated = 0
    
    for election in elections:
        try:
            # Fetch results from IEBC
            iebc_results = fetcher.fetch_results_by_election(str(election.id))
            results_fetched += len(iebc_results)
            
            for result_data in iebc_results:
                try:
                    # Find or create candidate
                    candidate_name = result_data.get('candidate', '')
                    constituency_name = result_data.get('constituency', '')
                    
                    if not candidate_name:
                        continue
                    
                    # Try to find candidate
                    candidate = Candidate.objects.filter(
                        name__icontains=candidate_name,
                        election=election
                    ).first()
                    
                    if not candidate:
                        # Skip if candidate not found (should be created manually first)
                        logger.warning(f"Candidate not found: {candidate_name}")
                        continue
                    
                    # Find polling station if provided
                    polling_station = None
                    if constituency_name:
                        constituency = Constituency.objects.filter(
                            name__icontains=constituency_name
                        ).first()
                        
                        if constituency:
                            # Try to find polling station (might need station name from result_data)
                            polling_station = PollingStation.objects.filter(
                                constituency=constituency
                            ).first()
                    
                    # Create or update result
                    votes = result_data.get('votes', 0)
                    source_url = result_data.get('source_url', '')
                    
                    result, created = Result.objects.get_or_create(
                        candidate=candidate,
                        polling_station=polling_station,
                        defaults={
                            'votes': votes,
                            'verified': True,  # Mark as verified if from IEBC
                            'source_url': source_url,
                        }
                    )
                    
                    if not created:
                        # Update if votes changed
                        if result.votes != votes:
                            result.votes = votes
                            result.source_url = source_url
                            result.verified = True
                            result.save()
                            results_updated += 1
                    else:
                        results_created += 1
                        
                except Exception as e:
                    logger.error(f"Error processing result: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error fetching results for election {election.id}: {str(e)}")
            continue
    
    verified_results = Result.objects.filter(verified=True).count()
    
    return {
        'elections_checked': elections.count(),
        'results_fetched': results_fetched,
        'results_created': results_created,
        'results_updated': results_updated,
        'verified_results': verified_results,
        'checked_at': timezone.now().isoformat()
    }


@shared_task
def fetch_live_results():
    """
    Frequent task to fetch live results during active elections.
    Runs more frequently than check_for_official_results.
    """
    # Only fetch for elections happening today or recently
    today = timezone.now().date()
    active_elections = Election.objects.filter(
        date__gte=today - timezone.timedelta(days=7),  # Last 7 days
        date__lte=today + timezone.timedelta(days=1),  # Up to tomorrow
        is_active=True
    )
    
    if not active_elections.exists():
        return {
            'status': 'no_active_elections',
            'checked_at': timezone.now().isoformat()
        }
    
    # Use the same logic as check_for_official_results but for active elections
    return check_for_official_results()


@shared_task
def cleanup_old_data():
    """
    Periodic task to archive old election data.
    """
    # Archive elections older than 2 years
    old_elections = Election.objects.filter(
        date__lt=timezone.now().date() - timezone.timedelta(days=730)
    )
    
    archived_count = old_elections.update(is_active=False)
    
    return {
        'archived_elections': archived_count,
        'archived_at': timezone.now().isoformat()
    }
