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
        
        

class AnswerBase(BaseModel):
    content: str
    question_id: int
    user_id: str

class AnswerCreate(AnswerBase):
    pass

class Answer(AnswerBase):
    id: int

    class Config:
        orm_mode = True