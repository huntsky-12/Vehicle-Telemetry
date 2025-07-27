from pydantic import BaseModel
from datetime import datetime

class Telemetry_Create(BaseModel):
    vehicle_id:str
    timestamp:datetime
    lat:float
    log:float
    speed:float
    fuel_level:float
    
class Telemetry_out(BaseModel):
    id:int
    vehicle_id:str
    speed:float
    fuel_level:float
    class config:
        orm_mode=True
    
    
