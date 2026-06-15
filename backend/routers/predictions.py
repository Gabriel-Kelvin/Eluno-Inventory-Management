from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import OrderPrediction, Order
from schemas import OrderPrediction as OrderPredictionSchema
import services.tat_prediction_service as prediction_service

router = APIRouter()

@router.get("/risk", response_model=List[OrderPredictionSchema])
def get_high_risk_orders(db: Session = Depends(get_db)):
    # Return active orders with HIGH risk
    predictions = db.query(OrderPrediction).join(Order).filter(
        OrderPrediction.risk_level == "HIGH",
        Order.current_status != "DELIVERED"
    ).all()
    return predictions

@router.get("/stats")
def get_prediction_stats(db: Session = Depends(get_db)):
    predictions = db.query(OrderPrediction).join(Order).filter(Order.current_status != "DELIVERED").all()
    if not predictions:
        return {"orders_at_risk": 0, "predicted_breaches": 0, "avg_tat": 0, "avg_risk_score": 0}
    
    orders_at_risk = sum(1 for p in predictions if p.risk_level == "HIGH")
    predicted_breaches = sum(1 for p in predictions if p.will_breach)
    avg_tat = sum(p.predicted_completion_days for p in predictions) / len(predictions)
    avg_risk_score = sum(p.risk_score for p in predictions) / len(predictions)
    
    return {
        "orders_at_risk": orders_at_risk,
        "predicted_breaches": predicted_breaches,
        "avg_tat": round(avg_tat, 1),
        "avg_risk_score": round(avg_risk_score, 1)
    }

@router.get("/{order_id}/prediction", response_model=OrderPredictionSchema)
def get_order_prediction(order_id: int, db: Session = Depends(get_db)):
    prediction = db.query(OrderPrediction).filter(OrderPrediction.order_id == order_id).first()
    if not prediction:
        # Calculate it if it doesn't exist
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        prediction = prediction_service.predict_order_tat(db, order)
    return prediction

@router.post("/recalculate-risk")
def recalculate_risk(db: Session = Depends(get_db)):
    count = prediction_service.recalculate_all_active_orders(db)
    return {"message": f"Successfully recalculated risk for {count} active orders."}
