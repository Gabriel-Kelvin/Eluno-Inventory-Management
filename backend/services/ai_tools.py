from database import SessionLocal
from models import OrderPrediction, Order, LensInventory, OrderQcEvent, Store
from sqlalchemy import func

def get_high_risk_orders():
    """Returns a list of high risk orders that need immediate operational attention, including their order numbers, risk scores, root causes, and recommended actions."""
    db = SessionLocal()
    try:
        predictions = db.query(OrderPrediction).join(Order).filter(
            OrderPrediction.risk_level == "HIGH",
            Order.current_status != "DELIVERED"
        ).limit(10).all()
        
        results = []
        for p in predictions:
            results.append({
                "order_number": p.order.order_number,
                "risk_score": p.risk_score,
                "root_cause": p.root_cause,
                "recommended_action": p.recommended_action
            })
        return {"high_risk_orders": results}
    finally:
        db.close()

def get_predicted_breaches():
    """Returns a list of active orders that are predicted to breach their SLA time."""
    db = SessionLocal()
    try:
        predictions = db.query(OrderPrediction).join(Order).filter(
            OrderPrediction.will_breach == True,
            Order.current_status != "DELIVERED"
        ).limit(10).all()
        
        results = []
        for p in predictions:
            results.append({
                "order_number": p.order.order_number,
                "predicted_completion_days": p.predicted_completion_days,
                "confidence": p.confidence
            })
        return {"predicted_breaches": results}
    finally:
        db.close()

def get_inventory_shortages():
    """Returns a list of lens inventory items that are currently below their minimum threshold and need to be restocked."""
    db = SessionLocal()
    try:
        shortages = db.query(LensInventory).filter(LensInventory.quantity <= LensInventory.minimum_threshold).limit(10).all()
        results = []
        for item in shortages:
            results.append({
                "lens_type": item.lens_type,
                "sphere_power": item.sphere_power,
                "quantity": item.quantity,
                "minimum_threshold": item.minimum_threshold
            })
        return {"inventory_shortages": results}
    finally:
        db.close()

def get_qc_failures():
    """Returns a list of recent Quality Control (QC) failure events and their reasons."""
    db = SessionLocal()
    try:
        failures = db.query(OrderQcEvent).join(Order).filter(OrderQcEvent.result == "FAIL").order_by(OrderQcEvent.created_at.desc()).limit(10).all()
        results = []
        for f in failures:
            results.append({
                "order_number": f.order.order_number,
                "failure_reason": f.failure_reason,
                "date": str(f.created_at)
            })
        return {"recent_qc_failures": results}
    finally:
        db.close()

def get_store_performance():
    """Returns performance metrics for all stores, including total orders, delays, reworks, and SLA breaches per store."""
    db = SessionLocal()
    try:
        stores = db.query(Store).all()
        results = []
        for store in stores:
            orders = db.query(Order).filter(Order.store_id == store.id).all()
            total_orders = len(orders)
            reworks = sum(1 for o in orders if o.current_status == "REWORK_REQUIRED")
            
            # Predict breaches using order_predictions
            order_ids = [o.id for o in orders]
            breaches = db.query(OrderPrediction).filter(OrderPrediction.order_id.in_(order_ids), OrderPrediction.will_breach == True).count()
            
            results.append({
                "store_name": store.store_name,
                "total_orders": total_orders,
                "reworks": reworks,
                "predicted_breaches": breaches
            })
        return {"store_performance": results}
    finally:
        db.close()

def get_operational_summary():
    """Returns overall platform metrics, including total active orders, total breaches, and average risk score."""
    db = SessionLocal()
    try:
        active_orders = db.query(Order).filter(Order.current_status != "DELIVERED").count()
        breaches = db.query(OrderPrediction).join(Order).filter(OrderPrediction.will_breach == True, Order.current_status != "DELIVERED").count()
        
        avg_risk_query = db.query(func.avg(OrderPrediction.risk_score)).join(Order).filter(Order.current_status != "DELIVERED").scalar()
        avg_risk = round(avg_risk_query, 1) if avg_risk_query else 0

        return {
            "operational_summary": {
                "total_active_orders": active_orders,
                "total_predicted_breaches": breaches,
                "average_risk_score": avg_risk
            }
        }
    finally:
        db.close()

# List of all tools to pass to Gemini
OPERATION_TOOLS = [
    get_high_risk_orders,
    get_predicted_breaches,
    get_inventory_shortages,
    get_qc_failures,
    get_store_performance,
    get_operational_summary
]
