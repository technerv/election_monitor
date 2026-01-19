# Quick Start: IEBC Data Integration

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Redis (for Celery)
```bash
redis-server
```

### 3. Start Celery Worker & Beat
```bash
# Terminal 1: Celery Worker
celery -A backend.celery_app worker --loglevel=info

# Terminal 2: Celery Beat (scheduler)
celery -A backend.celery_app beat --loglevel=info
```

### 4. Manual Sync (Test)
```bash
# Sync all data
python manage.py sync_iebc --all-elections

# Sync specific election
python manage.py sync_iebc --election-id 1

# Fetch live results
python manage.py sync_iebc --live
```

## 📡 API Endpoints

### Sync All Data (Admin Only)
```bash
POST /api/iebc-sync/sync_all/
Authorization: Token YOUR_ADMIN_TOKEN
```

### Sync Results for Specific Election
```bash
POST /api/iebc-sync/sync_results/
Content-Type: application/json
Authorization: Token YOUR_ADMIN_TOKEN

{
  "election_id": 1
}
```

### Fetch Live Results
```bash
POST /api/iebc-sync/sync_live/
Authorization: Token YOUR_ADMIN_TOKEN
```

## ⚙️ Automated Sync Schedule

The system automatically syncs:
- **Every 5 minutes**: Live results during active elections
- **Every 15 minutes**: Official results check
- **Daily at 9 AM**: New election announcements

## 🔍 Monitoring

Check sync status:
```bash
# View Celery logs
celery -A backend.celery_app worker --loglevel=info

# Check Django logs
tail -f logs/django.log
```

## ⚠️ Important Notes

1. **Rate Limiting**: Built-in 2-second delay between requests
2. **Legal Compliance**: Respect IEBC's terms of service
3. **Data Verification**: Always verify against official IEBC publications
4. **Source URLs**: All data includes source URLs for transparency

## 📚 Full Documentation

See `IEBC_INTEGRATION.md` for complete documentation.
