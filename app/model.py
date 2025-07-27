from sqlalchemy import String, Float, Integer, Column,DateTime
from .database import Base
from datetime import datetime

class Telemetry(Base):
    __tablename__="telemetry"
    id=Column(Integer,primary_key=True,index=True)
    vehicle_id=Column(String,index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    speed=Column(Float)
    lat=Column(Float)
    log=Column(Float)
    fuel_level=Column(Float)
class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String, unique=True, index=True)
    api_key = Column(String, unique=True, index=True)

from .database import engine
Base.metadata.create_all(bind=engine)


