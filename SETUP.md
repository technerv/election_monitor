# Quick Setup Guide

## Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (optional - SQLite used by default)
- Redis (for Celery - optional)

## Backend Setup

1. **Create virtual environment and install dependencies**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Set up environment variables**
   ```bash
   cp env.template .env
   # Edit .env with your settings (or use defaults)
   ```

3. **Run migrations**
   ```bash
   python manage.py migrate
   ```

4. **Create admin user**
   ```bash
   python manage.py createsuperuser
   ```

5. **Start server**
   ```bash
   python manage.py runserver
   ```

## Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

## Optional: Celery Setup

1. **Start Redis** (in a separate terminal)
   ```bash
   redis-server
   ```

2. **Start Celery worker** (in a separate terminal)
   ```bash
   celery -A backend.celery_app worker --loglevel=info
   ```

3. **Start Celery beat** (in a separate terminal)
   ```bash
   celery -A backend.celery_app beat --loglevel=info
   ```

## Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Admin Panel**: http://localhost:8000/admin

## Next Steps

1. Log into the admin panel and create:
   - Elections
   - Positions
   - Constituencies
   - Candidates
   - Polling Stations
   - Results (after elections)

2. All data entries should include `source_url` for transparency

3. Enable 2FA for admin accounts in the admin panel
