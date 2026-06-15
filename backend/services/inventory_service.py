from sqlalchemy.orm import Session
from models import LensInventory, InventoryMovement
from schemas import InventoryCheckRequest, InventoryCheckResponse

def log_movement(db: Session, inventory_id: int, movement_type: str, quantity: int, notes: str = None):
    movement = InventoryMovement(
        inventory_id=inventory_id,
        movement_type=movement_type,
        quantity=quantity,
        notes=notes
    )
    db.add(movement)
    db.commit()

def check_inventory(db: Session, request: InventoryCheckRequest) -> InventoryCheckResponse:
    # Convert sphere_power string to float if possible for DB query
    try:
        power = float(request.sphere_power)
    except ValueError:
        power = 0.0

    inventory_item = db.query(LensInventory).filter(
        LensInventory.sphere_power == power,
        LensInventory.lens_type == request.lens_type,
        LensInventory.lens_index == request.lens_index,
        LensInventory.coating == request.coating
    ).first()

    if not inventory_item:
        return InventoryCheckResponse(
            available=False,
            quantity=0,
            estimated_fulfillment="Procurement Required",
            health_score=0,
            risk_level="HIGH"
        )

    available = inventory_item.quantity > 0
    estimated_fulfillment = "Same Day" if available else "Procurement Required"
    
    # Calculate health score (Rules-based)
    quantity = inventory_item.quantity
    threshold = inventory_item.minimum_threshold
    
    if quantity == 0:
        health_score = 0
        risk_level = "HIGH"
    elif quantity <= threshold:
        # Scale between 10 and 50
        health_score = int(10 + (quantity / threshold) * 40)
        risk_level = "MEDIUM"
    else:
        # Scale between 50 and 100
        # Assume max realistic stock is 100 for this score calculation
        ratio = min((quantity - threshold) / 50.0, 1.0)
        health_score = int(50 + ratio * 50)
        risk_level = "LOW"
        
    return InventoryCheckResponse(
        available=available,
        quantity=quantity,
        estimated_fulfillment=estimated_fulfillment,
        health_score=health_score,
        risk_level=risk_level
    )

from models import Order, OrderStatusHistory
from services.tat_prediction_service import predict_order_tat
from fastapi import HTTPException

def restock_inventory(db: Session, item_id: int, add_quantity: int) -> LensInventory:
    inventory_item = db.query(LensInventory).filter(LensInventory.id == item_id).first()
    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    inventory_item.quantity += add_quantity
    db.commit()
    db.refresh(inventory_item)
    
    log_movement(db, inventory_item.id, "PROCUREMENT_RECEIVED", add_quantity, "Restocked via Procurement Queue")
    
    # Automatic Order Release
    waiting_orders = db.query(Order).filter(Order.current_status == "WAITING_FOR_PROCUREMENT").all()
    for order in waiting_orders:
        power = float(order.left_eye_power) if order.left_eye_power is not None else 0.0
        
        # Check if this order needs the restocked item
        if (order.lens_type == inventory_item.lens_type and
            order.lens_index == inventory_item.lens_index and
            order.coating == inventory_item.coating and
            power == inventory_item.sphere_power):
            
            # If we have stock, release it
            # Note: We do not decrement stock here to maintain consistency with previous implementation.
            # Stock decrementing would usually happen at dispatch or allocation.
            # If stock > 0, we can release
            if inventory_item.quantity > 0:
                old_status = order.current_status
                order.current_status = "LENS_ALLOCATION"
                order.inventory_available = True
                db.commit()
                
                # Log timeline event
                history = OrderStatusHistory(
                    order_id=order.id,
                    old_status=old_status,
                    new_status="LENS_ALLOCATION",
                    changed_by="System",
                    delay_reason="Inventory Received, Manufacturing Released"
                )
                db.add(history)
                db.commit()
                
                # Recalculate risk
                predict_order_tat(db, order)
                
    return inventory_item
