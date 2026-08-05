from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Market Survey Questionnaire API")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8501",
        "http://localhost:8503",
        "http://localhost:8504",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "Backend Connected Successfully!"
    }


@app.post("/chat")
async def chat(request: ChatRequest):
    return {
        "reply": f"You said: {request.message}"
    }