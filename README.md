# Synapse

**Every incident tells a story. Synapse connects the dots.**

Synapse correlates logs, metrics, deployments, and tickets from Splunk into a living operational knowledge graph. When incidents happen, teams get root cause, historical context, blast radius, and Splunk-verifiable evidence — not another dashboard to stare at.

## Try it out (2-minute demo)

**No Splunk required** — works offline with bundled demo data.

```bash
git clone https://github.com/carolgallegos/Synapse.git
cd Synapse
```

**Terminal 1 — Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** → click **Analyze** on the pre-filled question:

> *Why are customer complaints increasing?*

You should see root cause, causal graph, historical matches (INC-2841, INC-2910), impact metrics, and Splunk-verifiable evidence.

Full walkthrough with judge checklist: **[docs/TRY_IT_OUT.md](docs/TRY_IT_OUT.md)**

**Record demo video:** **[docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md)** · **Devpost copy:** **[docs/DEVPOST.md](docs/DEVPOST.md)** · **Live Splunk:** **[docs/SPLUNK_LIVE.md](docs/SPLUNK_LIVE.md)**

## What it does

1. **Ingest** — Pull operational events from Splunk (logs, metrics, deployments, tickets).
2. **Extract** — Parse services, events, dependencies, and causal signals from raw data.
3. **Graph** — Build a persistent organizational knowledge graph of relationships.
4. **Analyze** — Correlate incidents, match historical patterns, compute impact, compose stakeholder reports.

## Demo scenario

Ask: **"Why are customer complaints increasing?"**

Synapse returns:

- Root cause: Authentication latency +320% after Deployment v4.2
- Agent investigation: MCP steps (`generate_spl` → `run_splunk_query`) with generated SPL
- Causal chain: Deployment → Auth Service → Login failures → Tickets → Complaints
- Historical matches: INC-2841 (March), INC-2910 (April)
- Impact: 18,000 users, +240% ticket volume
- Splunk evidence: each conclusion links to a verifiable search

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Splunk (production)

Copy `.env.example` to `backend/.env`:

```env
USE_MOCK_SPLUNK=false
SPLUNK_HOST=your-splunk-host
SPLUNK_PORT=8089
SPLUNK_TOKEN=your-hec-or-bearer-token
SPLUNK_INDEX=main
SPLUNK_WEB_URL=https://your-splunk-host:8000
```

Demo mode uses bundled operational data — no Splunk instance required.

## Architecture

```
Splunk (logs, metrics, deployments, tickets)
        │
        ▼
Knowledge Extraction (operational parsing)
        │
        ▼
Organizational Knowledge Graph
        │
        ▼
Analysis Engines
  ├── Root Cause Correlation
  ├── Incident Pattern Matching
  ├── Blast Radius Calculation
  └── Stakeholder Report Composition
        │
        ▼
Synapse Dashboard
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Service health and graph stats |
| `/api/v1/ingest` | POST | Ingest and build knowledge graph |
| `/api/v1/analyze` | POST | Run operational analysis |
| `/api/v1/predict/risk` | GET | Predictive risk signals |
| `/api/v1/graph` | GET | Current knowledge graph |
| `/api/v1/splunk/url` | GET | Generate Splunk search URL |
| `/api/v1/splunk/test` | GET | Test Splunk connection (mock or live) |

## Category

**Observability** — operational understanding, service correlation, incident intelligence.

## License

MIT
