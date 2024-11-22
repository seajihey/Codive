from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import models
import schemas
from database import SessionLocal, engine
from typing import Dict, List
from fastapi.responses import RedirectResponse
import os
import openai

app = FastAPI()

models.Base.metadata.create_all(bind=engine)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.started_rooms: set = set()

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        self.rooms[room_id].append(websocket)
        await self.broadcast_count(room_id)

    async def disconnect(self, room_id: str, websocket: WebSocket):
        self.rooms[room_id].remove(websocket)
        if not self.rooms[room_id]:
            del self.rooms[room_id]
        else:
            await self.broadcast_count(room_id)

    async def broadcast(self, room_id: str, message: str):
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                await connection.send_text(message)

    async def broadcast_count(self, room_id: str):
        if room_id in self.rooms:
            count_message = f"count:{len(self.rooms[room_id])}"
            await self.broadcast(room_id, count_message)

    def start_room(self, room_id: str):
        self.started_rooms.add(room_id)

    def is_room_started(self, room_id: str) -> bool:
        return room_id in self.started_rooms

manager = ConnectionManager()

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "start":
                manager.start_room(room_id)
                await manager.broadcast(room_id, f"Room {room_id} has started!")
    except WebSocketDisconnect:
         await manager.disconnect(room_id, websocket)

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

# 방 시작 시 상태 업데이트
@app.post("/api/room/enter")
def enter_room(room_data: schemas.RoomEnter, db: Session = Depends(get_db)):
    # Check if the room exists
    room = db.query(models.Room).filter(models.Room.codeID == room_data.codeID).first()

    if not room:
        raise HTTPException(status_code=404, detail="올바르지 않은 초대코드입니다.")

    # Check if the room has already started
    if manager.is_room_started(room_data.codeID):
        raise HTTPException(status_code=400, detail="이미 시작된 방입니다.")

    # Check password
    if room.pw != room_data.pw:
        raise HTTPException(status_code=403, detail="비밀번호가 일치하지 않습니다.")

    # Create guest logic
    existing_users = db.query(models.User).filter(models.User.id.like(f"{room_data.codeID}-%")).count()
    guest_id = f"{room_data.codeID}-{existing_users + 1}"

    new_user = models.User(id=guest_id, is_guest=True)
    db.add(new_user)
    db.commit()

    return {"guest_id": guest_id, "message": "성공적으로 방에 입장했습니다."}

@app.delete("/api/room/{room_id}/guest/{guest_id}")
async def exit_room(room_id: str, guest_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == guest_id, models.User.id.like(f"{room_id}-%")).first()
    if user:
        db.delete(user)
        db.commit()
        return {"message": "Guest has left and been removed from the database."}
    else:
        raise HTTPException(status_code=404, detail="게스트를 찾을 수 없습니다.")

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

@app.delete("/api/room/{codeID}")
async def delete_room(codeID: str, db: Session = Depends(get_db)):
    # 방이 존재하는지 확인
    room = db.query(models.Room).filter(models.Room.codeID == codeID).first()
    if not room:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")

    # 데이터베이스에서 방 삭제
    db.delete(room)
    db.commit()

    # 모든 연결된 WebSocket 연결 종료
    if codeID in manager.rooms:
        for websocket in manager.rooms[codeID]:
            await websocket.close()
        del manager.rooms[codeID]

    return {"message": "방이 삭제되었습니다."}

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
    max_tokens: int = 100  # 생성 텍스트 제한
    problem_statement: str  # 문제 설명

# OpenAI GPT 호출 엔드포인트
@app.post("/generate-hint/")
async def generate_hint(request: GPTRequest):
        # OpenAI ChatCompletion 호출
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": (
                f"문제 설명: {request.problem_statement}\n\n"
                f"다음 코드를 작성했어:\n\n{request.user_code}\n\n"
                "이 코드와 문제 설명을 참고하여, 추가로 더하면 좋을 내용이나 어떻게 "
                "진행되면 좋을지 힌트를 짧고 간결하게 한글로 설명해줘. 핵심만 간단히 100자 이내로 말해줘. 그리고 직접적인 코드 설명은 하지마."
            )}
        ],
            max_tokens=request.max_tokens
        )
        return response.choices[0].message