# AidWatch

**AI-powered early warning system for humanitarian crises**

AidWatch analyzes public data sources to detect emerging humanitarian crises early, providing clear, actionable situation summaries for NGOs and responders.

## Features

- **Multi-source Data Ingestion** - GDELT, NewsAPI, USGS Earthquakes, ACLED Conflict Data, ReliefWeb, and more
- **AI-Powered Analysis** - Groq Llama 3.3 70B for crisis detection, severity assessment, and content filtering
- **Email Alerts** - Configurable subscriptions with immediate, daily, and weekly digest options
- **Interactive Dashboard** - Visualize crisis data, trends, and geographic hotspots
- **Situation Summaries** - Auto-generated actionable reports for responders
- **Geographic Mapping** - Crisis visualization on interactive Leaflet maps
- **Webhook Integrations** - Push crisis data to external systems

## Tech Stack

- **Backend**: Node.js, Express 4.18, TypeScript 5.3, Prisma 5.7 ORM
- **Frontend**: React 18, TypeScript, Vite 5, TailwindCSS 3.4, GSAP
- **Database**: PostgreSQL 16
- **AI**: Groq API (Llama 3.3 70B Versatile)
- **Email**: SMTP (SendPulse recommended)

## Data Sources

| Source | Type | Data |
|--------|------|------|
| GDELT | News/Events | Global event database |
| NewsAPI | News | Real-time news articles |
| USGS | Seismic | Earthquake data |
| ACLED | Conflict | Armed conflict events |
| ReliefWeb | Humanitarian | Reports and updates |
| EONET | Satellite | NASA natural events |
| HDX | Humanitarian | UN OCHA data |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16+ (or Docker)
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/AidWatch.git
   cd AidWatch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Start PostgreSQL** (using Docker)
   ```bash
   docker-compose up -d postgres
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```

   - API: http://localhost:3001
   - Web: http://localhost:5173

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GROQ_API_KEY` | Groq API key for AI analysis | Yes |
| `NEWS_API_KEY` | NewsAPI.org API key | Yes |
| `SMTP_HOST` | SMTP server host | For emails |
| `SMTP_USER` | SMTP username | For emails |
| `SMTP_PASS` | SMTP password | For emails |

## Project Structure

```
AidWatch/
├── packages/
│   ├── api/                 # Backend API server
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   ├── jobs/        # Scheduled tasks
│   │   │   └── ai/          # AI analysis modules
│   │   └── prisma/          # Database schema
│   └── web/                 # React frontend
│       └── src/
│           ├── components/  # Reusable UI components
│           ├── pages/       # Route pages
│           └── lib/         # Utilities and API client
├── docker-compose.yml       # Local development services
├── .env.example             # Environment template
└── package.json             # Monorepo configuration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/crises` | List all crises |
| GET | `/api/crises/:id` | Get crisis details |
| GET | `/api/alerts` | List alerts |
| POST | `/api/subscriptions` | Create email subscription |
| GET | `/api/ai/status` | Get AI processing status |
| POST | `/api/ai/jobs/ingest` | Trigger data ingestion |
| POST | `/api/ai/jobs/analyze` | Trigger AI analysis |

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Data Ingestion | Every 30 min | Fetch from all sources |
| AI Analysis | Every 15 min | Process new events |
| Summary Generation | Every 20 min | Generate crisis summaries |
| Immediate Alerts | Every 15 min | Send urgent notifications |
| Daily Digest | 8 AM UTC | Daily summary emails |
| Weekly Digest | Monday 8 AM | Weekly summary emails |

## License

MIT License - see [LICENSE](LICENSE) for details.
