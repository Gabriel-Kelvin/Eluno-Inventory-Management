from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class LensInventoryBase(BaseModel):
    sphere_power: float
    cylinder_power: Optional[float] = None
    axis: Optional[int] = None
    lens_type: str
    lens_index: str
    coating: str
    quantity: int
    minimum_threshold: int = 10
    supplier_name: Optional[str] = None
    store_id: Optional[int] = None

class LensInventoryCreate(LensInventoryBase):
    pass

class LensInventoryUpdate(BaseModel):
    sphere_power: Optional[float] = None
    cylinder_power: Optional[float] = None
    axis: Optional[int] = None
    lens_type: Optional[str] = None
    lens_index: Optional[str] = None
    coating: Optional[str] = None
    quantity: Optional[int] = None
    minimum_threshold: Optional[int] = None
    supplier_name: Optional[str] = None
    store_id: Optional[int] = None

class LensInventory(LensInventoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class InventoryCheckRequest(BaseModel):
    sphere_power: str
    lens_type: str
    lens_index: str
    coating: str

class InventoryCheckResponse(BaseModel):
    available: bool
    quantity: int
    estimated_fulfillment: str
    health_score: Optional[int] = None
    risk_level: Optional[str] = None

class InventoryForecastBase(BaseModel):
    power: str
    lens_type: str
    recommended_quantity: int
    forecast_reason: Optional[str] = None

class InventoryForecast(InventoryForecastBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InventoryMovementBase(BaseModel):
    inventory_id: int
    movement_type: str
    quantity: int
    notes: Optional[str] = None

class InventoryMovementCreate(InventoryMovementBase):
    pass

class InventoryMovement(InventoryMovementBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StockAdjustmentRequest(BaseModel):
    amount: int
    reason: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    reply: str

class DashboardStatsResponse(BaseModel):
    total_items: int
    low_stock_items: int
    out_of_stock_items: int
    orders_waiting_procurement: int
    health_score: int
    most_demanded_type: Optional[str] = None

class OrderCreate(BaseModel):
    customer_name: str
    store_id: int
    frame_name: Optional[str] = None
    left_eye_power: Optional[float] = None
    right_eye_power: Optional[float] = None
    lens_type: str
    lens_index: str
    coating: str

class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    frame_name: Optional[str] = None
    left_eye_power: Optional[float] = None
    right_eye_power: Optional[float] = None
    lens_type: Optional[str] = None
    lens_index: Optional[str] = None
    coating: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    new_status: str
    delay_reason: Optional[str] = None
    changed_by: Optional[str] = None

class OrderQcUpdate(BaseModel):
    result: str # PASS or FAIL
    failure_reason: Optional[str] = None

class OrderStatusHistory(BaseModel):
    id: int
    order_id: int
    old_status: Optional[str] = None
    new_status: str
    changed_by: Optional[str] = None
    delay_reason: Optional[str] = None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OrderQcEvent(BaseModel):
    id: int
    order_id: int
    result: str
    failure_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OrderDelayLog(BaseModel):
    id: int
    order_id: int
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Order(BaseModel):
    id: int
    order_number: str
    customer_name: str
    store_id: int
    frame_name: Optional[str] = None
    left_eye_power: Optional[float] = None
    right_eye_power: Optional[float] = None
    lens_type: str
    lens_index: str
    coating: str
    current_status: str
    inventory_available: bool
    procurement_required: bool
    sla_days: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    status_history: List[OrderStatusHistory] = []
    qc_events: List[OrderQcEvent] = []
    delay_logs: List[OrderDelayLog] = []

    model_config = ConfigDict(from_attributes=True)

class SlaRuleBase(BaseModel):
    lens_type: str
    sla_days: int

class SlaRuleCreate(SlaRuleBase):
    pass

class SlaRule(SlaRuleBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OrderPredictionBase(BaseModel):
    predicted_completion_days: float
    risk_score: int
    risk_level: str
    will_breach: bool
    confidence: int
    root_cause: Optional[str] = None
    recommended_action: Optional[str] = None

class OrderPrediction(OrderPredictionBase):
    id: int
    order_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SystemSettingBase(BaseModel):
    key: str
    value: Optional[str] = None

class SystemSettingUpdate(BaseModel):
    value: Optional[str] = None

class SystemSetting(SystemSettingBase):
    id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AlertLogBase(BaseModel):
    order_id: int
    alert_type: str
    recipient: str
    status: str

class AlertLog(AlertLogBase):
    id: int
    sent_at: datetime
    
    order: Optional[Order] = None

    model_config = ConfigDict(from_attributes=True)
