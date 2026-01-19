"""
IEBC Data Fetcher Service

This module handles fetching election data from IEBC (Independent Electoral and Boundaries Commission)
official sources. Since IEBC doesn't provide a public API, this service:

1. Scrapes data from IEBC's official portals (forms.iebc.or.ke)
2. Parses published result forms (Form 34A/35)
3. Handles multiple data sources with fallbacks

IMPORTANT LEGAL NOTES:
- Always respect IEBC's terms of service and robots.txt
- Use rate limiting to avoid overloading their servers
- Include proper attribution and source URLs
- This is for informational purposes only
- Verify all data against official IEBC publications
"""

import requests
from bs4 import BeautifulSoup
import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from django.utils import timezone
from django.conf import settings
import time

logger = logging.getLogger(__name__)


class IEBCFetcher:
    """
    Fetches election data from IEBC official sources.
    """
    
    # IEBC Official URLs
    IEBC_BASE_URL = "https://www.iebc.or.ke"
    IEBC_FORMS_URL = "https://forms.iebc.or.ke"
    IEBC_RTS_URL = "https://www.iebc.or.ke/election/?rts="
    
    # Request settings
    REQUEST_TIMEOUT = 30
    REQUEST_DELAY = 2  # Seconds between requests (rate limiting)
    USER_AGENT = "Kenya Elections Tracker - Civic Tech Platform (Contact: your-email@example.com)"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        })
        self.last_request_time = 0
    
    def _rate_limit(self):
        """Enforce rate limiting between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.REQUEST_DELAY:
            time.sleep(self.REQUEST_DELAY - time_since_last)
        self.last_request_time = time.time()
    
    def _make_request(self, url: str, params: Optional[Dict] = None) -> Optional[requests.Response]:
        """
        Make a rate-limited HTTP request to IEBC servers.
        
        Returns:
            Response object or None if request fails
        """
        self._rate_limit()
        
        try:
            response = self.session.get(
                url,
                params=params,
                timeout=self.REQUEST_TIMEOUT,
                allow_redirects=True
            )
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return None
    
    def fetch_election_announcements(self) -> List[Dict]:
        """
        Fetch new election announcements from IEBC website.
        
        Returns:
            List of election announcements with metadata
        """
        elections = []
        
        try:
            # Try to fetch from IEBC announcements/news section
            url = f"{self.IEBC_BASE_URL}/election/"
            response = self._make_request(url)
            
            if response:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for election announcements (adjust selectors based on actual IEBC site structure)
                announcements = soup.find_all(['article', 'div'], class_=lambda x: x and ('election' in x.lower() or 'announcement' in x.lower()))
                
                for announcement in announcements[:10]:  # Limit to recent announcements
                    try:
                        title_elem = announcement.find(['h1', 'h2', 'h3', 'a'])
                        date_elem = announcement.find(['time', 'span'], class_=lambda x: x and 'date' in x.lower() if x else False)
                        
                        if title_elem:
                            title = title_elem.get_text(strip=True)
                            link = title_elem.get('href') or announcement.find('a', href=True)
                            link = link.get('href') if hasattr(link, 'get') else link
                            
                            if link and not link.startswith('http'):
                                link = f"{self.IEBC_BASE_URL}{link}"
                            
                            elections.append({
                                'title': title,
                                'source_url': link or url,
                                'fetched_at': timezone.now().isoformat(),
                                'raw_data': str(announcement)[:500]  # Store snippet for debugging
                            })
                    except Exception as e:
                        logger.warning(f"Error parsing announcement: {str(e)}")
                        continue
        except Exception as e:
            logger.error(f"Error fetching election announcements: {str(e)}")
        
        return elections
    
    def fetch_results_by_election(self, election_id: Optional[str] = None) -> List[Dict]:
        """
        Fetch election results from IEBC RTS (Results Transmission System).
        
        Args:
            election_id: Optional election identifier
            
        Returns:
            List of result entries
        """
        results = []
        
        try:
            # Try to fetch from IEBC RTS portal
            url = self.IEBC_RTS_URL
            if election_id:
                url = f"{url}{election_id}"
            
            response = self._make_request(url)
            
            if response:
                # IEBC RTS might return JSON or HTML
                try:
                    # Try parsing as JSON first
                    data = response.json()
                    if isinstance(data, dict) and 'results' in data:
                        results = data['results']
                    elif isinstance(data, list):
                        results = data
                except (ValueError, json.JSONDecodeError):
                    # Parse as HTML
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Look for result tables or data structures
                    # This will need to be adjusted based on actual IEBC RTS structure
                    result_tables = soup.find_all('table', class_=lambda x: x and 'result' in x.lower() if x else False)
                    
                    for table in result_tables:
                        rows = table.find_all('tr')[1:]  # Skip header
                        for row in rows:
                            cells = row.find_all(['td', 'th'])
                            if len(cells) >= 3:
                                try:
                                    results.append({
                                        'constituency': cells[0].get_text(strip=True),
                                        'candidate': cells[1].get_text(strip=True),
                                        'votes': int(cells[2].get_text(strip=True).replace(',', '')),
                                        'source_url': url,
                                        'fetched_at': timezone.now().isoformat()
                                    })
                                except (ValueError, IndexError):
                                    continue
        except Exception as e:
            logger.error(f"Error fetching results: {str(e)}")
        
        return results
    
    def fetch_form_data(self, form_type: str = "34A", election_id: Optional[str] = None) -> List[Dict]:
        """
        Fetch Form 34A/35 data from IEBC forms portal.
        
        Args:
            form_type: Form type (34A, 35, etc.)
            election_id: Optional election identifier
            
        Returns:
            List of form data entries
        """
        forms = []
        
        try:
            # Try to fetch from IEBC forms portal
            url = f"{self.IEBC_FORMS_URL}"
            params = {}
            
            if form_type:
                params['form'] = form_type
            if election_id:
                params['election'] = election_id
            
            response = self._make_request(url, params=params)
            
            if response:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for form links or data
                form_links = soup.find_all('a', href=lambda x: x and ('form' in x.lower() or '34' in x or '35' in x))
                
                for link in form_links:
                    href = link.get('href', '')
                    if not href.startswith('http'):
                        href = f"{self.IEBC_FORMS_URL}{href}"
                    
                    forms.append({
                        'form_type': form_type,
                        'title': link.get_text(strip=True),
                        'url': href,
                        'source_url': href,
                        'fetched_at': timezone.now().isoformat()
                    })
        except Exception as e:
            logger.error(f"Error fetching form data: {str(e)}")
        
        return forms
    
    def parse_form_34a_data(self, form_url: str) -> Optional[Dict]:
        """
        Parse Form 34A data (polling station results).
        
        Note: This is a placeholder. Actual implementation would need:
        - PDF parsing (using PyPDF2 or pdfplumber)
        - Image OCR (using Tesseract) for scanned forms
        - Structured data extraction
        
        Args:
            form_url: URL to Form 34A
            
        Returns:
            Parsed form data or None
        """
        # TODO: Implement PDF/image parsing
        # For now, return structure
        return {
            'polling_station': None,
            'constituency': None,
            'registered_voters': None,
            'votes_cast': None,
            'results': [],
            'source_url': form_url,
            'parsed_at': timezone.now().isoformat()
        }
    
    def fetch_constituency_results(self, constituency_name: str) -> List[Dict]:
        """
        Fetch results for a specific constituency.
        
        Args:
            constituency_name: Name of the constituency
            
        Returns:
            List of result entries for the constituency
        """
        results = []
        
        try:
            # Try multiple IEBC endpoints
            urls_to_try = [
                f"{self.IEBC_RTS_URL}?constituency={constituency_name}",
                f"{self.IEBC_BASE_URL}/election/?constituency={constituency_name}",
            ]
            
            for url in urls_to_try:
                response = self._make_request(url)
                if response:
                    # Parse response (adjust based on actual structure)
                    soup = BeautifulSoup(response.content, 'html.parser')
                    # Add parsing logic here
                    break
        except Exception as e:
            logger.error(f"Error fetching constituency results: {str(e)}")
        
        return results


class AlternativeDataSources:
    """
    Alternative data sources when IEBC direct access is not available.
    These should be used as fallbacks and always verified against official sources.
    """
    
    @staticmethod
    def fetch_from_kura_zetu_api() -> List[Dict]:
        """
        Fetch from Kura Zetu API (community-driven, use with caution).
        
        WARNING: This is NOT official IEBC data. Always verify against official sources.
        """
        # Kura Zetu API endpoint (if available)
        # This is a placeholder - actual implementation would need API key/endpoint
        return []
    
    @staticmethod
    def fetch_from_news_sources() -> List[Dict]:
        """
        Parse election data from verified news sources (announcements only).
        
        WARNING: Only use for announcements, not results. Results must come from IEBC.
        """
        return []


def sync_iebc_data_to_database(election_id: Optional[int] = None) -> Dict:
    """
    Main function to sync IEBC data to the database.
    
    This function:
    1. Fetches data from IEBC sources
    2. Validates and processes the data
    3. Updates database records
    4. Logs all changes with source URLs
    
    Args:
        election_id: Optional election ID to sync specific election
        
    Returns:
        Dictionary with sync results and statistics
    """
    fetcher = IEBCFetcher()
    sync_results = {
        'elections_fetched': 0,
        'results_fetched': 0,
        'errors': [],
        'synced_at': timezone.now().isoformat()
    }
    
    try:
        # Fetch election announcements
        announcements = fetcher.fetch_election_announcements()
        sync_results['elections_fetched'] = len(announcements)
        
        # Fetch results if election_id provided
        if election_id:
            results = fetcher.fetch_results_by_election(str(election_id))
            sync_results['results_fetched'] = len(results)
        
        # TODO: Process and save to database
        # This would involve:
        # 1. Matching fetched data to existing records
        # 2. Creating new records if needed
        # 3. Updating existing records with new data
        # 4. Setting source_url fields
        
    except Exception as e:
        logger.error(f"Error syncing IEBC data: {str(e)}")
        sync_results['errors'].append(str(e))
    
    return sync_results
