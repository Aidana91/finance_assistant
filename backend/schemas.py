from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    type: str = Field(pattern="^(income|expense)$")
    category: str = Field(min_length=1, max_length=80)
    amount: float = Field(gt=0)
    date: str = Field(min_length=10, max_length=10)
    comment: str = Field(default="", max_length=500)


class TransactionUpdate(BaseModel):
    type: str | None = Field(default=None, pattern="^(income|expense)$")
    category: str | None = Field(default=None, min_length=1, max_length=80)
    amount: float | None = Field(default=None, gt=0)
    date: str | None = Field(default=None, min_length=10, max_length=10)
    comment: str | None = Field(default=None, max_length=500)


class AIRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    deadline: str = Field(min_length=10, max_length=10)
    completed: bool = False


class GoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    target_amount: float | None = Field(default=None, gt=0)
    current_amount: float | None = Field(default=None, ge=0)
    deadline: str | None = Field(default=None, min_length=10, max_length=10)
    completed: bool | None = None


class SettingsUpdate(BaseModel):
    theme: str = Field(pattern="^(light|dark)$")
    currency: str = Field(min_length=3, max_length=8)
    language: str = Field(pattern="^(ru|en|kk)$")
    llm_model: str = Field(min_length=1, max_length=100)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str


class SmartTextRequest(BaseModel):
    text: str = Field(min_length=2, max_length=500)


class SubscriptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    payment_date: str = Field(min_length=10, max_length=10)
    next_payment_date: str = Field(min_length=10, max_length=10)
    category: str = Field(default="Подписки", min_length=1, max_length=80)
    active: bool = True


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    amount: float | None = Field(default=None, gt=0)
    payment_date: str | None = Field(default=None, min_length=10, max_length=10)
    next_payment_date: str | None = Field(default=None, min_length=10, max_length=10)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    active: bool | None = None


class RecurringCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field(pattern="^(income|expense)$")
    category: str = Field(min_length=1, max_length=80)
    amount: float = Field(gt=0)
    frequency: str = Field(pattern="^(daily|weekly|monthly|yearly)$")
    next_date: str = Field(min_length=10, max_length=10)
    active: bool = True


class RecurringUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    type: str | None = Field(default=None, pattern="^(income|expense)$")
    category: str | None = Field(default=None, min_length=1, max_length=80)
    amount: float | None = Field(default=None, gt=0)
    frequency: str | None = Field(default=None, pattern="^(daily|weekly|monthly|yearly)$")
    next_date: str | None = Field(default=None, min_length=10, max_length=10)
    active: bool | None = None