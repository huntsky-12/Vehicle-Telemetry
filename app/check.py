from app.database import SessionLocal
from app.model import Vehicle
 # Make sure this is the correct import path

db = SessionLocal()

api_key_to_check = "Add the api here for test."
vehicle = db.query(Vehicle).filter_by(api_key=api_key_to_check).first()

if vehicle:
    print(f"✅ Vehicle found: {vehicle.vehicle_id}")
else:
    print("❌ API Key not found. Please register this vehicle.")
