from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class LensInventory(Base):
    __tablename__ = "lens_inventory"

    id = Column(Integer, primary_key=True, index=True)
    sphere_power = Column(Float, nullable=False, index=True)
    cylinder_power = Column(Float, nullable=True)
    axis = Column(Integer, nullable=True)
    lens_type = Column(String, nullable=False, index=True)
    lens_index = Column(String, nullable=False)
    coating = Column(String, nullable=False, index=True)
    quantity = Column(Integer, default=0)
    minimum_threshold = Column(Integer, default=10)
    supplier_name = Column(String, nullable=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    store = relationship("Store")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("lens_inventory.id"))
    movement_type = Column(String, nullable=False) # IN, OUT, ADJUSTMENT
    quantity = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String, nullable=False)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)

class InventoryForecast(Base):
    __tablename__ = "inventory_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    power = Column(String, nullable=False) # Storing as string to handle e.g. "-2.00"
    lens_type = Column(String, nullable=False)
    recommended_quantity = Column(Integer, nullable=False)
    forecast_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    frame_name = Column(String, nullable=True)
    left_eye_power = Column(Float, nullable=True)
    right_eye_power = Column(Float, nullable=True)
    lens_type = Column(String, nullable=False)
    lens_index = Column(String, nullable=False)
    coating = Column(String, nullable=False)
    current_status = Column(String, nullable=False, default="PLACED")
    inventory_available = Column(Boolean, default=False)
    procurement_required = Column(Boolean, default=False)
    sla_days = Column(Integer, default=7)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    store = relationship("Store")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")
    qc_events = relationship("OrderQcEvent", back_populates="order", cascade="all, delete-orphan")
    delay_logs = relationship("OrderDelayLog", back_populates="order", cascade="all, delete-orphan")

class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    changed_by = Column(String, nullable=True)
    delay_reason = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="status_history")

class OrderQcEvent(Base):
    __tablename__ = "order_qc_events"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    result = Column(String, nullable=False) # PASS or FAIL
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="qc_events")

class OrderDelayLog(Base):
    __tablename__ = "order_delay_logs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="delay_logs")

class SlaRule(Base):
    __tablename__ = "sla_rules"

    id = Column(Integer, primary_key=True, index=True)
    lens_type = Column(String, unique=True, index=True, nullable=False)
    sla_days = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class OrderPrediction(Base):
    __tablename__ = "order_predictions"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    predicted_completion_days = Column(Float, nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False) # LOW, MEDIUM, HIGH
    will_breach = Column(Boolean, default=False)
    confidence = Column(Integer, nullable=False) # 0-100
    root_cause = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    order = relationship("Order")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    alert_type = Column(String, nullable=False) # PREDICTED_SLA_BREACH, ACTUAL_SLA_BREACH, PROCUREMENT_DELAY, QC_FAILURE
    recipient = Column(String, nullable=False)
    status = Column(String, default="SENT")
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order")
