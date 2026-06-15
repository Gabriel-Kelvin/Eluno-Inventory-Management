import random
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import LensInventory, Store
from services.forecasting_engine import generate_forecasts

def seed_database():
    print("Creating tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Seed Stores
        print("Seeding stores...")
        stores = [
            Store(store_name="Downtown Vision", city="New York", state="NY"),
            Store(store_name="Westside Eye Care", city="Los Angeles", state="CA"),
            Store(store_name="Metro Optics", city="Chicago", state="IL"),
        ]
        db.add_all(stores)
        db.commit()
        
        # Seed Inventory
        print("Seeding inventory...")
        lens_types = ["Single Vision", "Progressive", "Bifocal"]
        indexes = ["1.50", "1.56", "1.60", "1.67"]
        coatings = ["Blue Cut", "Anti Glare", "UV Protection", "Photochromic"]
        
        powers = []
        # Generate some common powers
        for sph in range(-600, 425, 25): # -6.00 to +4.00
            powers.append(sph / 100.0)
            
        inventory_items = []
        for _ in range(120): # 120 random items
            quantity = random.choices(
                [0, random.randint(1, 9), random.randint(10, 50), random.randint(50, 150)],
                weights=[0.1, 0.2, 0.5, 0.2] # 10% out of stock, 20% low stock
            )[0]
            
            item = LensInventory(
                sphere_power=random.choice(powers),
                cylinder_power=random.choice([0.0, -0.5, -1.0, -1.5, -2.0]),
                axis=random.choice([0, 90, 180]),
                lens_type=random.choice(lens_types),
                lens_index=random.choice(indexes),
                coating=random.choice(coatings),
                quantity=quantity,
                minimum_threshold=10,
                supplier_name="Global Lenses Inc",
                store_id=random.choice(stores).id
            )
            inventory_items.append(item)
            
        db.add_all(inventory_items)
        db.commit()
        
        print("Generating synthetic forecasts...")
        generate_forecasts(db)
        
        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
