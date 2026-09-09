# Splunk live mode (optional)

Synapse ships with **mock mode** so judges can run the demo offline. Use this guide when you have a Splunk trial and want `splunk_mode: live` in the header.

## Quick path (~20 min)

### 1. Splunk trial

1. Create account: https://www.splunk.com/en_us/download/splunk-enterprise.html  
2. Install Splunk Enterprise (or use Splunk Cloud)  
3. Log in at `https://<host>:8000`

### 2. HEC token (for seeding demo events)

1. Settings → Data inputs → HTTP Event Collector → New Token  
2. Name: `synapse` · Index: `main`  
3. Copy the token

### 3. Configure Synapse

```bash
cd backend
copy .env.example .env   # Windows
```

Edit `.env`:

```env
USE_MOCK_SPLUNK=false
SPLUNK_HOST=localhost
SPLUNK_PORT=8089
SPLUNK_HEC_PORT=8088
SPLUNK_INDEX=main
SPLUNK_TOKEN=<your-hec-token>
SPLUNK_USERNAME=admin
SPLUNK_PASSWORD=<your-splunk-password>
SPLUNK_WEB_URL=https://localhost:8000
```

### 4. Seed demo events into Splunk

```powershell
cd scripts
$env:SPLUNK_HOST="localhost"
$env:SPLUNK_TOKEN="<hec-token>"
$env:SPLUNK_INDEX="main"
python seed_splunk_hec.py
```

### 5. Test connection

Start backend, then:

```bash
curl http://localhost:8000/api/v1/splunk/test
```

Expected: `{"ok":true,"mode":"live","events_found":...}`

### 6. Run app

```bash
uvicorn app.main:app --port 8000
```

Header should show **Splunk live** instead of **Splunk mock**.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| SSL errors | Splunk trial uses self-signed certs — Synapse disables verify for dev |
| `events_found: 0` | Re-run seed script · check index name · search `index=main` in Splunk UI |
| Auth failed | Use `SPLUNK_USERNAME` + `SPLUNK_PASSWORD` for REST search |
| HEC 403 | Enable HEC globally in Splunk settings |

## Mock vs live

| | Mock | Live |
|---|------|------|
| Setup | None | Splunk trial + `.env` |
| Demo data | `backend/data/demo_events.json` | Same data via HEC seed |
| Hackathon video | **Recommended** (reliable) | Optional flex |

For recording, **mock is fine** — mention in the video that the connector supports live Splunk via REST/HEC.
