from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from ai_service import analyze_finances, ask_ai
from analytics import calculate_balance, expenses_by_category
from crud import add_transaction, delete_transaction, get_transaction, get_transactions, update_transaction
from database import SessionLocal, engine
from models import Base, ChatMessage, Goal, Setting, Transaction, Subscription, RecurringTransaction, Achievement, Report
from models import User
from auth import get_db, get_current_user, hash_password, verify_password, create_access_token
from schemas import (
    AIRequest,
    GoalCreate,
    GoalUpdate,
    SettingsUpdate,
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    TransactionCreate,
    TransactionUpdate,
    SmartTextRequest,
    SubscriptionCreate,
    SubscriptionUpdate,
    RecurringCreate,
    RecurringUpdate,
)
from ai_service import parse_smart_transaction
from fastapi.responses import StreamingResponse
from io import BytesIO, StringIO
import csv

Base.metadata.create_all(bind=engine)

with engine.begin() as connection:
    transaction_columns = connection.execute(text("PRAGMA table_info(transactions)")).all()
    if transaction_columns and not any(column[1] == "comment" for column in transaction_columns):
        connection.execute(text("ALTER TABLE transactions ADD COLUMN comment VARCHAR DEFAULT ''"))
    if transaction_columns and not any(column[1] == "user_id" for column in transaction_columns):
        connection.execute(text("ALTER TABLE transactions ADD COLUMN user_id INTEGER"))
    for table in ("goals", "settings", "chat_messages"):
        columns = connection.execute(text(f"PRAGMA table_info({table})")).all()
        if columns and not any(column[1] == "user_id" for column in columns):
            connection.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER"))

app = FastAPI(title="Personal Finance Assistant API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Personal Finance Assistant API"}


@app.post("/auth/register", status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")
    if len(request.password) < 8 or len(request.password) > 128:
        raise HTTPException(status_code=422, detail="Пароль должен содержать от 8 до 128 символов")

    user = User(name=request.name.strip(), email=email, hashed_password=hash_password(request.password))
    db.add(user)
    db.flush()

    for model in (Transaction, Goal, Setting, ChatMessage):
        unowned = db.query(model).filter(model.user_id.is_(None))
        unowned.update({model.user_id: user.id}, synchronize_session=False)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email}


@app.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.strip().lower()).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный пароль")
    return TokenResponse(access_token=create_access_token(user.id))


