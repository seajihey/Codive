from fastapi import FastAPI, HTTPException, Depends,WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import models
import schemas
from database import SessionLocal, engine
from typing import List
from fastapi.responses import RedirectResponse
import os

app = FastAPI()

models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 메서드 허용
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



################# 질문 관련 api ####################
@app.post("/api/questions")
async def create_question(question: schemas.QuestionCreate, db: Session = Depends(get_db)):
    db_question = models.Question(content=question.content)
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@app.get("/api/questions/{question_id}", response_model=schemas.QuestionCreate)
def read_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@app.get("/api/questions/all/", response_model=List[schemas.QuestionCreate])
def read_all_question(db: Session = Depends(get_db)):
    questions = db.query(models.Question).all()
    return questions

################ 입장시 게스트 생성 #####################

@app.post("/api/room/{codeID}/guest")
def enter_room(codeID: str, db: Session = Depends(get_db)):
    # 방 존재 여부 확인
    room = db.query(models.Room).filter(models.Room.codeID == codeID).first()
    if not room:
        raise HTTPException(status_code=404, detail="방이엄서요")
    
    # 각 방마다 게스트 ID 자동 증가
    existing_users = db.query(models.User).filter(models.User.id.like(f"{codeID}-%")).count()
    guest_id = f"{codeID}-{existing_users + 1}"
    
    new_user = models.User(id=guest_id, is_guest=True)
    db.add(new_user)
    db.commit()
    
    return {"guest_id": guest_id, "room_codeID": codeID}

@app.delete("/api/room/{codeID}/guest/{guest_id}")
def exit_room(codeID: str, guest_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == guest_id, models.User.id.like(f"{codeID}-%")).first()
    if user:
        db.delete(user)
        db.commit()
    else:
        raise HTTPException(status_code=404, detail="게스트엄서요")

@app.get("/api/room/{codeID}/guests", response_model=List[schemas.UserCreate])
def read_all_guests_in_room(codeID: str, db: Session = Depends(get_db)):
    guests = db.query(models.User).filter(models.User.id.like(f"{codeID}-%")).all()
    return guests

################# 방 생성 api ####################
@app.post("/api/room_create", response_model=schemas.RoomCreate)
def create_room(room: schemas.RoomCreate, db: Session = Depends(get_db)):
    db_room = models.Room(codeID=room.codeID, pw=room.pw)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

@app.get("/api/room/all/", response_model=List[schemas.RoomCreate])
def read_all_room(db: Session = Depends(get_db)):
    db_rooms = db.query(models.Room).all()
    return db_rooms
