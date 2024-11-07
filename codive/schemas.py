from pydantic import BaseModel

from typing import Optional

class QuestionCreate(BaseModel):
    id:int
    content: str

    class Config:
        from_attributes = True
        
        

class RoomCreate(BaseModel):
    codeID: str
    pw: str
    
class UserCreate(BaseModel):
    id: str
    is_guest: bool

    class Config:
        from_attributes = True