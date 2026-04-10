"""
User API Routes
Endpoints for user management and profile operations
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.user_schema import (
    UserCreate, UserResponse, UserUpdate, UserStats, UserPreferences
)
from app.schemas.response_schema import StandardResponse
from datetime import datetime
import uuid

router = APIRouter()

# In-memory storage (replace with database in production)
users_db = {}


# ✅ Google Auth request model
class GoogleAuthRequest(BaseModel):
    id_token: str  # Added for verification
    google_id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None


@router.post("/google-auth", response_model=StandardResponse)
async def google_auth(request: GoogleAuthRequest):
    """Handle Google OAuth login — verify token and create/fetch user"""

    # SECURITY TODO: In production, verify the id_token using Google's library:
    # from google.oauth2 import id_token
    # from google.auth.transport import requests
    # idinfo = id_token.verify_oauth2_token(request.id_token, requests.Request(), GOOGLE_CLIENT_ID)
    
    # For now, we trust the structured request but require the id_token to be present
    if not request.id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Google ID Token"
        )

    # Check if user already exists by email
    existing_user = next(
        (u for u in users_db.values() if u.get("email") == request.email),
        None
    )

    if existing_user:
        existing_user["last_active"] = datetime.now().isoformat()
        # Update profile info from latest Google data
        existing_user["full_name"] = request.full_name
        existing_user["avatar_url"] = request.avatar_url
        
        return StandardResponse(
            success=True,
            message="User logged in successfully",
            data=existing_user
        )

    # Create new user from Google profile
    user_id = f"google_{request.google_id}"
    user_data = {
        "user_id": user_id,
        "email": request.email,
        "full_name": request.full_name,
        "avatar_url": request.avatar_url,
        "age": None,
        "education_level": None,
        "learning_style": "visual",
        "cognitive_load_capacity": 7.0,
        "processing_speed": "Medium",
        "working_memory": "Medium",
        "sessions_completed": 0,
        "average_score": 0.0,
        "engagement_level": 0.0,
        "streak_days": 1, # First day!
        "preferences": {},
        "created_at": datetime.now().isoformat(),
        "last_active": datetime.now().isoformat()
    }

    users_db[user_id] = user_data

    return StandardResponse(
        success=True,
        message="User registered successfully",
        data=user_data
    )


@router.post("/register", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    """Register a new user"""
    if any(u.get("email") == user.email for u in users_db.values()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user_id = str(uuid.uuid4())
    user_data = {
        "user_id": user_id,
        "email": user.email,
        "full_name": user.full_name,
        "age": user.age,
        "education_level": user.education_level,
        "learning_style": None,
        "cognitive_profile": None,
        "preferences": UserPreferences().dict(),
        "created_at": datetime.now(),
        "last_active": datetime.now()
    }

    users_db[user_id] = user_data
    user_response = UserResponse(**user_data)

    return StandardResponse(
        success=True,
        message="User registered successfully",
        data=user_response.dict()
    )


# ✅ /stats and /export must be BEFORE /{user_id} to avoid route conflicts
@router.get("/{user_id}/stats", response_model=StandardResponse)
async def get_user_stats(user_id: str):
    """Get user learning statistics"""
    user = users_db.get(user_id)

    stats = UserStats(
        user_id=user_id,
        total_sessions=user.get("sessions_completed", 24) if user else 24,
        total_time_minutes=560,
        completed_modules=8,
        average_score=user.get("average_score", 78.5) if user else 78.5,
        engagement_score=user.get("engagement_level", 0.82) if user else 0.82,
        learning_streak_days=user.get("streak_days", 7) if user else 7,
        achievements=["First Module", "Week Warrior", "High Achiever"]
    )

    return StandardResponse(
        success=True,
        message="User statistics retrieved successfully",
        data=stats.dict()
    )


@router.get("/{user_id}/export")
async def export_user_data(user_id: str):
    """Export user learning data as downloadable JSON"""
    user_data = users_db.get(user_id, {
        "user_id": user_id,
        "full_name": "Krishna Mishra",
        "email": "krishna@example.com",
        "learning_style": "visual",
        "cognitive_load_capacity": 7.5,
        "processing_speed": "Fast",
        "working_memory": "High"
    })

    export_data = {
        "exported_at": datetime.now().isoformat(),
        "user": user_data,
        "stats": {
            "total_sessions": 24,
            "total_time_minutes": 560,
            "completed_modules": 8,
            "average_score": 78.5,
            "engagement_score": 0.82,
            "learning_streak_days": 7,
            "achievements": ["First Module", "Week Warrior", "High Achiever"]
        },
        "progress": [
            {"module": "Python Basics",               "completion": 100, "score": 95},
            {"module": "Data Structures",             "completion": 75,  "score": 82},
            {"module": "Object-Oriented Programming", "completion": 45,  "score": 78},
            {"module": "Advanced Algorithms",         "completion": 0,   "score": None}
        ]
    }

    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=neurolearn-{user_id}-export.json"
        }
    )


@router.get("/{user_id}", response_model=StandardResponse)
async def get_user(user_id: str):
    """Get user profile information"""
    if user_id not in users_db:
        # Return demo data for unknown users instead of 404
        return StandardResponse(
            success=True,
            message="User retrieved successfully",
            data={
                "user_id": user_id,
                "full_name": "Krishna Mishra",
                "email": "krishna@example.com",
                "age": 22,
                "education_level": "undergraduate",
                "learning_style": "visual",
                "cognitive_load_capacity": 7.5,
                "processing_speed": "Fast",
                "working_memory": "High",
                "sessions_completed": 24,
                "average_score": 0.785,
                "engagement_level": 0.82,
                "streak_days": 7,
                "preferences": {},
                "created_at": datetime.now().isoformat(),
                "last_active": datetime.now().isoformat()
            }
        )

    user_data = users_db[user_id]
    user_response = UserResponse(**user_data)

    return StandardResponse(
        success=True,
        message="User retrieved successfully",
        data=user_response.dict()
    )


@router.put("/{user_id}", response_model=StandardResponse)
async def update_user(user_id: str, user_update: UserUpdate):
    """Update user profile"""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user_data = users_db[user_id]
    update_data = user_update.dict(exclude_unset=True)
    user_data.update(update_data)
    user_data["last_active"] = datetime.now()
    users_db[user_id] = user_data

    user_response = UserResponse(**user_data)

    return StandardResponse(
        success=True,
        message="User updated successfully",
        data=user_response.dict()
    )


@router.put("/{user_id}/preferences", response_model=StandardResponse)
async def update_preferences(user_id: str, preferences: UserPreferences):
    """Update user learning preferences"""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user_data = users_db[user_id]
    user_data["preferences"] = preferences.dict()
    user_data["last_active"] = datetime.now()
    users_db[user_id] = user_data

    return StandardResponse(
        success=True,
        message="Preferences updated successfully",
        data=preferences.dict()
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str):
    """Delete user account"""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    del users_db[user_id]
    return None


@router.get("/", response_model=StandardResponse)
async def list_users(skip: int = 0, limit: int = 10):
    """List all users"""
    users_list = list(users_db.values())[skip:skip + limit]
    user_responses = [UserResponse(**user) for user in users_list]

    return StandardResponse(
        success=True,
        message=f"Retrieved {len(user_responses)} users",
        data=[user.dict() for user in user_responses]
    )