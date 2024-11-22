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
@app.post("/api/room/enter")
def enter_room(room_data: schemas.RoomEnter, db: Session = Depends(get_db)):
    # 방 존재 여부 확인
    room = db.query(models.Room).filter(models.Room.codeID == room_data.codeID).first()
    
    if not room:
        # 로그를 추가해 디버깅
        print(f"Room with codeID {room_data.codeID} not found")
        raise HTTPException(status_code=404, detail="올바르지 않은 초대코드입니다.")
    
    # 비밀번호 확인
    if room.pw != room_data.pw:
        print(f"Password does not match for room with codeID {room_data.codeID}")
        raise HTTPException(status_code=403, detail="비밀번호가 일치하지 않습니다.")
    
    # 게스트 생성 로직
    existing_users = db.query(models.User).filter(models.User.id.like(f"{room_data.codeID}-%")).count()
    guest_id = f"{room_data.codeID}-{existing_users + 1}"
    
    new_user = models.User(id=guest_id, is_guest=True)
    db.add(new_user)
    db.commit()
    
    return {"guest_id": guest_id, "message": "성공적으로 방에 입장했습니다."}



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
    # 방 코드 중복 검사
    existing_room = db.query(models.Room).filter(models.Room.codeID == room.codeID).first()
    if existing_room:
        raise HTTPException(status_code=400, detail="중복된 코드입니다")  # 중복된 방 코드 처리

    # 방 생성
    db_room = models.Room(codeID=room.codeID, pw=room.pw)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    
    # 방 생성 시 방을 만든 유저를 호스트로 저장
    host_id = f"{room.codeID}-host"  # 방 코드에 'host'를 붙여서 호스트 ID 생성
    new_host = models.User(id=host_id, is_guest=False)  # 호스트는 is_guest가 False로 설정됨
    db.add(new_host)
    db.commit()

    return db_room


@app.get("/api/room/all/", response_model=List[schemas.RoomCreate])
def read_all_room(db: Session = Depends(get_db)):
    db_rooms = db.query(models.Room).all()
    return db_rooms
