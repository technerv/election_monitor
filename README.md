# Election Monitor: Citizen-First Live Election App

A comprehensive, real-time election monitoring platform that empowers citizens to observe, report, verify, and share election information. Built for transparency, security, and citizen engagement in Kenya's electoral process.

## 🎯 Core Features

### Citizen Reporting & Monitoring
- **Live Polling Station Updates**: Citizens can submit real-time updates from polling stations (opening/closing, turnout, queues)
- **Incident Reporting**: Report violence, irregularities, disruptions, or technical issues with geo-tagging
- **Anonymous Reporting**: Protect citizen privacy with optional anonymous submissions
- **Photo/Video Evidence**: Upload media with metadata for verification

### Real-Time Dashboard
- **Live Interactive Maps**: Real-time visualization of polling stations, updates, and incidents
- **WebSocket Updates**: Instant updates without page refresh
- **Heatmaps**: Visual representation of activity and incidents
- **Trending Stations**: See which polling stations have the most activity

### Verification & Trust Layer
- **Verification Workflow**: Trusted observers/CSOs can verify or dispute reports
- **Status Tracking**: Track verification status (pending, verified, unverified, disputed)
- **Verified Observer System**: Accredited observers can verify reports
- **Audit Trail**: Complete logging of all verification actions

### Results & Data
- **Real-Time Results**: Structured result entry with automatic validations
- **IEBC Integration**: Automated data fetching from IEBC official sources
- **Results Visualization**: Interactive charts and graphs
- **Aggregated Tallies**: Automatic aggregation at ward/county levels

### Security & Privacy
- **Phone Verification**: OTP-based phone number verification
- **End-to-End Encryption**: Secure handling of sensitive submissions
- **Role-Based Access**: Different permissions for citizens, observers, and admins
- **Data Protection**: Compliance with data protection regulations

## 🏗️ Architecture

### Backend
- **Django 6.0** with Django REST Framework
- **Django Channels** for WebSocket real-time updates
- **PostgreSQL** (with SQLite fallback for development)
- **Celery** for background tasks
- **Redis** for caching, task queue, and WebSocket channels
- **Django Auditlog** for tracking changes
- **Django OTP** for two-factor authentication
- **Pillow** for image processing

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Leaflet** for interactive maps
- **React Router** for navigation
- **Axios** for API calls

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (optional, SQLite used by default)
- Redis (for Celery and caching)

## 🚀 Quick Start

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kenya-elections-tracker
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

### Celery Setup (Optional)

For background tasks and scheduled updates:

1. **Start Redis** (if not running)
   ```bash
   redis-server
   ```

2. **Start Celery worker**
   ```bash
   celery -A backend.celery_app worker --loglevel=info
   ```

3. **Start Celery beat** (for scheduled tasks)
   ```bash
   celery -A backend.celery_app beat --loglevel=info
   ```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available environment variables. Key settings:

- `USE_POSTGRES`: Set to `True` to use PostgreSQL (default: SQLite)
- `USE_SQLITE`: Set to `True` to explicitly use SQLite
- `SECRET_KEY`: Django secret key (generate a new one for production)
- `DEBUG`: Set to `False` in production
- `CELERY_BROKER_URL`: Redis URL for Celery
- `REDIS_URL`: Redis URL for caching

### Database Configuration

By default, the application uses SQLite for development. To use PostgreSQL:

1. Set `USE_POSTGRES=True` in your `.env` file
2. Configure database credentials:
   ```
   DB_NAME=kenya_elections
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```

## 📊 Data Sources

This platform is designed to track **public, factual election data** from:

- **IEBC Official Sources**: Automated fetching from IEBC portals (forms.iebc.or.ke, RTS system)
- Official electoral body publications (gazettes, press releases)
- Public APIs (when available)
- Public CSV/PDF releases
- Verified news outlets (announcements only)

**Important**: All data entries include source URLs for verification and transparency.

### IEBC Data Integration

The platform includes automated data fetching from IEBC (Independent Electoral and Boundaries Commission):
- **Live Results**: Fetches results every 5-15 minutes during active elections
- **Election Announcements**: Daily checks for new election announcements
- **Form Data**: Parses Form 34A/35 from IEBC forms portal

See `IEBC_INTEGRATION.md` for complete setup and usage instructions.

## 🔒 Security Features

- **Read-only public access**: Public users can only view data
- **Admin-only data entry**: Only authenticated admins can add/edit data
- **Two-factor authentication**: Available for admin accounts (django-otp)
- **Audit logging**: All changes are logged with user and timestamp
- **Rate limiting**: API endpoints are rate-limited
- **CORS protection**: Configured for specific origins
- **XSS protection**: Security headers enabled

## 📁 Project Structure

```
kenya-elections-tracker/
├── backend/                 # Django backend
│   ├── backend/            # Main Django project
│   │   ├── settings.py    # Django settings
│   │   ├── urls.py        # URL configuration
│   │   └── celery_app.py  # Celery configuration
│   └── elections/         # Elections app
│       ├── models.py      # Database models
│       ├── views.py       # API viewsets
│       ├── serializers.py # API serializers
│       ├── admin.py       # Admin interface
│       └── tasks.py       # Celery tasks
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   └── services/      # API services
│   └── package.json
├── manage.py
├── requirements.txt
└── README.md
```

## 🗄️ Database Models

- **Election**: Election events (general, by-election, referendum)
- **Position**: Political positions (President, Governor, MP, etc.)
- **Constituency**: Electoral constituencies with geographic data
- **Candidate**: Candidates running for office
- **PollingStation**: Polling stations with location data
- **Result**: Election results per polling station
- **VoterEducation**: Educational content for voters

## 🔄 Scheduled Tasks

Celery beat runs the following scheduled tasks:

- **Daily at 9 AM**: Check for new election announcements
- **Daily at 10 AM**: Update candidate lists
- **Daily at 11 AM**: Check for official result releases
- **Weekly (Monday 2 AM)**: Archive old election data (2+ years)

## 🧪 Testing

Run Django tests:
```bash
python manage.py test
```

## 📝 API Documentation

Once the server is running, API documentation is available at:
- **Django REST Framework Browsable API**: `http://localhost:8000/api/`
- **Admin Interface**: `http://localhost:8000/admin/`

### API Endpoints

- `/api/elections/` - List/create elections
- `/api/candidates/` - List/create candidates
- `/api/results/` - List/create results
- `/api/constituencies/` - List constituencies
- `/api/positions/` - List positions
- `/api/voter-education/` - List voter education content

## 🚢 Deployment

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Configure `SECRET_KEY`
- [ ] Set up PostgreSQL database
- [ ] Configure Redis
- [ ] Set up proper CORS origins
- [ ] Enable SSL/HTTPS
- [ ] Configure static files serving
- [ ] Set up Celery workers and beat
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging

### Using Gunicorn

```bash
gunicorn backend.wsgi:application --bind 0.0.0.0:8000
```

## 🤝 Contributing

This is a civic-tech project focused on transparency and education. Contributions should:

1. Maintain neutrality and factual accuracy
2. Include source references for all data
3. Follow security best practices
4. Include appropriate tests

## 📄 License

[Specify your license here]

## 🙏 Acknowledgments

- Built for civic engagement and transparency
- Data sourced from official electoral body publications
- Designed as a neutral information platform

## ⚠️ Important Notes

- **This platform is for information purposes only**
- **Does not endorse any candidate or party**
- **All data should be verified against official sources**
- **No user-generated political content allowed**
- **Focus on transparency and education, not persuasion**

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Kenya Elections Tracker** - A civic-tech platform for transparent election information tracking.
