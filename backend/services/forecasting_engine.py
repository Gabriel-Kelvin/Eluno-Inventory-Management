import random
from sqlalchemy.orm import Session
from models import InventoryForecast

def generate_forecasts(db: Session):
    """
    Simulates 5000 historical orders and generates forecast recommendations.
    This is called by the seed script to populate the inventory_forecasts table.
    """
    
    # 1. Generate 5000 synthetic historical orders
    lens_types = ["Single Vision", "Progressive", "Bifocal"]
    type_weights = [0.70, 0.25, 0.05] # High, Medium, Low frequency
    
    # Common powers
    powers = ["-0.50", "-1.00", "-1.50", "-2.00", "-2.50", "-3.00", "-3.50", "-4.00", "+1.00", "+1.50", "+2.00"]
    power_weights = [0.05, 0.1, 0.15, 0.2, 0.15, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05]
    
    orders = []
    for _ in range(5000):
        l_type = random.choices(lens_types, weights=type_weights)[0]
        power = random.choices(powers, weights=power_weights)[0]
        orders.append({"lens_type": l_type, "power": power})
        
    # 2. Analyze demand (Count frequencies)
    demand = {}
    for order in orders:
        key = (order["lens_type"], order["power"])
        demand[key] = demand.get(key, 0) + 1
        
    # 3. Generate recommendations and save to DB
    # Clear existing forecasts
    db.query(InventoryForecast).delete()
    
    forecasts_to_insert = []
    for (l_type, power), count in demand.items():
        # Recommend ordering roughly 10% of historical demand as buffer
        recommended = int(count * 0.10)
        if recommended < 5:
            recommended = 10 # minimum batch
            
        reason = f"High historical demand ({count} past orders)" if count > 200 else f"Moderate demand ({count} past orders)"
        
        forecast = InventoryForecast(
            power=power,
            lens_type=l_type,
            recommended_quantity=recommended,
            forecast_reason=reason
        )
        forecasts_to_insert.append(forecast)
        
    db.add_all(forecasts_to_insert)
    db.commit()

def get_all_forecasts(db: Session):
    return db.query(InventoryForecast).order_by(InventoryForecast.recommended_quantity.desc()).all()
