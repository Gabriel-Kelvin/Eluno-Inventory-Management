@echo off
echo Starting Eluno Backend...
cd backend
start cmd /k ".\venv\Scripts\activate & uvicorn main:app --reload --port 8000"

echo Starting Eluno Frontend...
cd ../frontend
start cmd /k "npm run dev"

echo Both services are starting...