@app.get("/auth/me", response_model=UserResponse)
def auth_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/transaction", status_code=201)
@app.post("/transactions/", status_code=201)
def create_transaction_endpoint(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = add_transaction(db, transaction)
    item.user_id = current_user.id
    db.commit()
    db.refresh(item)
    return item


@app.get("/transactions")
def list_transactions(
    search: str | None = Query(default=None, max_length=100),
    type: str | None = Query(default=None, pattern="^(income|expense)$"),
    category: str | None = Query(default=None, max_length=80),
    sort: str = Query(default="date_desc", pattern="^(date_desc|date_asc|amount_desc|amount_asc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(or_(Transaction.category.ilike(pattern), Transaction.comment.ilike(pattern)))
    if type:
        query = query.filter(Transaction.type == type)
    if category:
        query = query.filter(Transaction.category == category)

    sort_options = {
        "date_desc": (Transaction.date.desc(), Transaction.id.desc()),
        "date_asc": (Transaction.date.asc(), Transaction.id.asc()),
        "amount_desc": (Transaction.amount.desc(),),
        "amount_asc": (Transaction.amount.asc(),),
    }
    return query.order_by(*sort_options[sort]).all()


@app.put("/transaction/{transaction_id}")
def update_transaction_endpoint(
    transaction_id: int,
    transaction: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Операция не найдена")
    for field, value in transaction.model_dump(exclude_unset=True).items():
        setattr(item, field, value.strip() if isinstance(value, str) and field == "comment" else value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/transaction/{transaction_id}")
def remove_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Операция не найдена")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": transaction_id}


@app.get("/balance")
def balance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    balance_value = sum(item.amount if item.type == "income" else -item.amount for item in transactions)
    return {"balance": balance_value, "transactions_count": len(transactions)}


@app.get("/analytics")
def analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    categories: dict[str, float] = {}
    for item in transactions:
        if item.type == "expense":
            categories[item.category] = categories.get(item.category, 0) + item.amount
    monthly_expenses: dict[str, float] = {}
    monthly_income: dict[str, float] = {}
    monthly_balance: dict[str, float] = {}
    running_balance = 0.0
    now = datetime.utcnow()
    current_month = now.strftime("%Y-%m")
    previous_month = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")

    for item in sorted(transactions, key=lambda transaction: (transaction.date, transaction.id)):
        month = item.date[:7]
        running_balance += item.amount if item.type == "income" else -item.amount
        monthly_balance[month] = running_balance
        if item.type == "expense":
            monthly_expenses[month] = monthly_expenses.get(month, 0) + item.amount
        else:
            monthly_income[month] = monthly_income.get(month, 0) + item.amount

    current_income = monthly_income.get(current_month, 0)
    previous_income = monthly_income.get(previous_month, 0)
    current_expenses = monthly_expenses.get(current_month, 0)
    previous_expenses = monthly_expenses.get(previous_month, 0)

    def percentage_change(current: float, previous: float) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    expense_month_values = [monthly_expenses.get(month, 0) for month in sorted(monthly_expenses)]
    recent_expense_values = expense_month_values[-3:]
    forecast_expenses = round(sum(recent_expense_values) / len(recent_expense_values), 2) if recent_expense_values else 0
    average_daily_expense = round(current_expenses / max(now.day, 1), 2)

    top_categories = [
        {"name": name, "value": amount}
        for name, amount in sorted(categories.items(), key=lambda entry: entry[1], reverse=True)
    ]
    monthly_comparison = [
        {"month": month, "income": monthly_income.get(month, 0), "expenses": monthly_expenses.get(month, 0)}
        for month in sorted(set(monthly_income) | set(monthly_expenses))
    ]

    return {
        "expenses_by_category": categories,
        "top_categories": top_categories,
        "monthly_expenses": [{"month": month, "amount": amount} for month, amount in sorted(monthly_expenses.items())],
        "balance_over_time": [{"month": month, "balance": amount} for month, amount in sorted(monthly_balance.items())],
        "monthly_comparison": monthly_comparison,
        "income": sum(item.amount for item in transactions if item.type == "income"),
        "expenses": sum(item.amount for item in transactions if item.type == "expense"),
        "current_month": {
            "month": current_month,
            "income": current_income,
            "expenses": current_expenses,
            "income_change": percentage_change(current_income, previous_income),
            "expense_change": percentage_change(current_expenses, previous_expenses),
            "balance": sum(item.amount if item.type == "income" else -item.amount for item in transactions),
        },
        "average_daily_expense": average_daily_expense,
        "forecast_expenses": forecast_expenses,
    }


@app.get("/goals")
def get_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Goal).filter(Goal.user_id == current_user.id).order_by(Goal.deadline.asc()).all()


@app.post("/goals", status_code=201)
def create_goal(goal: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Goal(**goal.model_dump())
    item.completed = int(goal.completed)
    item.user_id = current_user.id
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/goals/{goal_id}")
def update_goal(goal_id: int, goal: GoalUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    for field, value in goal.model_dump(exclude_unset=True).items():
        setattr(item, field, int(value) if field == "completed" else value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": goal_id}


@app.get("/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    if not item:
        item = Setting(user_id=current_user.id)
        db.add(item)
        db.commit()
        db.refresh(item)
    return item


@app.put("/settings")
def update_settings(settings: SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    if not item:
        item = Setting(user_id=current_user.id)
        db.add(item)
    for field, value in settings.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@app.get("/ai/history")
def ai_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.id.asc()).all()


@app.delete("/ai/history")
def clear_ai_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"deleted": True}


@app.post("/ai/chat")
def ai_chat(request: AIRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    model = settings.llm_model if settings else "llama3"
    history = [
        {"role": message.role, "content": message.content}
        for message in db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.id.desc()).limit(12).all()[::-1]
    ]
    db.add(ChatMessage(role="user", content=request.question, created_at=datetime.utcnow().isoformat(), user_id=current_user.id))
    db.commit()
    try:
        answer = ask_ai(request.question, model, history)
    except (ConnectionError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    db.add(ChatMessage(role="assistant", content=answer, created_at=datetime.utcnow().isoformat(), user_id=current_user.id))
    db.commit()
    return {"answer": answer}


@app.get("/ai/analyze")
def ai_analyze(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    stats: dict[str, float] = {}
    for item in transactions:
        if item.type == "expense":
            stats[item.category] = stats.get(item.category, 0) + item.amount
    settings = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    model = settings.llm_model if settings else "llama3"
    try:
        return {"analysis": analyze_finances(stats, model)}
    except (ConnectionError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/ai/categorize")
def categorize_text(request: SmartTextRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    model = settings.llm_model if settings else "llama3"
    try:
        return parse_smart_transaction(request.text, model)
    except Exception:
        return parse_smart_transaction(request.text)


@app.get("/subscriptions")
def list_subscriptions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Subscription).filter(Subscription.user_id == current_user.id).order_by(Subscription.next_payment_date.asc()).all()


@app.post("/subscriptions", status_code=201)
def create_subscription(subscription: SubscriptionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Subscription(**subscription.model_dump(), user_id=current_user.id)
    item.active = int(subscription.active)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/subscriptions/{subscription_id}")
def update_subscription(subscription_id: int, subscription: SubscriptionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Subscription).filter(Subscription.id == subscription_id, Subscription.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    for field, value in subscription.model_dump(exclude_unset=True).items():
        setattr(item, field, int(value) if field == "active" else value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/subscriptions/{subscription_id}")
def delete_subscription(subscription_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Subscription).filter(Subscription.id == subscription_id, Subscription.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": subscription_id}


@app.get("/subscriptions/reminders")
def subscription_reminders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Subscription).filter(Subscription.user_id == current_user.id, Subscription.active == 1).all()
    today = datetime.utcnow().date()
    reminders = []
    for item in items:
        try:
            payment = datetime.strptime(item.next_payment_date, "%Y-%m-%d").date()
            days = (payment - today).days
            if 0 <= days <= 7:
                reminders.append({"id": item.id, "name": item.name, "amount": item.amount, "next_payment_date": item.next_payment_date, "days_left": days})
        except ValueError:
            continue
    return reminders


@app.get("/recurring")
def list_recurring(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(RecurringTransaction).filter(RecurringTransaction.user_id == current_user.id).order_by(RecurringTransaction.next_date.asc()).all()


@app.post("/recurring", status_code=201)
def create_recurring(recurring: RecurringCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = RecurringTransaction(**recurring.model_dump(), user_id=current_user.id)
    item.active = int(recurring.active)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/recurring/{recurring_id}")
def update_recurring(recurring_id: int, recurring: RecurringUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(RecurringTransaction).filter(RecurringTransaction.id == recurring_id, RecurringTransaction.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Регулярная операция не найдена")
    for field, value in recurring.model_dump(exclude_unset=True).items():
        setattr(item, field, int(value) if field == "active" else value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/recurring/{recurring_id}")
def delete_recurring(recurring_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(RecurringTransaction).filter(RecurringTransaction.id == recurring_id, RecurringTransaction.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Регулярная операция не найдена")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": recurring_id}


@app.post("/recurring/process")
def process_recurring(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.utcnow().date()
    created = 0
    items = db.query(RecurringTransaction).filter(RecurringTransaction.user_id == current_user.id, RecurringTransaction.active == 1).all()
    for item in items:
        try:
            next_date = datetime.strptime(item.next_date, "%Y-%m-%d").date()
        except ValueError:
            continue
        while next_date <= today:
            db.add(Transaction(type=item.type, category=item.category, amount=item.amount, date=next_date.isoformat(), comment=item.name, user_id=current_user.id))
            created += 1
            if item.frequency == "daily":
                next_date += timedelta(days=1)
            elif item.frequency == "weekly":
                next_date += timedelta(days=7)
            elif item.frequency == "monthly":
                next_month = next_date.month % 12 + 1
                next_year = next_date.year + (1 if next_date.month == 12 else 0)
                day = min(next_date.day, 28)
                next_date = next_date.replace(year=next_year, month=next_month, day=day)
            else:
                next_date = next_date.replace(year=next_date.year + 1)
            item.next_date = next_date.isoformat()
    db.commit()
    return {"created": created}


@app.get("/financial-health")
def financial_health(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    income = sum(item.amount for item in transactions if item.type == "income")
    expenses = sum(item.amount for item in transactions if item.type == "expense")
    monthly_expenses = {}
    category_expenses = {}
    for item in transactions:
        if item.type == "expense":
            month = item.date[:7]
            monthly_expenses[month] = monthly_expenses.get(month, 0) + item.amount
            category_expenses[item.category] = category_expenses.get(item.category, 0) + item.amount

    average_expense = sum(monthly_expenses.values()) / len(monthly_expenses) if monthly_expenses else 0
    emergency_fund = round(average_expense * 6, 2)
    emergency_progress = round(min(100, ((income - expenses) / emergency_fund) * 100), 1) if emergency_fund else 0
    savings_level = round((income - expenses) / income * 100, 1) if income else 0
    category_count = len(category_expenses)
    diversification = round(min(100, category_count * 15), 1)
    budget_quality = round(max(0, min(100, 100 - (abs(savings_level) * 0.25))) if income else 0, 1)
    goal_progress = round(sum(min(100, item.current_amount / item.target_amount * 100) for item in goals) / len(goals), 1) if goals else 0
    score = round(max(0, min(100, savings_level * 0.35 + diversification * 0.15 + budget_quality * 0.25 + goal_progress * 0.25)), 1)

    top_categories = [{"name": name, "amount": amount} for name, amount in sorted(category_expenses.items(), key=lambda entry: entry[1], reverse=True)]
    monthly_history = [{"month": month, "score": round(max(0, min(100, 50 + (income - amount) / income * 30)), 1) if income else 0} for month, amount in sorted(monthly_expenses.items())]
    recommendations = []
    if savings_level < 20:
        recommendations.append("Увеличьте уровень сбережений до минимум 20% ежемесячного дохода.")
    if category_count > 6:
        recommendations.append("Многие расходы распределены по слишком большому числу категорий.")
    if top_categories:
        recommendations.append(f"Особое внимание уделите категории «{top_categories[0]['name']}».")
    if emergency_progress < 100:
        recommendations.append("Начните регулярно пополнять подушку безопасности.")
    if not recommendations:
        recommendations.append("Финансовая ситуация стабильна. Продолжайте регулярный контроль расходов.")

    return {
        "financial_score": score,
        "savings_level": savings_level,
        "diversification": diversification,
        "budget_quality": budget_quality,
        "goal_progress": goal_progress,
        "emergency_fund": emergency_fund,
        "emergency_progress": emergency_progress,
        "monthly_history": monthly_history,
        "top_categories": top_categories,
        "recommendations": recommendations,
    }


ACHIEVEMENT_DEFINITIONS = [
    ("first_goal", "Первая цель", "Создана первая финансовая цель."),
    ("saved_100k", "Накоплено 100 000 ₸", "Текущие накопления по одной цели достигли 100 000 ₸."),
    ("seven_days", "7 дней учёта", "Расходы учитывались 7 дней подряд."),
    ("thirty_days", "30 дней учёта", "Расходы учитывались 30 дней подряд."),
]


@app.get("/achievements")
def list_achievements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    achievements = db.query(Achievement).filter(Achievement.user_id == current_user.id).all()
    earned_codes = {item.code: item for item in achievements}
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    earned = set()
    if goals:
        earned.add("first_goal")
    if any(goal.current_amount >= 100000 for goal in goals):
        earned.add("saved_100k")
    expense_dates = sorted({item.date for item in transactions if item.type == "expense"})
    streak = 0
    for index in range(len(expense_dates) - 1, -1, -1):
        if index == len(expense_dates) - 1:
            streak = 1
        else:
            previous = datetime.strptime(expense_dates[index + 1], "%Y-%m-%d").date()
            current = datetime.strptime(expense_dates[index], "%Y-%m-%d").date()
            if (previous - current).days == 1:
                streak += 1
            else:
                break
    if streak >= 7:
        earned.add("seven_days")
    if streak >= 30:
        earned.add("thirty_days")

    result = []
    now = datetime.utcnow().isoformat()
    for code, name, description in ACHIEVEMENT_DEFINITIONS:
        item = earned_codes.get(code)
        if code in earned and item is None:
            item = Achievement(code=code, name=name, description=description, earned_at=now, user_id=current_user.id)
            db.add(item)
            db.flush()
        result.append({
            "code": code,
            "name": name,
            "description": description,
            "earned": code in earned,
            "earned_at": item.earned_at if item else None,
        })
    db.commit()
    return result


@app.get("/reports/monthly")
def monthly_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    month = datetime.utcnow().strftime("%Y-%m")
    income = sum(item.amount for item in transactions if item.type == "income" and item.date.startswith(month))
    expenses = sum(item.amount for item in transactions if item.type == "expense" and item.date.startswith(month))
    category_totals = {}
    for item in transactions:
        if item.type == "expense" and item.date.startswith(month):
            category_totals[item.category] = category_totals.get(item.category, 0) + item.amount
    top_category = max(category_totals, key=category_totals.get) if category_totals else "Нет расходов"
    settings = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    model = settings.llm_model if settings else "llama3"
    prompt = f"Составь краткий финансовый отчёт за {month}. Доходы: {income}. Расходы: {expenses}. Категории: {category_totals}. Дай 3 рекомендации."
    try:
        content = ask_ai(prompt, model)
    except (ConnectionError, RuntimeError):
        content = f"Доходы: {income} ₸. Расходы: {expenses} ₸. Основная категория: {top_category}. Ollama недоступна."
    existing = db.query(Report).filter(Report.user_id == current_user.id, Report.month == month).first()
    if existing:
        existing.title = f"Финансовый отчёт за {month}"
        existing.content = content
    else:
        db.add(Report(month=month, title=f"Финансовый отчёт за {month}", content=content, created_at=datetime.utcnow().isoformat(), user_id=current_user.id))
    db.commit()
    return {"month": month, "income": income, "expenses": expenses, "top_category": top_category, "categories": category_totals, "content": content}


@app.get("/exports/csv")
def export_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.desc()).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "type", "category", "amount", "date", "comment"])
    for item in transactions:
        writer.writerow([item.id, item.type, item.category, item.amount, item.date, item.comment])
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=transactions.csv"})


@app.get("/exports/xlsx")
def export_xlsx(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from openpyxl import Workbook

    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.desc()).all()
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Transactions"
    sheet.append(["ID", "Тип", "Категория", "Сумма", "Дата", "Комментарий"])
    for item in transactions:
        sheet.append([item.id, item.type, item.category, item.amount, item.date, item.comment])
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=transactions.xlsx"})


@app.get("/exports/pdf")
def export_pdf(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.desc()).all()
    output = BytesIO()
    pdf = canvas.Canvas(output, pagesize=A4)
    width, height = A4
    pdf.setTitle("Financial Report")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(40, height - 50, "Personal Finance Assistant")
    pdf.setFont("Helvetica", 11)
    y = height - 90
    for item in transactions[:100]:
        if y < 50:
            pdf.showPage()
            y = height - 50
        pdf.drawString(40, y, f"{item.date} | {item.category} | {item.type} | {item.amount} ₸")
        y -= 18
    pdf.save()
    output.seek(0)
    return StreamingResponse(output, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=financial-report.pdf"})
