from sqlalchemy.orm import Session
from datetime import datetime, timezone
from models import Order, SlaRule, OrderPrediction
from schemas import OrderPredictionBase

def calculate_elapsed_days(created_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    # Ensure created_at is timezone aware
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    delta = now - created_at
    return delta.total_seconds() / 86400.0

def predict_order_tat(db: Session, order: Order) -> OrderPrediction:
    # Fetch SLA Rule
    sla_rule = db.query(SlaRule).filter(SlaRule.lens_type == order.lens_type).first()
    sla_days = sla_rule.sla_days if sla_rule else 7

    # Calculate elapsed time
    elapsed_days = calculate_elapsed_days(order.created_at)

    # Base Synthetic Prediction Logic
    risk_score = 0
    contributing_factors = []
    
    # 1. Procurement required
    if order.current_status == "WAITING_FOR_PROCUREMENT" or order.procurement_required:
        risk_score += 25
        contributing_factors.append("Supplier procurement delay")
    
    # 2. Complexity
    if order.lens_type in ["Progressive", "Bifocal"]:
        risk_score += 15
        contributing_factors.append(f"{order.lens_type} lens complexity")
    
    # 3. QC Failures
    qc_failures = [qc for qc in order.qc_events if qc.result == "FAIL"]
    if qc_failures:
        risk_score += 30
        contributing_factors.append(f"Failed QC ({len(qc_failures)} times)")
    
    # 4. Long time in current stage (Simplistic heuristic: if elapsed > SLA and not delivered)
    if elapsed_days > sla_days and order.current_status != "DELIVERED":
        risk_score += 20
        contributing_factors.append(f"Stuck in {order.current_status}")

    # Risk Level
    if risk_score < 30:
        risk_level = "LOW"
    elif risk_score <= 65:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # Predicted Completion Days (Synthetic calculation based on risk)
    base_days = sla_days
    if risk_level == "MEDIUM":
        base_days += 2
    elif risk_level == "HIGH":
        base_days += 5
    
    # If already past predicted days, adjust prediction to be today + 1
    predicted_completion_days = max(base_days, elapsed_days + 1.0)

    # Breach Prediction
    will_breach = predicted_completion_days > sla_days
    
    # Confidence (Synthetic based on order age)
    confidence = min(95, max(50, int(elapsed_days * 10) + 50))
    if order.current_status == "DELIVERED":
        confidence = 100
        will_breach = elapsed_days > sla_days

    # Root Cause Analysis
    root_cause = contributing_factors[0] if contributing_factors else "Normal Processing"
    recommended_action = "Monitor order"
    
    if "Supplier procurement delay" in root_cause:
        recommended_action = "Expedite procurement"
    elif "QC" in root_cause:
        recommended_action = "Review QC logs and alert lab manager"
    elif "Stuck" in root_cause:
        recommended_action = "Prioritize in lab queue"

    # Check if prediction exists
    prediction = db.query(OrderPrediction).filter(OrderPrediction.order_id == order.id).first()
    
    if prediction:
        prediction.predicted_completion_days = predicted_completion_days
        prediction.risk_score = risk_score
        prediction.risk_level = risk_level
        prediction.will_breach = will_breach
        prediction.confidence = confidence
        prediction.root_cause = root_cause
        prediction.recommended_action = recommended_action
    else:
        prediction = OrderPrediction(
            order_id=order.id,
            predicted_completion_days=predicted_completion_days,
            risk_score=risk_score,
            risk_level=risk_level,
            will_breach=will_breach,
            confidence=confidence,
            root_cause=root_cause,
            recommended_action=recommended_action
        )
        db.add(prediction)
    
    db.commit()
    db.refresh(prediction)
    return prediction

def recalculate_all_active_orders(db: Session):
    # Get all active orders
    active_orders = db.query(Order).filter(Order.current_status != "DELIVERED").all()
    predictions = []
    for order in active_orders:
        pred = predict_order_tat(db, order)
        predictions.append(pred)
    return len(predictions)
