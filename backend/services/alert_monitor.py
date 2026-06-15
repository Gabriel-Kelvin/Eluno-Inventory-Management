import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Order, OrderPrediction, AlertLog, SystemSetting, OrderStatusHistory, OrderQcEvent
from services.email_service import send_alert_email



def should_send_alert(db: Session, order_id: int, alert_type: str) -> bool:
    # Anti-spam check: only 1 email per order per alert type every 24 hours
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    existing = db.query(AlertLog).filter(
        AlertLog.order_id == order_id,
        AlertLog.alert_type == alert_type,
        AlertLog.sent_at >= cutoff
    ).first()
    return existing is None

def dispatch_alert(db: Session, order: Order, alert_type: str, subject: str, recipient: str, risk_score: int, predicted_days: float, root_cause: str, recommended_action: str):
    if not should_send_alert(db, order.id, alert_type):
        return

    context = {
        "order_id": order.order_number,
        "customer": order.customer_name,
        "store": order.store.store_name if order.store else "N/A",
        "status": order.current_status,
        "risk_score": risk_score,
        "predicted_completion": f"In {predicted_days:.1f} days" if predicted_days >= 0 else "Overdue",
        "root_cause": root_cause,
        "recommended_action": recommended_action
    }

    success = send_alert_email(recipient, subject, context)
    if success:
        log = AlertLog(
            order_id=order.id,
            alert_type=alert_type,
            recipient=recipient,
            status="SENT"
        )
        db.add(log)
        db.commit()

def run_alert_checks():
    db = SessionLocal()
    try:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "ALERT_EMAIL").first()
        if not setting or not setting.value:
            logging.warning("ALERT_EMAIL not configured in SystemSettings. Skipping alerts.")
            return

        recipient = setting.value
        active_orders = db.query(Order).filter(Order.current_status != "DELIVERED").all()

        for order in active_orders:
            # Get latest prediction
            prediction = db.query(OrderPrediction).filter(OrderPrediction.order_id == order.id).first()
            risk_score = prediction.risk_score if prediction else 0
            predicted_days = prediction.predicted_completion_days if prediction else 0.0
            root_cause = prediction.root_cause if prediction else "N/A"
            recommended_action = prediction.recommended_action if prediction else "N/A"

            # Trigger 1: Predicted SLA Breach
            if risk_score > 70:
                dispatch_alert(
                    db, order, "PREDICTED_SLA_BREACH", 
                    "[Eluno Alert] Predicted SLA Breach Alert", 
                    recipient, risk_score, predicted_days, root_cause, recommended_action
                )

            # Trigger 2: Actual SLA Breach
            now_utc = datetime.now(timezone.utc)
            order_created_utc = order.created_at
            if order_created_utc.tzinfo is None:
                order_created_utc = order_created_utc.replace(tzinfo=timezone.utc)
            
            days_passed = (now_utc - order_created_utc).days
            remaining_sla = order.sla_days - days_passed
            
            if remaining_sla < 0:
                dispatch_alert(
                    db, order, "ACTUAL_SLA_BREACH", 
                    "[Eluno Alert] SLA Breach Detected", 
                    recipient, risk_score, predicted_days, "SLA deadline has passed", "Expedite manufacturing immediately"
                )

            # Trigger 3: Procurement Delay
            if order.current_status == "WAITING_FOR_PROCUREMENT":
                latest_history = db.query(OrderStatusHistory).filter(
                    OrderStatusHistory.order_id == order.id,
                    OrderStatusHistory.new_status == "WAITING_FOR_PROCUREMENT"
                ).order_by(OrderStatusHistory.changed_at.desc()).first()
                
                if latest_history:
                    change_time_utc = latest_history.changed_at
                    if change_time_utc.tzinfo is None:
                        change_time_utc = change_time_utc.replace(tzinfo=timezone.utc)
                    if (now_utc - change_time_utc).total_seconds() > 24 * 3600:
                        dispatch_alert(
                            db, order, "PROCUREMENT_DELAY", 
                            "[Eluno Alert] Procurement Delay Alert", 
                            recipient, risk_score, predicted_days, "Waiting for procurement > 24h", "Contact supplier or restock inventory"
                        )

            # Trigger 4: QC Failure
            recent_qc = db.query(OrderQcEvent).filter(
                OrderQcEvent.order_id == order.id,
                OrderQcEvent.result == "FAIL"
            ).order_by(OrderQcEvent.created_at.desc()).first()
            
            if recent_qc:
                qc_time_utc = recent_qc.created_at
                if qc_time_utc.tzinfo is None:
                    qc_time_utc = qc_time_utc.replace(tzinfo=timezone.utc)
                # Ensure the QC failure happened recently to avoid alerting on very old resolved ones if not handled by anti-spam
                if (now_utc - qc_time_utc).total_seconds() < 24 * 3600:
                    dispatch_alert(
                        db, order, "QC_FAILURE", 
                        "[Eluno Alert] Quality Control Failure", 
                        recipient, risk_score, predicted_days, f"QC Failed: {recent_qc.failure_reason}", "Initiate rework process"
                    )

    finally:
        db.close()
