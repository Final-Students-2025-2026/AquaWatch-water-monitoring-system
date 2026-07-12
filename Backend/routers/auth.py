# ============================================================
# AUTHENTICATION ROUTER
# ============================================================

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from auth import get_password_hash, verify_password, create_access_token, get_current_user
from config import DEFAULT_ORGANIZATION_ID
import database
from models import UserCreate, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    try:
        async with database.db_pool.acquire() as conn:
            existing = await conn.fetchrow(
                "SELECT user_id FROM users WHERE username = $1",
                user.username
            )
            if existing:
                raise HTTPException(status_code=400, detail="Username already exists")

            hashed_password = get_password_hash(user.password)
            row = await conn.fetchrow("""
                INSERT INTO users (organization_id, username, email, password_hash, role)
                VALUES ($1, $2, $3, $4, 'administrator')
                RETURNING user_id, username, email, role
            """, DEFAULT_ORGANIZATION_ID, user.username, user.email, hashed_password)

            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to register user")


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    async with database.db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE username = $1",
            form_data.username
        )
        if not user or not verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        if not user["is_active"]:
            raise HTTPException(status_code=403, detail="User account is disabled")

        await conn.execute("""
            UPDATE users SET last_login = $1 WHERE user_id = $2
        """, datetime.now(timezone.utc), user["user_id"])

        access_token = create_access_token(data={"sub": user["username"]})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": user["user_id"],
                "username": user["username"],
                "email": user["email"],
                "role": user["role"],
            }
        }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "role": current_user["role"],
    }


@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        async with database.db_pool.acquire() as conn:
            # Verify current password
            user = await conn.fetchrow(
                "SELECT password_hash FROM users WHERE user_id = $1",
                current_user["user_id"]
            )
            
            if not user or not verify_password(current_password, user["password_hash"]):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            
            # Update to new password
            new_hashed_password = get_password_hash(new_password)
            await conn.execute(
                "UPDATE users SET password_hash = $1 WHERE user_id = $2",
                new_hashed_password,
                current_user["user_id"]
            )
            
            return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update password")


@router.post("/change-username")
async def change_username(
    new_username: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        async with database.db_pool.acquire() as conn:
            # Check if username already exists
            existing = await conn.fetchrow(
                "SELECT user_id FROM users WHERE username = $1 AND user_id != $2",
                new_username,
                current_user["user_id"]
            )
            if existing:
                raise HTTPException(status_code=400, detail="Username already exists")
            
            # Update username
            await conn.execute(
                "UPDATE users SET username = $1 WHERE user_id = $2",
                new_username,
                current_user["user_id"]
            )
            
            return {"message": "Username updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update username")
