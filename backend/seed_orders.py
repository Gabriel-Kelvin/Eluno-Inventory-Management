import random
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
from models import Order, OrderStatusHistory, OrderQcEvent, Store

# Create tables if not exist
Base.metadata.create_all(bind=engine)

def seed_orders():
    db = SessionLocal()
    try:
        # Get stores
        stores = db.query(Store).all()
        if not stores:
            print("No stores found! Please run seed.py first.")
            return

        store_ids = [store.id for store in stores]
        
        # Distributions
        lens_types = ["Single Vision", "Progressive", "Bifocal"]
        lens_weights = [0.6, 0.3, 0.1]
        indexes = ["1.50", "1.56", "1.60", "1.67"]
        coatings = ["Blue Cut", "Anti Glare", "UV Protection", "Photochromic"]

        statuses = [
            "PLACED", "PRESCRIPTION_VERIFICATION", "LENS_ALLOCATION", 
            "LAB_PROCESSING", "COATING", "QUALITY_CHECK", 
            "PACKAGING", "SHIPPING", "DELIVERED", "REWORK_REQUIRED"
        ]
        
        # We'll make most orders DELIVERED (e.g. historical data) and the rest scattered
        status_weights = [0.05, 0.05, 0.05, 0.1, 0.1, 0.05, 0.05, 0.1, 0.4, 0.05]

        powers = [sph / 100.0 for sph in range(-600, 425, 25)]

        first_names = ["John", "Jane", "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

        orders = []
        histories = []
        qc_events = []

        print("Generating 1000 orders...")
        
        now = datetime.utcnow()

        for i in range(1000):
            # 15% inventory shortage
            has_shortage = random.random() < 0.15
            
            lens_type = random.choices(lens_types, weights=lens_weights)[0]
            current_status = random.choices(statuses, weights=status_weights)[0]
            
            created_at = now - timedelta(days=random.randint(1, 30), hours=random.randint(0, 23))
            
            order = Order(
                order_number=f"ORD-{str(uuid.uuid4())[:8].upper()}",
                customer_name=f"{random.choice(first_names)} {random.choice(last_names)}",
                store_id=random.choice(store_ids),
                frame_name=f"Frame Model {random.randint(100, 999)}",
                left_eye_power=random.choice(powers),
                right_eye_power=random.choice(powers),
                lens_type=lens_type,
                lens_index=random.choice(indexes),
                coating=random.choice(coatings),
                current_status=current_status,
                inventory_available=not has_shortage,
                procurement_required=has_shortage,
                sla_days=7,
                created_at=created_at,
                updated_at=created_at + timedelta(days=random.randint(1, 3))
            )
            orders.append(order)

        # Bulk insert orders
        db.add_all(orders)
        db.commit()

        # Add some QC events and histories
        for order in orders:
            # 8% QC failure rate
            if random.random() < 0.08:
                qc_event = OrderQcEvent(
                    order_id=order.id,
                    result="FAIL",
                    failure_reason=random.choice(["Scratched lens", "Coating uneven", "Wrong power index", "Axis misalignment"]),
                    created_at=order.created_at + timedelta(days=1)
                )
                qc_events.append(qc_event)
                
                # If they had a QC failure, they must have hit REWORK_REQUIRED at some point
                # If the order is currently beyond LAB_PROCESSING, let's add a history for it
                history = OrderStatusHistory(
                    order_id=order.id,
                    old_status="QUALITY_CHECK",
                    new_status="REWORK_REQUIRED",
                    changed_by="System QC",
                    delay_reason="QC Failed",
                    changed_at=order.created_at + timedelta(days=1, hours=2)
                )
                histories.append(history)

            # Add basic initial history for all
            histories.append(OrderStatusHistory(
                order_id=order.id,
                old_status=None,
                new_status="PLACED",
                changed_by="System",
                changed_at=order.created_at
            ))

        db.add_all(qc_events)
        db.add_all(histories)
        db.commit()

        print("Successfully seeded 1000 orders!")

    except Exception as e:
        print(f"Error seeding orders: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_orders()
