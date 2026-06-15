from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from schemas import Order, OrderCreate, OrderUpdate, OrderStatusUpdate, OrderQcUpdate
import services.order_service as order_service

router = APIRouter()

@router.post("/", response_model=Order)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    return order_service.create_order(db, order_in)

@router.get("/", response_model=List[Order])
def get_orders(
    status: Optional[str] = None,
    store_id: Optional[int] = None,
    lens_type: Optional[str] = None,
    inventory_available: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    return order_service.get_orders(db, status=status, store_id=store_id, lens_type=lens_type, inventory_available=inventory_available)

@router.get("/{order_id}", response_model=Order)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.put("/{order_id}", response_model=Order)
def update_order(order_id: int, order_in: OrderUpdate, db: Session = Depends(get_db)):
    order = order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = order_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)
    
    db.commit()
    db.refresh(order)
    return order

@router.post("/{order_id}/status", response_model=Order)
def update_order_status(order_id: int, status_update: OrderStatusUpdate, db: Session = Depends(get_db)):
    return order_service.change_order_status(db, order_id, status_update)

@router.post("/{order_id}/qc", response_model=Order)
def process_order_qc(order_id: int, qc_update: OrderQcUpdate, db: Session = Depends(get_db)):
    return order_service.process_order_qc(db, order_id, qc_update)


