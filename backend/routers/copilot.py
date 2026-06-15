from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas import ChatMessage, ChatResponse
from services.ai_copilot import ask_copilot

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat_with_copilot(chat_msg: ChatMessage, db: Session = Depends(get_db)):
    reply = ask_copilot(db, chat_msg.message, chat_msg.history)
    return ChatResponse(reply=reply)
