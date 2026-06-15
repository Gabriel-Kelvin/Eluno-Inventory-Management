from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import inventory, copilot, orders, predictions, operations, demo, settings

import logging

# Create tables if they don't exist
try:
    Base.metadata.create_all(bind=engine)
    logging.info("Database connected and tables verified successfully.")
except Exception as e:
    logging.error(f"FATAL: Could not connect to the database. API will start but endpoints may fail. Error: {e}")

app = FastAPI(
    title="Eluno Inventory API",
    description="AI-Powered Eyewear Operations Platform - Inventory Module",
    version="1.0.0"
)

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router, prefix="/api", tags=["Inventory"])
app.include_router(copilot.router, prefix="/api", tags=["AI Copilot"])
app.include_router(predictions.router, prefix="/api/orders", tags=["Predictions"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(operations.router, prefix="/api/operations", tags=["Operations"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])

from contextlib import asynccontextmanager
from fastapi.concurrency import run_in_threadpool
import asyncio
from services.alert_monitor import run_alert_checks

async def alert_loop():
    while True:
        try:
            import logging
            logging.info("Running automated SLA breach alert monitor...")
            await run_in_threadpool(run_alert_checks)
        except Exception as e:
            import logging
            logging.error(f"Error in alert monitor loop: {e}")
        
        await asyncio.sleep(300)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(alert_loop())
    yield
    task.cancel()

# Apply lifespan to app
app.router.lifespan_context = lifespan

@app.get("/")
def root():
    return {"message": "Welcome to the Eluno API"}
