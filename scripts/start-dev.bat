@echo off
cd /d "%~dp0"
start "synapse-api" cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
timeout /t 2 /nobreak >nul
start "synapse-ui" cmd /k "cd frontend && npm run dev"
echo Synapse starting on http://localhost:5173
