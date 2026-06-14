# Try it out — 2-minute demo

Follow these steps to run Synapse locally and reproduce the hackathon demo. **No Splunk instance required** — demo mode uses bundled operational data.

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Git**

## 1. Clone the repository

```bash
git clone https://github.com/carolgallegos/Synapse.git
cd Synapse
```

## 2. Start the backend

```bash
cd backend
python -m venv .venv
```

**Windows (PowerShell):**
```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

**macOS / Linux:**
```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Verify the API is running:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Expected response:
```json
{"status":"ok","splunk_mode":"mock","graph_nodes":0,"graph_edges":0}
```

## 3. Start the frontend

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## 4. Run the demo scenario

The dashboard loads with this question pre-filled:

> **Why are customer complaints increasing?**

Click **Analyze** (or press Enter). Within seconds you should see:

| Panel | What to look for |
|-------|------------------|
| **Root Cause** | Authentication latency +320% after Deployment v4.2 |
| **Operational Knowledge Graph** | Deployment → Auth Service → Login failures → Portal → Complaints |
| **Causal Chain** | 5 linked steps, each with Splunk event count |
| **Historical Patterns** | INC-2841 (March) and INC-2910 (April) with topology match % |
| **Impact** | ~18,000 affected users, +240% ticket volume |
| **Splunk Evidence** | 8 events — click **View in Splunk** on any row |
| **Predictive Signal** | Payment API degradation warning at the bottom |

## 5. Try other queries

Examples you can type in the search bar:

- `Why are customer complaints increasing?`
- `What caused the authentication degradation?`
- `Which services are affected by the deployment?`

## 6. Test the API directly (optional)

```bash
curl -X POST http://127.0.0.1:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"Why are customer complaints increasing?\"}"
```

Risk prediction endpoint:

```bash
curl http://127.0.0.1:8000/api/v1/predict/risk
```

Interactive API docs: **http://127.0.0.1:8000/docs**

---

## One-command alternative (Windows)

From the repo root:

```bat
scripts\start-dev.bat
```

Then open http://localhost:5173

---

## Docker (optional)

```bash
docker compose up --build
```

Dashboard: **http://localhost:8080**  
API: **http://localhost:8000**

---

## Connect to a live Splunk instance (optional)

1. Copy `backend/.env.example` to `backend/.env`
2. Set your credentials:

```env
USE_MOCK_SPLUNK=false
SPLUNK_HOST=your-splunk-host
SPLUNK_PORT=8089
SPLUNK_TOKEN=your-token
SPLUNK_INDEX=main
SPLUNK_WEB_URL=https://your-splunk-host:8000
```

3. Seed demo events via HEC:

```bash
cd backend
source .venv/bin/activate   # or .venv\Scripts\Activate.ps1 on Windows
python ../scripts/seed_splunk_hec.py
```

4. Restart the backend and run the demo again.

---

## Judge checklist (~2 min)

- [ ] Clone repo and start backend + frontend
- [ ] Open http://localhost:5173
- [ ] Confirm root cause appears (Deployment v4.2 → auth latency)
- [ ] Explore the knowledge graph visualization
- [ ] Open **Splunk Evidence** and click **View in Splunk**
- [ ] Switch between **Executive** and **Technical** report tabs
- [ ] Scroll to **Predictive Signal** for Payment API warning

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 8000 in use | Stop other services or run `uvicorn app.main:app --port 8001` and update `frontend/vite.config.ts` proxy target |
| `npm install` fails | Use Node.js 18+ |
| Empty graph | Click **Analyze** again — ingest runs on each analysis |
| Frontend can't reach API | Ensure backend is running on port 8000 before starting frontend |

---

**Repository:** https://github.com/carolgallegos/Synapse
