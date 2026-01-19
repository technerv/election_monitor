# IEBC Data Integration Guide

This guide explains how to integrate live election data from IEBC (Independent Electoral and Boundaries Commission) servers into the Kenya Elections Tracker application.

## ⚠️ Important Legal and Technical Notes

1. **No Official API**: IEBC does not provide a public API. Data must be fetched from their official portals.
2. **Rate Limiting**: Always respect IEBC's servers. The fetcher includes built-in rate limiting (2 seconds between requests).
3. **Terms of Service**: Review IEBC's terms of service and robots.txt before deploying.
4. **Attribution**: Always include source URLs and proper attribution to IEBC.
5. **Verification**: All data should be verified against official IEBC publications.

## 📊 Available Data Sources

### 1. IEBC Official Portal
- **URL**: https://www.iebc.or.ke
- **Data**: Election announcements, press releases, official publications
- **Update Frequency**: Daily checks recommended

### 2. IEBC Forms Portal
- **URL**: https://forms.iebc.or.ke
- **Data**: Form 34A (polling station results), Form 35 (constituency results)
- **Format**: PDFs and scanned images
- **Update Frequency**: During election periods, check every 15-30 minutes

### 3. IEBC RTS (Results Transmission System)
- **URL**: https://www.iebc.or.ke/election/?rts=
- **Data**: Provisional results from polling stations
- **Format**: HTML tables or JSON (structure may vary)
- **Update Frequency**: During active elections, check every 5-15 minutes

## 🚀 Setup and Configuration

### 1. Install Required Dependencies

The IEBC fetcher requires additional Python packages:

```bash
pip install beautifulsoup4 requests lxml
```

These are already included in `requirements.txt`.

### 2. Configure IEBC Endpoints (Optional)

You can customize IEBC URLs in `backend/elections/iebc_fetcher.py`:

```python
class IEBCFetcher:
    IEBC_BASE_URL = "https://www.iebc.or.ke"
    IEBC_FORMS_URL = "https://forms.iebc.or.ke"
    IEBC_RTS_URL = "https://www.iebc.or.ke/election/?rts="
```

### 3. Set Up Celery for Automated Fetching

The system includes automated Celery tasks:

- **Every 15 minutes**: Check for official results (`check_for_official_results`)
- **Every 5 minutes**: Fetch live results during active elections (`fetch_live_results`)
- **Daily at 9 AM**: Check for new election announcements (`check_for_new_elections`)

To start Celery:

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Celery worker
celery -A backend.celery_app worker --loglevel=info

# Terminal 3: Start Celery beat (scheduler)
celery -A backend.celery_app beat --loglevel=info
```

## 📝 Manual Data Syncing

### Using Django Management Command

```bash
# Sync all data (announcements + results)
python manage.py sync_iebc --all-elections

# Sync specific election
python manage.py sync_iebc --election-id 1

# Fetch only results (skip announcements)
python manage.py sync_iebc --results-only --election-id 1

# Fetch live results for active elections
python manage.py sync_iebc --live
```

### Using Python Code

```python
from backend.elections.iebc_fetcher import IEBCFetcher, sync_iebc_data_to_database

# Initialize fetcher
fetcher = IEBCFetcher()

# Fetch election announcements
announcements = fetcher.fetch_election_announcements()

# Fetch results for specific election
results = fetcher.fetch_results_by_election(election_id="1")

# Sync all data to database
sync_result = sync_iebc_data_to_database(election_id=1)
```

## 🔧 Customization

### Adjusting Rate Limits

In `backend/elections/iebc_fetcher.py`:

```python
class IEBCFetcher:
    REQUEST_DELAY = 2  # Seconds between requests
    REQUEST_TIMEOUT = 30  # Request timeout in seconds
```

### Adding Custom Parsers

IEBC's website structure may change. Update parsing logic in:

- `fetch_election_announcements()` - For announcements
- `fetch_results_by_election()` - For results
- `fetch_form_data()` - For Form 34A/35 data

### Handling PDF/Image Forms

Form 34A/35 are often PDFs or scanned images. To parse them:

1. **For PDFs**: Use `PyPDF2` or `pdfplumber`
2. **For Images**: Use OCR with `Tesseract` or cloud OCR services

Example (to be implemented):

```python
def parse_form_34a_pdf(pdf_url):
    import pdfplumber
    
    with pdfplumber.open(pdf_url) as pdf:
        # Extract text and parse structured data
        pass
```

## 📋 Data Flow

1. **Celery Beat** triggers scheduled tasks
2. **IEBC Fetcher** makes HTTP requests to IEBC servers (with rate limiting)
3. **Data Parsing** extracts structured data from HTML/JSON
4. **Database Update** creates/updates records with source URLs
5. **Audit Logging** records all changes

## 🐛 Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check internet connectivity
   - Verify IEBC URLs are accessible
   - Check firewall/proxy settings

2. **Parsing Errors**
   - IEBC website structure may have changed
   - Update BeautifulSoup selectors in fetcher
   - Check HTML structure manually

3. **Rate Limiting**
   - Increase `REQUEST_DELAY` if getting blocked
   - Check IEBC's robots.txt for restrictions
   - Use IP rotation if necessary (advanced)

4. **Data Not Updating**
   - Check Celery workers are running
   - Verify Redis is running
   - Check logs: `celery -A backend.celery_app worker --loglevel=debug`

### Debugging

Enable debug logging:

```python
import logging
logging.getLogger('backend.elections.iebc_fetcher').setLevel(logging.DEBUG)
```

Check Celery task results:

```python
from celery.result import AsyncResult
result = AsyncResult('task-id')
print(result.get())
```

## 🔐 Security Considerations

1. **User-Agent**: The fetcher includes a proper User-Agent identifying your application
2. **Rate Limiting**: Built-in delays prevent server overload
3. **Error Handling**: Graceful failures prevent crashes
4. **Source URLs**: All data includes source URLs for verification

## 📞 Support and Updates

- Monitor IEBC's official website for structure changes
- Update parsers when IEBC updates their portals
- Test fetchers before major elections
- Keep dependencies updated

## 🎯 Best Practices

1. **Test Before Elections**: Run sync commands manually before election day
2. **Monitor During Elections**: Watch logs during active election periods
3. **Verify Data**: Cross-check fetched data with official IEBC publications
4. **Backup Data**: Regular database backups before major syncs
5. **Document Changes**: Update this guide when IEBC structure changes

## 📚 Additional Resources

- IEBC Official Website: https://www.iebc.or.ke
- IEBC Forms Portal: https://forms.iebc.or.ke
- IEBC Contact: Check official website for technical contacts
- Kura Zetu (Community): https://kurazetu.readthedocs.io (Use with caution - not official)

---

**Remember**: This integration is for informational purposes only. Always verify data against official IEBC publications and respect IEBC's terms of service.
