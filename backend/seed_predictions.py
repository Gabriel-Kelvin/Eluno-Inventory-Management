from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
from models import SlaRule, Order
import services.tat_prediction_service as prediction_service

Base.metadata.create_all(bind=engine)

def seed_predictions():
    db = SessionLocal()
    try:
        # Seed SLA Rules
        rules_data = [
            {"lens_type": "Single Vision", "sla_days": 2},
            {"lens_type": "Progressive", "sla_days": 5},
            {"lens_type": "Bifocal", "sla_days": 4},
        ]
        
        for r_data in rules_data:
            existing = db.query(SlaRule).filter(SlaRule.lens_type == r_data["lens_type"]).first()
            if not existing:
                rule = SlaRule(**r_data)
                db.add(rule)
        
        db.commit()
        print("SLA Rules seeded.")

        # Recalculate Risk for all non-delivered orders
        count = prediction_service.recalculate_all_active_orders(db)
        print(f"Recalculated predictions for {count} active orders.")

    except Exception as e:
        print(f"Error seeding predictions: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_predictions()
