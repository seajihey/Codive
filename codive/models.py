from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey,Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Question(Base):
    __tablename__ = "question"

    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)


class Answer(Base):
    __tablename__ = "answer"

    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    question_id = Column(Integer, ForeignKey("question.id"))
    question = relationship("Question", backref="answers")

    user_id = Column(String, ForeignKey("user.id"))
    user = relationship("User", back_populates="answers")


class Room(Base):
    __tablename__ = "room"
    
    codeID = Column(Text, primary_key=True)
    pw = Column(Text, nullable=False)

class User(Base):
    __tablename__ = "user"
    
    id = Column(String, primary_key=True, index=True)  
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_guest = Column(Boolean, default=True)
    answers = relationship("Answer", back_populates="user") 
    finish  = Column(Boolean,default = False)