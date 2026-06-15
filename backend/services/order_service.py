import uuid
from sqlalchemy.orm import Session
from models import Order, OrderStatusHistory, OrderQcEvent, OrderDelayLog
from schemas import OrderCreate, OrderUpdate, OrderStatusUpdate, OrderQcUpdate, InventoryCheckRequest
from services.inventory_service import check_inventory
from services.tat_prediction_service import predict_order_tat
from fastapi import HTTPException

VALID_TRANSITIONS = {
    "PLACED": ["PRESCRIPTION_VERIFICATION"],
    "WAITING_FOR_PROCUREMENT": ["LENS_ALLOCATION"],
    "PRESCRIPTION_VERIFICATION": ["LENS_ALLOCATION"],
    "LENS_ALLOCATION": ["LAB_PROCESSING"],
    "LAB_PROCESSING": ["COATING"],
    "COATING": ["QUALITY_CHECK"],
    "QUALITY_CHECK": ["PACKAGING", "REWORK_REQUIRED"],
    "PACKAGING": ["SHIPPING"],
    "SHIPPING": ["DELIVERED"],
    "REWORK_REQUIRED": ["LAB_PROCESSING"],
    "DELIVERED": []
}

def create_order(db: Session, order_in: OrderCreate) -> Order:
    # 1. Generate Order Number
    order_number = f"ORD-{str(uuid.uuid4())[:8].upper()}"

    # 2. Check Inventory Automatically
    inv_req = InventoryCheckRequest(
        sphere_power=str(order_in.left_eye_power) if order_in.left_eye_power is not None else "0.0",
        lens_type=order_in.lens_type,
        lens_index=order_in.lens_index,
        coating=order_in.coating
    )
    inv_res = check_inventory(db, inv_req)

    inventory_available = inv_res.available
    procurement_required = not inv_res.available

    initial_status = "WAITING_FOR_PROCUREMENT" if procurement_required else "PLACED"

    # 3. Create Order
    db_order = Order(
        order_number=order_number,
        customer_name=order_in.customer_name,
        store_id=order_in.store_id,
        frame_name=order_in.frame_name,
        left_eye_power=order_in.left_eye_power,
        right_eye_power=order_in.right_eye_power,
        lens_type=order_in.lens_type,
        lens_index=order_in.lens_index,
        coating=order_in.coating,
        current_status=initial_status,
        inventory_available=inventory_available,
        procurement_required=procurement_required,
        sla_days=7
    )
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    # 4. Create initial status history
    log_status_change(db, db_order.id, None, initial_status, "System")

    # 5. Calculate initial risk prediction
    predict_order_tat(db, db_order)

    return db_order

from sqlalchemy.orm import selectinload

def get_orders(db: Session, status: str = None, store_id: int = None, lens_type: str = None, inventory_available: bool = None):
    query = db.query(Order).options(
        selectinload(Order.status_history),
        selectinload(Order.qc_events),
        selectinload(Order.delay_logs)
    )
    if status:
        query = query.filter(Order.current_status == status)
    if store_id:
        query = query.filter(Order.store_id == store_id)
    if lens_type:
        query = query.filter(Order.lens_type == lens_type)
    if inventory_available is not None:
        query = query.filter(Order.inventory_available == inventory_available)
    return query.order_by(Order.created_at.desc()).all()

def get_order(db: Session, order_id: int):
    return db.query(Order).filter(Order.id == order_id).first()

def log_status_change(db: Session, order_id: int, old_status: str, new_status: str, changed_by: str = None, delay_reason: str = None):
    history = OrderStatusHistory(
        order_id=order_id,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        delay_reason=delay_reason
    )
    db.add(history)
    db.commit()

def change_order_status(db: Session, order_id: int, status_update: OrderStatusUpdate) -> Order:
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.current_status
    new_status = status_update.new_status

    if new_status not in VALID_TRANSITIONS.get(old_status, []):
        if old_status == "WAITING_FOR_PROCUREMENT":
            raise HTTPException(status_code=400, detail="Inventory procurement required before manufacturing can begin.")
        raise HTTPException(status_code=400, detail=f"Cannot move directly from {old_status} to {new_status}.")

    order.current_status = new_status
    db.commit()
    db.refresh(order)

    log_status_change(db, order.id, old_status, new_status, status_update.changed_by, status_update.delay_reason)

    if status_update.delay_reason:
        delay_log = OrderDelayLog(order_id=order.id, reason=status_update.delay_reason)
        db.add(delay_log)
        db.commit()

    # Recalculate risk based on new status
    predict_order_tat(db, order)

    return order

def process_order_qc(db: Session, order_id: int, qc_update: OrderQcUpdate) -> Order:
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.current_status != "QUALITY_CHECK":
        raise HTTPException(status_code=400, detail="QC can only be performed when order is in QUALITY_CHECK")

    qc_event = OrderQcEvent(
        order_id=order.id,
        result=qc_update.result,
        failure_reason=qc_update.failure_reason
    )
    db.add(qc_event)

    if qc_update.result == "FAIL":
        old_status = order.current_status
        order.current_status = "REWORK_REQUIRED"
        log_status_change(db, order.id, old_status, "REWORK_REQUIRED", "System QC", qc_update.failure_reason)
    elif qc_update.result == "PASS":
        old_status = order.current_status
        order.current_status = "PACKAGING"
        log_status_change(db, order.id, old_status, "PACKAGING", "System QC", None)
    
    db.commit()
    db.refresh(order)

    # Recalculate risk based on QC outcome
    predict_order_tat(db, order)

    return order


