import os
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from services.ai_tools import OPERATION_TOOLS

def ask_copilot(db: Session, message: str, history: list) -> str:
    # Initialize client dynamically so it uses the latest env var
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    system_instruction = """
    You are the Agentic Operations Manager for Eluno, a highly advanced eyewear operations platform.
    You have direct access to live business tools to investigate the current state of the platform.
    When asked a question, ALWAYS use your tools to find the answer. Do not hallucinate or guess.
    Once you have the data, explain your findings clearly to the user and proactively suggest the next best action.
    Your tone should be professional, commanding, and extremely helpful.
    """
    
    formatted_history = []
    for msg in history:
        role = "user" if msg.get("role") == "user" else "model"
        formatted_history.append(
            types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))])
        )
        
    try:
        chat = client.chats.create(
            model="gemini-2.5-flash-lite",
            history=formatted_history,
            config=types.GenerateContentConfig(
                tools=OPERATION_TOOLS,
                system_instruction=system_instruction
            )
        )
        response = chat.send_message(message)
        return response.text
    except Exception as e:
        return f"I'm currently unable to execute operations (Error: {e}). Please check API quotas or try again later."
