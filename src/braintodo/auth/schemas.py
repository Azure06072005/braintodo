from uuid import UUID

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel): 
    email: EmailStr
    password: str

class LoginRequest(BaseModel): 
    email: EmailStr
    password: str

class TokenResponse(BaseModel): 
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel): 
    id: UUID
    email: str 
    is_verified: bool