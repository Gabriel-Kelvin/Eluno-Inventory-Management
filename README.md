# Eluno - Eyewear Operations Platform

Eluno is an enterprise-grade AI-powered eyewear operations platform.
This repository contains Module 1: Lens Inventory Management & Intelligence.

## Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts.
- **Backend**: FastAPI, SQLAlchemy, Pydantic.
- **Database**: PostgreSQL (via Supabase).
- **AI Integration**: Google Gemini API.

## Setup Instructions

### 1. Prerequisites
- Node.js (v20+)
- Python (v3.10+)
- PostgreSQL Database (e.g., Supabase)
- Google Gemini API Key

### 2. Backend Setup
Navigate to the `backend` directory and set up a Python virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory with the following variables:
```
DATABASE_URL=postgresql://user:password@host:port/dbname
GEMINI_API_KEY=your_gemini_api_key_here
```

Initialize the database with synthetic data:
```bash
python -m seed
```

Run the backend server:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
Navigate to the `frontend` directory:
```bash
cd frontend
npm install
```

Run the frontend development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## Modules

### Module 1: Lens Inventory Management
- **Dashboard**: Real-time overview of eyewear components, stock health, and most demanded lenses.
- **Inventory Matrix**: Searchable and filterable grid of available lenses by type, power, index, and coating.
- **Forecasting Engine**: Predictive analytics for optimal stock levels based on synthetic historical demand.
- **AI Copilot**: An intelligent chat assistant connected directly to live warehouse data.
