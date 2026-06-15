from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import services.operations_service as operations_service

router = APIRouter()

@router.get("/briefing")
def get_daily_briefing(db: Session = Depends(get_db)):
    briefing = operations_service.generate_daily_briefing(db)
    data = operations_service.get_insights(db)
    
    return {
        "briefing": briefing,
        "insights": data["insights"],
        "recommendations": data["recommendations"],
        "metrics": data["metrics"]
    }

@router.get("/demo-stats")
def get_demo_stats(db: Session = Depends(get_db)):
    data = operations_service.get_insights(db)
    total_breaches = data["metrics"]["predicted_breaches"]
    
    # Dynamically generate improvement percentage using AI
    improvement_pct = operations_service.generate_dynamic_improvement_pct(data)
    
    # Synthetic "Actions Prevented" demo data
    prevented = int(total_breaches * (improvement_pct / 100.0))
    remaining = total_breaches - prevented

    return {
        "potential_breaches": total_breaches,
        "after_recommendations": remaining,
        "breaches_prevented": prevented,
        "estimated_improvement": improvement_pct
    }

from typing import List
from schemas import AlertLog as AlertLogSchema
from models import AlertLog
from sqlalchemy.orm import selectinload

@router.get("/recent-alerts", response_model=List[AlertLogSchema])
def get_recent_alerts(db: Session = Depends(get_db)):
    alerts = db.query(AlertLog).options(selectinload(AlertLog.order)).order_by(AlertLog.sent_at.desc()).limit(10).all()
    return alerts
