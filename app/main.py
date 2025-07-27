
from fastapi import FastAPI,Depends,Header, HTTPException
from sqlalchemy.orm import Session
from . import model, schema,crud
from typing import Optional
from .database import engine,SessionLocal
from datetime import date
from .model import Vehicle
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .util import generate_api_key
#create new db tables
model.Base.metadata.create_all(bind=engine)


app = FastAPI()


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change "*" to ["http://localhost:3000"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root():
    return {"message": "✅ Vehicle Telemetry API is live!"}
def read_root():
    return {"message": "Vehicle Telemetry API is running 🚗"}

def get_db(): ## a new database session to each request, and ensures it's closed afterward.
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()
def validate_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)):
    vehicle = crud.get_vehicle_by_api_key(db, x_api_key)
    if not vehicle:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return vehicle.vehicle_id
@app.post("/register_vehicle")
def register_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    # Check if vehicle already exists (optional)
    existing = db.query(model.Vehicle).filter_by(vehicle_id=vehicle_id).first()
    if existing:
        return {"error": "Vehicle already registered", "api_key": existing.api_key}

    api_key = generate_api_key()
    new_vehicle = model.Vehicle(vehicle_id=vehicle_id, api_key=api_key)
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return {
        "vehicle_id": new_vehicle.vehicle_id,
        "api_key": new_vehicle.api_key
    }
@app.post("/telemetry/", response_model=schema.Telemetry_out)
def create_telemetry(data: schema.Telemetry_Create,db:Session=Depends(get_db),x_api_key: str = Header(...)): ## Data injection using depends
    vehicle = db.query(model.Vehicle).filter_by(api_key=x_api_key).first()
    if not vehicle or vehicle.vehicle_id!=data.vehicle_id:
        raise HTTPException(status_code=403,detail="Invalid API Key or vehicle mismatch")
    return crud.Create_telemetry(db=db,data=data)

@app.get("/telemetry", response_model=list[schema.Telemetry_out])
def read_telemetry(skip: int =0,limit: int =100, db: Session=Depends(get_db)):
    return crud.get_all_telemetry(db=db,skip=skip,limit=limit) # skip: How many rows to skip (for pagination). limit: Maximum number of rows to return.

@app.delete("/telemetry/",response_model=schema.Telemetry_out)
def delete_telemetry(telemetry_id:int,db: Session=Depends(get_db),vehicle_id:str=Depends(validate_api_key)):
    item=crud.delete_telemetry_item(db,telemetry_id)
    if not item:
        raise HTTPException(status_code=404,detail="Telemetry to delete is not found.")
    return item

@app.put("/telemetry/",response_model=list[schema.Telemetry_out])
def update_telemetry(telemetry_id:int,data:schema.Telemetry_Create,db: Session=Depends(get_db),vehicle_id:str=Depends(validate_api_key)):
    item=crud.update_telemetry_item(db,telemetry_id,data)
    if not item:
        raise HTTPException(status_code=404,detail="Telemetry to update is not found")
    return [item]
#db: Session,vehicle_id:str=None,start_date:date =None,end_date:date=None,skip:int=0,limit:int =100):
@app.get("/telemetry/filter", response_model=list[schema.Telemetry_out])
def filter_telemetry(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    vehicle_id: str = Depends(validate_api_key)
):
    return crud.filter_telemetry_item(db, vehicle_id, start_date, end_date, skip, limit)



