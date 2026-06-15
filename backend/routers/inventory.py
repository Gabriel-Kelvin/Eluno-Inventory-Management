from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import LensInventory, InventoryForecast
from schemas import (
    LensInventory as LensInventorySchema, 
    LensInventoryCreate, 
    LensInventoryUpdate,
    InventoryCheckRequest,
    InventoryCheckResponse,
    InventoryForecast as InventoryForecastSchema,
    DashboardStatsResponse,
    InventoryMovement as InventoryMovementSchema,
    StockAdjustmentRequest
)
from services.inventory_service import check_inventory, log_movement
from services.forecasting_engine import get_all_forecasts
from models import LensInventory, InventoryForecast, Order, InventoryMovement

router = APIRouter()

@router.get("/inventory", response_model=List[LensInventorySchema])
def read_inventory(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(LensInventory).offset(skip).limit(limit).all()
    return items

@router.get("/inventory/stats", response_model=DashboardStatsResponse)
def read_inventory_stats(db: Session = Depends(get_db)):
    items = db.query(LensInventory).all()
    total_items = sum(item.quantity for item in items)
    low_stock = sum(1 for item in items if 0 < item.quantity <= item.minimum_threshold)
    out_of_stock = sum(1 for item in items if item.quantity == 0)
    
    orders_waiting = db.query(Order).filter(Order.current_status == "WAITING_FOR_PROCUREMENT").count()
    
    health_score = max(0, 100 - (low_stock * 2 + out_of_stock * 5))
    
    top_forecast = db.query(InventoryForecast).order_by(InventoryForecast.recommended_quantity.desc()).first()
    most_demanded = top_forecast.lens_type if top_forecast else None
    
    return DashboardStatsResponse(
        total_items=total_items,
        low_stock_items=low_stock,
        out_of_stock_items=out_of_stock,
        orders_waiting_procurement=orders_waiting,
        health_score=health_score,
        most_demanded_type=most_demanded
    )

from schemas import Order as OrderSchema
@router.get("/inventory/procurement-queue", response_model=List[OrderSchema])
def get_procurement_queue(db: Session = Depends(get_db)):
    from models import Order
    from sqlalchemy.orm import selectinload
    orders = db.query(Order).options(
        selectinload(Order.status_history),
        selectinload(Order.qc_events),
        selectinload(Order.delay_logs)
    ).filter(Order.current_status == "WAITING_FOR_PROCUREMENT").order_by(Order.created_at.asc()).all()
    return orders

@router.get("/inventory/history", response_model=List[InventoryMovementSchema])
def get_inventory_history(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    from models import InventoryMovement
    from sqlalchemy.orm import selectinload
    movements = db.query(InventoryMovement).options(selectinload(InventoryMovement.inventory_item)).order_by(InventoryMovement.timestamp.desc()).offset(skip).limit(limit).all()
    return movements

@router.get("/inventory/{item_id}", response_model=LensInventorySchema)
def read_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(LensInventory).filter(LensInventory.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item

@router.post("/inventory", response_model=LensInventorySchema)
def create_inventory_item(item: LensInventoryCreate, db: Session = Depends(get_db)):
    db_item = LensInventory(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    if db_item.quantity > 0:
        log_movement(db, db_item.id, "IN", db_item.quantity, "Initial stock")
    return db_item

@router.put("/inventory/{item_id}", response_model=LensInventorySchema)
def update_inventory_item(item_id: int, item: LensInventoryUpdate, db: Session = Depends(get_db)):
    db_item = db.query(LensInventory).filter(LensInventory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    old_qty = db_item.quantity
    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    
    if db_item.quantity != old_qty:
        diff = db_item.quantity - old_qty
        mtype = "IN" if diff > 0 else "OUT"
        log_movement(db, db_item.id, mtype, abs(diff), "Inventory update")
        
    return db_item

@router.delete("/inventory/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(LensInventory).filter(LensInventory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    db.delete(db_item)
    db.commit()
    return {"ok": True}



@router.post("/inventory/{item_id}/adjust", response_model=LensInventorySchema)
def adjust_inventory_stock(item_id: int, request: StockAdjustmentRequest, db: Session = Depends(get_db)):
    db_item = db.query(LensInventory).filter(LensInventory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    new_qty = db_item.quantity + request.amount
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Cannot reduce stock below 0")
    
    db_item.quantity = new_qty
    db.commit()
    db.refresh(db_item)
    
    mtype = "MANUAL_ADJUSTMENT"
    reason = request.reason or ("Stock added" if request.amount > 0 else "Stock removed")
    log_movement(db, db_item.id, mtype, request.amount, reason)
    
    return db_item

@router.post("/inventory/{item_id}/restock", response_model=LensInventorySchema)
def restock_inventory_endpoint(item_id: int, request: StockAdjustmentRequest, db: Session = Depends(get_db)):
    from services.inventory_service import restock_inventory
    # Using the new refactored restock function which auto-releases orders
    return restock_inventory(db, item_id, request.amount)



@router.post("/inventory/check", response_model=InventoryCheckResponse)
def check_inventory_stock(request: InventoryCheckRequest, db: Session = Depends(get_db)):
    return check_inventory(db, request)

@router.get("/forecast", response_model=List[InventoryForecastSchema])
def get_forecasts(db: Session = Depends(get_db)):
    return get_all_forecasts(db)
