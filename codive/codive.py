from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect,Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import models
import schemas
from database import SessionLocal, engine
from typing import Dict, List
from fastapi.responses import RedirectResponse
#import openai
import os

app = FastAPI()

app.mount("/static", StaticFiles(directory="build/static"), name="static")

models.Base.metadata.create_all(bind=engine)

room_users = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://codive-frontend.onrender.com"],
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

@app.get("/", response_class=FileResponse)
async def read_index():
    index_path = os.path.join('build', 'index.html')
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="index.html not found")

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

@app.get("/api/user/{user_id}")
async def read_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {"created_at": user.created_at}

@app.post("/api/room/enter")
def enter_room(response: Response,room_data: schemas.RoomEnter, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.codeID == room_data.codeID).first()
    if not room:
        raise HTTPException(status_code=404, detail="올바르지 않은 초대코드입니다.")
    if manager.is_room_started(room_data.codeID):
        raise HTTPException(status_code=400, detail="이미 시작된 방입니다.")
    if room.pw != room_data.pw:
        raise HTTPException(status_code=403, detail="비밀번호가 일치하지 않습니다.")

    existing_users = db.query(models.User).filter(models.User.id.like(f"{room_data.codeID}-%")).count()
    guest_id = f"{room_data.codeID}-{existing_users+1 }"

    new_user = models.User(id=guest_id, is_guest=True,finish = False)
    db.add(new_user)
    db.commit()
    if room_data.codeID not in room_users:
        room_users[room_data.codeID] = []
    room_users[room_data.codeID].append(guest_id)
    response.set_cookie(key="guest_id", value=guest_id) 
    response.set_cookie(key="elapsedTime", value="0")
    return {"guest_id": guest_id, "message": "성공적으로 방에 입장했습니다."}
@app.get("/api/room/{roomCode}/rank/{guest_id}")
def get_user_rank(roomCode: str, guest_id: str, db: Session = Depends(get_db)):
    try:
        current_users = db.query(models.User).filter(
            models.User.id.like(f"{roomCode}-%"), 
            models.User.finish == False
        ).order_by(models.User.id).all()
        user_ids = [user.id for user in current_users]
        print("Current Users IDs:", user_ids) 
        print("Guest ID:", guest_id)  
     
        
        rank = user_ids.index(guest_id) + 1
        
        return {"rank": rank, "total_users": len(current_users)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/api/room/{codeID}/guests", response_model=List[schemas.UserCreate])
def read_all_guests_in_room(codeID: str, db: Session = Depends(get_db)):
    guests = db.query(models.User).filter(models.User.id.like(f"{codeID}-%")).all()
    return guests

@app.get("/api/room/{codeID}/guestcount")
def get_guest_count(codeID: str, db: Session = Depends(get_db)):
    guest_count = db.query(models.User).filter(models.User.id.like(f"{codeID}-%")).count()
    return {"guest_count": guest_count}
################# 방 생성 api ####################
@app.post("/api/room_create", response_model=schemas.RoomCreate)
def create_room(response: Response,room: schemas.RoomCreate, db: Session = Depends(get_db)):
    # 방 코드 중복 검사
    existing_room = db.query(models.Room).filter(models.Room.codeID == room.codeID).first()
    if existing_room:
        raise HTTPException(status_code=400, detail="중복된 코드입니다")  # 중복된 방 코드 처리

    db_room = models.Room(codeID=room.codeID, pw=room.pw)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    
    host_id = f"{room.codeID}-1" 
    new_host = models.User(id=host_id, is_guest=False) 
    db.add(new_host)
    db.commit()
    if room.codeID not in room_users:
        room_users[room.codeID] = []
    response.set_cookie(key="guest_id", value=host_id) 
    response.set_cookie(key="elapsedTime", value="0")
    response.set_cookie(key="inRoom", value=True) 

    return db_room

@app.patch("/api/user/finish/{user_id}")
def finish_user_session(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.finish = True
    db.commit()
    return {"message": "User session finished"}

@app.get("/api/room/{roomCode}/user_stats")
def get_user_stats(roomCode: str, db: Session = Depends(get_db)):
    all_users = db.query(models.User).filter(models.User.id.like(f"{roomCode}-%")).all()
    active_users = [user for user in all_users if not user.finish]
    
    return {
        "total_users": len(all_users),
        "active_users": len(active_users)
    }


@app.get("/api/room/all/", response_model=List[schemas.RoomCreate])
def read_all_room(db: Session = Depends(get_db)):
    db_rooms = db.query(models.Room).all()
    return db_rooms

@app.delete("/api/room/{codeID}")
async def delete_room(codeID: str, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.codeID == codeID).first()
    if not room:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")
    db.delete(room)
    db.commit()

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

from sqlalchemy.orm import Session
from sqlalchemy import and_
@app.get("/api/room/{roomCode}/rank/{guest_id}")
def get_user_rank(roomCode: str, guest_id: str, db: Session = Depends(get_db)):
    try:
        current_users = db.query(models.User).filter(
            and_(
                models.User.room_code == roomCode,
                models.User.finish == False
            )
        ).all()
        guest = db.query(models.User).filter(models.User.id == guest_id).first()
        if not guest:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
        rank = current_users.index(guest) + 1 if guest in current_users else None
        
        if rank is None:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
        return {"rank": rank}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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




class GPTRequest(BaseModel):
    problem: str
    answer : str
    max_tokens: int = 300 

@app.post("/generate-text/")
async def generate_text(request: GPTRequest):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": (
f'{request.problem}에 대한 답으로 작성한 코드는 다음과 같습니다: {request.answer}. 이 코드를 실행했을 때 얻은 결과를 딕셔너리 형식으로 반환해 주세요. 다른 설명이나 주석은 필요 없습니다. 형식 예시: {{"test_pass": "통과", "time_complexity": "O(1)", "code_style": "PEP8 준수", "execution_time": "0.5ms", "memory_usage": "100kb"}}.만약 실행되지 않거나 틀린 코드라면, {{"test_pass": "통과x", "time_complexity": "x", "code_style": "x", "execution_time": "x", "memory_usage": "x"}} 만약 코드 제출이 없다면 {{"test_pass": "통과x", "time_complexity": "코드제출 x", "code_style": "코드제출 x", "execution_time": "코드제출x", "memory_usage": "코드제출 x"}}.형식으로만 응답하세요.'
'                코드스타일 설명할 때 딱 pep8준수 , 잘함, 우수함 이따구로 적지말고어떻게 고치면 더 좋은 코드가 될지 간결하게 말해달란거였어'
'제발 실행이 가능한 코드는 실행하고 문제에 맞게 출력물이 나오는지 확인하고 안나오면 테스트케이스 통과 x , 나오면 통과로 적어줘. 그리고 메모리사용량이나 실행시간은 데이터에 따라 다름이러지말고 높은 값 하나만 보내줘. '
  )}
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
class GPTRequest(BaseModel):
    user_code: str 
    max_tokens: int = 200  
    problem_statement: str  

@app.post("/generate-hint/")
async def generate_hint(request: GPTRequest):
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