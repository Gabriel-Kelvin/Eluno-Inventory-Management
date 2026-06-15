from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Order, LensInventory, OrderQcEvent, OrderStatusHistory
from schemas import OrderCreate, OrderQcUpdate
from services.order_service import create_order, process_order_qc
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.post("/high-risk-order")
def create_high_risk_order(db: Session = Depends(get_db)):
    """Creates a complex progressive order that is out of stock."""
    # Ensure there's a missing progressive lens scenario
    lens_type = "Progressive"
    lens_index = "1.67"
    coating = "Blue Cut"
    power = -5.00
    
    # Set inventory to 0 for this combination to force procurement
    inv = db.query(LensInventory).filter_by(
        lens_type=lens_type, 
        lens_index=lens_index, 
        coating=coating, 
        sphere_power=str(power)
    ).first()
    
    if not inv:
        inv = LensInventory(
            lens_type=lens_type,
            lens_index=lens_index,
            coating=coating,
            sphere_power=str(power),
            quantity=0
        )
        db.add(inv)
    else:
        inv.quantity = 0
    db.commit()

    order_in = OrderCreate(
        customer_name="Demo High Risk Patient",
        store_id=1,
        frame_name="Ray-Ban Aviator",
        left_eye_power=power,
        right_eye_power=power,
        lens_type=lens_type,
        lens_index=lens_index,
        coating=coating
    )
    
    # Create the order (this will trigger risk calculation due to our recent changes)
    order = create_order(db, order_in)
    return {"message": "High risk order created", "order_id": order.id, "order_number": order.order_number}

@router.post("/inventory-shortage")
def simulate_inventory_shortage(db: Session = Depends(get_db)):
    """Sets a highly popular lens stock to 0."""
    # Find a popular lens
    inv = db.query(LensInventory).filter(LensInventory.quantity > 50).first()
    if not inv:
        raise HTTPException(status_code=400, detail="No sufficient inventory to simulate shortage")
    
    old_qty = inv.quantity
    inv.quantity = 0
    db.commit()
    
    return {
        "message": "Inventory shortage simulated", 
        "lens_type": inv.lens_type, 
        "power": inv.sphere_power, 
        "old_quantity": old_qty
    }

@router.post("/qc-failure")
def trigger_qc_failure(db: Session = Depends(get_db)):
    """Finds an order in QUALITY_CHECK and fails it."""
    order = db.query(Order).filter(Order.current_status == "QUALITY_CHECK").first()
    
    # If no order in QC, move one there
    if not order:
        order = db.query(Order).filter(Order.current_status == "COATING").first()
        if order:
            order.current_status = "QUALITY_CHECK"
            db.commit()
            
    if not order:
        raise HTTPException(status_code=400, detail="Could not find an appropriate order to fail QC.")

    qc_update = OrderQcUpdate(
        result="FAIL",
        failure_reason="Demo QC Failure: Scratched coating"
    )
    process_order_qc(db, order.id, qc_update)
    
    return {"message": "QC failure triggered", "order_number": order.order_number}

@router.post("/sla-breach")
def create_sla_breach(db: Session = Depends(get_db)):
    """Takes an existing order and fakes its created_at timestamp to be 10 days ago."""
    # Find a regular order
    order = db.query(Order).filter(Order.current_status != "DELIVERED").first()
    if not order:
        raise HTTPException(status_code=400, detail="No active orders available to breach.")
    
    # Move back 10 days
    past_date = datetime.now(timezone.utc) - timedelta(days=10)
    order.created_at = past_date
    
    # Also update its first history log to match
    first_history = db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == order.id).order_by(OrderStatusHistory.changed_at.asc()).first()
    if first_history:
        first_history.changed_at = past_date
    
    db.commit()
    
    # Recalculate risk to flag it instantly
    from services.tat_prediction_service import predict_order_tat
    predict_order_tat(db, order)
    
    return {"message": "SLA breach simulated", "order_number": order.order_number}
