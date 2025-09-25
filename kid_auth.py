import hashlib
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import import List
import os
import pandas as pd
from cryptography.fernet import Fernet
import base64

security = HTTPBearer()

# Food options for passwords
FOOD_OPTIONS = [
    {"id": "chocolate", "name": "Chocolate", "emoji": "🍫"},
    {"id": "vanilla", "name": "Vanilla Ice Cream", "emoji": "🍦"},
    {"id": "pizza", "name": "Pizza", "emoji": "🍕"},
    {"id": "cookie", "name": "Cookie", "emoji": "🍪"},
    {"id": "cupcake", "name": "Cupcake", "emoji": "🧁"},
    {"id": "strawberry", "name": "Strawberry", "emoji": "🍓"},
    {"id": "banana", "name": "Banana", "emoji": "🍌"},
    {"id": "apple", "name": "Apple", "emoji": "🍎"},
    {"id": "orange", "name": "Orange", "emoji": "🍊"},
    {"id": "donut", "name": "Donut", "emoji": "🍩"},
    {"id": "candy", "name": "Candy", "emoji": "🍬"},
    {"id": "cake", "name": "Cake", "emoji": "🍰"},
]

class RegisterRequest(BaseModel):
    username: str
    food_password: List[str]  # List of food IDs

class LoginRequest(BaseModel):
    username: str
    food_password: List[str]

class AuthResponse(BaseModel):
    success: bool
    access_token: str = ""
    user: dict = {}
    error: str = ""

# Database-based user storage
def get_users_table():
    """Get or create users table in LanceDB"""
    try:
        db = lancedb.connect("./lancedb")
        try:
            return db.open_table("users")
        except:
            # Create users table
            import pandas as pd
            sample_df = pd.DataFrame([{
                "id": "sample",
                "username_encrypted": "",
                "password_hash": "",
                "created_at": datetime.now(),
            }])
            users_table = db.create_table("users", sample_df)
            users_table.delete("id = 'sample'")
            return users_table
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_encryption_key():
    """Get or create encryption key"""
    key_file = ".encryption.key"
    if os.path.exists(key_file):
        with open(key_file, "rb") as f:
            return f.read()
    else:
        key = Fernet.generate_key()
        with open(key_file, "wb") as f:
            f.write(key)
        return key
def encrypt_username(username: str) -> str:
    """Encrypt username for storage"""
    key = get_encryption_key()
    f = Fernet(key)
    return f.encrypt(username.encode()).decode()


def decrypt_username(encrypted_username: str) -> str:
    """Decrypt username from storage"""
    key = get_encryption_key()
    f = Fernet(key)
    return f.decrypt(encrypted_username.encode()).decode()


def hash_food_password(food_list: list):
    """Create hash from food password list"""
    food_string = "|".join(food_list)
    return hashlib.sha256(food_string.encode()).hexdigest()


def create_jwt_token(user_data):
    """Create JWT token for authenticated user"""
    payload = {
        "user_id": user_data["id"],
        "username": user_data["username"],
        "exp": datetime.utcnow() + timedelta(days=30)  # Longer for kids
    }

    token = jwt.encode(payload, os.getenv("JWT_SECRET_KEY", "story-nest-secret"), algorithm="HS256")
    print(f"🔑 JWT Debug - Created token for user {user_data['username']}: {token[:20]}...")
    return token


def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user info"""
    try:
        payload = jwt.decode(credentials.credentials, os.getenv("JWT_SECRET_KEY", "story-nest-secret"), algorithms=["HS256"])
        print(f"🔑 JWT Debug - Token valid for user: {payload.get('username')}")
        return payload
    except jwt.ExpiredSignatureError as e:
        print(f"❌ JWT Debug - Token expired: {e}")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        print(f"❌ JWT Debug - Invalid token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"❌ JWT Debug - Unexpected error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


def register_user(username: str, food_password: List[str]):
    """Register new user with food password"""
    users_table = get_users_table()

    # Check if username exists
    try:
        df = users_table.to_pandas()
        if not df.empty:
            for row in df.itertuples():
                try:
                    existing_username = decrypt_username(row.username_encrypted)
                    if existing_username.lower() == username.lower():
                        raise HTTPException(status_code=400, detail="Username already taken")
                except:
                    continue
    except:
        pass
    # Validate food password
    if len(food_password) < 3:
        raise HTTPException(status_code=400, detail="Please select at least 3 foods")

    valid_foods = [f["id"] for f in FOOD_OPTIONS]
    if not all(food in valid_foods for food in food_password):
        raise HTTPException(status_code=400, detail="Invalid food selection")

    # Create user
    user_id = f"user_{int(datetime.now().timestamp())}"
    username_encrypted = encrypt_username(username)
    password_hash = hash_food_password(food_password)

    user_data = {
        "id": user_id,
        "username_encrypted": username_encrypted,
        "password_hash": password_hash,
        "created_at": datetime.now()
    }

    users_table.add([user_data])

    return {
        "id": user_id,
        "username": username,
        "created_at": datetime.now().isoformat()
    }


def authenticate_user(username: str, food_password: List[str]):
    """Authenticate user with food password"""
    users_table = get_users_table()

    try:
        df = users_table.to_pandas()
        if df.empty:
            raise HTTPException(status_code=401, detail="Username not found")

        # Find user by decrypting usernames
        user_row = None
        for row in df.itertuples():
            try:
                decrypted_username = decrypt_username(row.username_encrypted)
                if decrypted_username.lower() == username.lower():
                    user_row = row
                    break
            except:
                continue

        if user_row is None:
            raise HTTPException(status_code=401, detail="Username not found")

        # Verify password
        password_hash = hash_food_password(food_password)
        if password_hash != user_row.password_hash:
            raise HTTPException(status_code=401, detail="Wrong food combination")

        return {
            "id": user_row.id,
            "username": username,
            "created_at": user_row.created_at
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
