from fastapi import FastAPI, HTTPException, Depends, WebSocket
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
import openai

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
    db_question = models.Question(content=clean_code(question.content))
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
    answerContent = clean_code(answer.content)
    db_answer = models.Answer(
        content=answerContent,
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

from pydantic import BaseModel
import re

class CodeRequest(BaseModel):
    code: str

class AnswerCreate:
    def __init__(self, content):
        self.content = content

def clean_code(code: str) -> str:
    code = re.sub(r'#.*', '', code)
    code = re.sub(r'"""(.*?)"""', '', code, flags=re.DOTALL)
    code = code.replace('\t', '\\t')
    code = code.replace('\n', '\\n')
    code = re.sub(r'\s+', ' ', code)
    return code.strip()


import os
import requests

openai.api_key = ""


# OpenAI API 키 설정

# 요청 본문에 대한 Pydantic 모델 정의
class GPTRequest(BaseModel):
    problem: str
    answer : str
    max_tokens: int = 300 

@app.post("/generate-text/")
async def generate_text(request: GPTRequest):
    try:
        # OpenAI GPT API 호출
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # 사용할 모델 선택
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": (
f"{request.problem}이문제에대한 답으로 다음과 같은 코드를 작성했어. {request.answer}이 코드를 실행시켰을 때 테스트케이스 통과 여부 하나, 시간복잡도, 코드스타일, 실행시간과 메모리사용량을적어줘. 간결하게 다른거 필요없고5개에대한 답만 dic형식으로 주면 되는데, 시간복잡도는 빅오표기로 O(n)이런식으로 계산해서주고 코드스타일은 PeP8기준으로 어떠어떠한 스타일이다 어떻게 개선하면좋다 ~~를 잘했닻라고   ~~함,~~음으로 답변해줘 한 코드스타일 답변 길이는 50단어 길이로 주고좋음. 잘함이런식으로적지마 단답으로적지마 실행시간은 ms로, 메모리사용량은 kb로 해줘 실행시간과 메모리 사용량은 실행환경에 따라 다르겠지만 네가 큰거 하나만 측정해줘 key값은 모두 영어로 test_pass,time_complexity,code_style,execution_time,memory_usage로 부탁행 value는 테스트케이스통과여부 줄때 통과 , 통과x로 하나라도 통과못하면 통과, 모두 통과하면  통과 해주고 주고 코드스타일과 한글로해주고 나머진 영어로주고 설명은 필요없어 절대 다른말붙이지말고 딕셔너리형태로 줘야해 실제환경과다를수있다 이런말도하지말고 그냥 네가 실행해보고 제일큰 결과만 줘. 절대 설명 붙이지말고 5개에 대한 key와 value로만 이루어진 딕셔너리형태로 반환해"  )}
            ],
            max_tokens=request.max_tokens
        )
        
        if response.choices and response.choices[0].message:
            return {"generated_text": response.choices[0].message['content'].strip()}
        else:
            raise HTTPException(status_code=500, detail="No valid response from API")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")
    
    
from pydantic import BaseModel

# 요청 데이터 모델 정의
class GPTRequest(BaseModel):
    user_code: str  # 사용자가 작성한 코드
    max_tokens: int = 300  # 생성 텍스트 제한

# OpenAI GPT 호출 엔드포인트
@app.post("/generate-hint/")
async def generate_hint(request: GPTRequest):
        # OpenAI ChatCompletion 호출
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": (
                    f"다음 코드를 작성했어:\n\n{request.user_code}\n\n"
                    "이 코드를 보고 추가로 더하면 좋을 내용이나, 어떻게 진행되면 좋을지 "
                    "힌트를 짧고 간결하게 한글로 설명해줘. 핵심만 간단히 말해줘."
                )}
            ],
            max_tokens=request.max_tokens
        )
        return response.choices[0].message