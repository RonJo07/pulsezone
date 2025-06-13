from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_KEY']
supabase: Client = create_client(supabase_url, supabase_key)

# Create the main app without a prefix
app = FastAPI()

# Add root endpoint for health check
@app.get("/")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class User(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    device_fingerprint: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    total_games_played: int = 0
    total_play_time: int = 0
    high_score: int = 0
    total_score: int = 0
    best_combo: int = 0
    best_perfect_streak: int = 0
    achievements_unlocked: List[str] = Field(default_factory=list)
    current_level: int = 1
    experience_points: int = 0
    total_targets_hit: int = 0
    total_targets_missed: int = 0

class GameSession(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    device_fingerprint: str
    start_time: datetime
    end_time: datetime
    score: int
    final_combo: int = 0
    perfect_streak: int = 0
    achievements_unlocked: List[str] = Field(default_factory=list)
    play_duration: int
    targets_hit: int = 0
    targets_missed: int = 0
    game_speed: float = 1.0
    game_mode: str = 'classic'
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LeaderboardEntry(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    device_fingerprint: str
    score: int
    combo: int = 0
    perfect_streak: int = 0
    achieved_at: datetime
    session_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/users", response_model=User)
async def create_user(device_fingerprint: str):
    try:
        # Check if user exists
        response = supabase.table('users').select("*").eq('device_fingerprint', device_fingerprint).execute()
        if response.data:
            return User(**response.data[0])
        
        # Create new user
        new_user = User(device_fingerprint=device_fingerprint)
        response = supabase.table('users').insert(new_user.dict()).execute()
        return User(**response.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/game-sessions", response_model=GameSession)
async def create_game_session(session: GameSession):
    try:
        response = supabase.table('game_sessions').insert(session.dict()).execute()
        return GameSession(**response.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/leaderboard", response_model=LeaderboardEntry)
async def add_leaderboard_entry(entry: LeaderboardEntry):
    try:
        response = supabase.table('global_leaderboard').insert(entry.dict()).execute()
        return LeaderboardEntry(**response.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 100):
    try:
        response = supabase.table('global_leaderboard').select("*").order('score', desc=True).limit(limit).execute()
        return [LeaderboardEntry(**entry) for entry in response.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/top-scores")
async def get_top_scores(limit: int = 100):
    try:
        response = supabase.table('top_scores').select("*").limit(limit).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://localhost:5173",  # Vite default port
        "https://*.vercel.app",   # Vercel preview deployments
        "https://*.netlify.app",  # Netlify preview deployments
        "https://your-app-name.vercel.app"  # Your production frontend URL
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
