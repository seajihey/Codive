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
@app.delete("/api/questions/{question_id}", response_model=schemas.QuestionCreate)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(question)
    db.commit()
    return {"detail": "Question deleted successfully"}


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

################## 질문 답 api######################
@app.post("/api/answers", response_model=schemas.AnswerCreate)
def create_answer(answer: schemas.AnswerCreate, db: Session = Depends(get_db)):
    db_answer = models.Answer(
        content=answer.content,
        question_id=answer.question_id,
        user_id=answer.user_id
    )
    db.add(db_answer)
    db.commit()
    db.refresh(db_answer)
    return db_answer
@app.delete("/api/answers/{answer_id}", response_model=schemas.AnswerCreate)
def delete_answer(answer_id: int, db: Session = Depends(get_db)):
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if answer is None:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    db.delete(answer)
    db.commit()
    return {"detail": "Answer deleted successfully"}
@app.get("/api/answers/", response_model=List[schemas.AnswerCreate])
def read_all_answers(db: Session = Depends(get_db)):
    answers = db.query(models.Answer).all()
    return answers
@app.get("/api/questions/{question_id}/answers", response_model=List[schemas.AnswerCreate])
def read_answers_for_question(question_id: int, db: Session = Depends(get_db)):
    answers = db.query(models.Answer).filter(models.Answer.question_id == question_id).all()
    return answers


############ report관련 도구 ############
import tempfile
import subprocess

@app.post("/api/analyze-code/")
async def analyze_code(code: str):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".py") as temp_file:
        temp_file.write(code.encode('utf-8'))
        temp_file.flush()

        try:
            # Pylint 실행
            result = subprocess.run(
                ['pylint', temp_file.name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # 전체 결과를 줄 단위로 분리
            lines = result.stdout.split('\n')
            # 오류 메시지를 추출하여 경로를 제외하고 저장
            filtered_lines = []
            for line in lines:
                if 'E0001' in line or 'syntax-error' in line:
                    # 경로와 메시지를 구분하는 첫 번째 콜론 뒤에서부터 메시지를 추출
                    _, message = line.split(': ', 1)
                    filtered_lines.append(message)
            
            # 필터링된 메시지를 하나의 문자열로 결합
            error_message = '\n'.join(filtered_lines)

            return {"result": error_message}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))