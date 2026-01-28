# AidWatch 🌍

**AI-powered early warning system for humanitarian and infrastructure crises**

AidWatch analyzes public data sources to detect emerging humanitarian and infrastructure crises early, providing clear, actionable situation summaries for NGOs and responders.

## Features

- 🔍 **Multi-source Data Ingestion** - News APIs, social media, satellite data, government reports
- 🤖 **AI-Powered Analysis** - NLP for crisis detection, severity assessment, and trend analysis
- ⚡ **Real-time Alerts** - Configurable thresholds and notification channels
- 📊 **Interactive Dashboard** - Visualize crisis data, trends, and geographic hotspots
- 📋 **Situation Summaries** - Auto-generated actionable reports for responders
- 🗺️ **Geographic Mapping** - Crisis visualization on interactive maps

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **AI**: Groq API (Llama 3.1 70B) for NLP analysis

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/saawezali/AidWatch.git
   cd AidWatch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the database**
   ```bash
   docker-compose up -d
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

## Project Structure

```
aidwatch/
├── packages/
│   ├── api/              # Backend API server
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── services/ # Business logic
│   │   │   ├── jobs/     # Background data processing
│   │   │   └── ai/       # AI analysis modules
│   │   └── prisma/       # Database schema & migrations
│   └── web/              # React frontend
│       └── src/
│           ├── components/
│           ├── pages/
│           └── hooks/
├── docker-compose.yml    # Local development services
└── package.json          # Monorepo configuration
```

## License

MIT License - see [LICENSE](LICENSE) for details.
