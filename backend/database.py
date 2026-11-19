from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pathlib import Path

DATABASE_URL = f"sqlite:///{Path(__file__).resolve().parent / 'finance.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)