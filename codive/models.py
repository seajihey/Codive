from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

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


class Room(Base):
    __tablename__ = "Room"
    
    codeID = Column(Text, primary_key=True)
    pw = Column(Text,nullable=False)
    
    
class User(Base):
    __tablename__ = "User"
    id = Column(Integer, primary_key=True)
    answers = relationship("Answer", back_populates="user")