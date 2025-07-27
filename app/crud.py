from sqlalchemy.orm import Session
from . import model,schema
from sqlalchemy.sql import func ## func is a special object that allows you to call SQL functions directly

from datetime import date
def Create_telemetry( db:Session, data:schema.Telemetry_Create):
    db_data=model.Telemetry(**data.dict())
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data
def get_all_telemetry(db: Session, skip: int = 0, limit: int = 100):
    return db.query(model.Telemetry).offset(skip).limit(limit).all()

def delete_telemetry_item(db: Session,telemetry_id:int):
    item=db.query(model.Telemetry).get(telemetry_id)
    if item:
        db.delete(item)
        db.commit()
        return item
def update_telemetry_item(db:Session, telemetry_id:int,data: schema.Telemetry_Create):
    item=db.query(model.Telemetry).get(telemetry_id)
    if not item:
        return None
    for key,value in data.dict().items():
        setattr(item,key,value) #using setattr to do assign values item.vehicle_id = data.vehicle_id item.speed = data.speed item.latitude = data.latitude dynamically for all fields.
    db.commit()
    db.refresh(item)
    return item 
def filter_telemetry_item(db: Session,vehicle_id:str=None,start_date:date =None,end_date:date=None,skip:int=0,limit:int =100):
    query = db.query(model.Telemetry)
    if vehicle_id:
        query=query.filter(model.Telemetry.vehicle_id==vehicle_id)
    if start_date:
        query=query.filter(func.date(model.Telemetry.timestamp))>=start_date
    if end_date:
        query=query.filter(func.date(model.Telemetry.timestamp))<=end_date
    return query.offset(skip).limit(limit).all()
    

def get_vehicle_by_api_key(db: Session, api_key: str):
    return db.query(model.Vehicle).filter_by(api_key=api_key).first()     
    
    
    