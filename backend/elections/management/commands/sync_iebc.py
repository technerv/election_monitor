"""
Django management command to manually sync data from IEBC.

Usage:
    python manage.py sync_iebc --election-id 1
    python manage.py sync_iebc --all-elections
    python manage.py sync_iebc --results-only --election-id 1
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from backend.elections.models import Election
from backend.elections.tasks import check_for_new_elections, check_for_official_results, fetch_live_results
from backend.elections.iebc_fetcher import sync_iebc_data_to_database
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync election data from IEBC official sources'

    def add_arguments(self, parser):
        parser.add_argument(
            '--election-id',
            type=int,
            help='Sync data for a specific election ID',
        )
        parser.add_argument(
            '--all-elections',
            action='store_true',
            help='Sync data for all active elections',
        )
        parser.add_argument(
            '--results-only',
            action='store_true',
            help='Only fetch results, skip election announcements',
        )
        parser.add_argument(
            '--live',
            action='store_true',
            help='Fetch live results (for active elections)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting IEBC data sync...'))
        
        election_id = options.get('election_id')
        all_elections = options.get('all_elections', False)
        results_only = options.get('results_only', False)
        live = options.get('live', False)
        
        try:
            if live:
                # Fetch live results for active elections
                self.stdout.write('Fetching live results...')
                result = fetch_live_results()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Live results fetched: {result.get('results_fetched', 0)} results"
                    )
                )
                return
            
            if not results_only:
                # Check for new elections
                self.stdout.write('Checking for new election announcements...')
                election_result = check_for_new_elections()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Found {election_result.get('announcements_fetched', 0)} announcements, "
                        f"created {election_result.get('elections_created', 0)} elections"
                    )
                )
            
            # Fetch results
            if election_id:
                self.stdout.write(f'Fetching results for election ID {election_id}...')
                result = check_for_official_results(election_id=election_id)
            elif all_elections:
                self.stdout.write('Fetching results for all active elections...')
                result = check_for_official_results()
            else:
                # Default: fetch for elections happening today or recently
                result = check_for_official_results()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Results sync completed:\n"
                    f"  - Elections checked: {result.get('elections_checked', 0)}\n"
                    f"  - Results fetched: {result.get('results_fetched', 0)}\n"
                    f"  - Results created: {result.get('results_created', 0)}\n"
                    f"  - Results updated: {result.get('results_updated', 0)}\n"
                    f"  - Total verified results: {result.get('verified_results', 0)}"
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during sync: {str(e)}')
            )
            logger.error(f'IEBC sync error: {str(e)}', exc_info=True)
            raise
