import os
from sqlmodel import SQLModel, create_engine, Session

# Check for DATABASE_URL environment variable (Render/Production)
database_url = os.environ.get("DATABASE_URL")

if database_url:
    # Handle Render's postgres:// vs SQLAlchemy's postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    connect_args = {} # No check_same_thread for Postgres
else:
    # Fallback to local SQLite
    sqlite_file_name = "database_v2.db"
    database_url = f"sqlite:///{sqlite_file_name}"
    connect_args = {"check_same_thread": False}

engine = create_engine(database_url, echo=True, connect_args=connect_args)

def create_db_and_tables():
    # Import models to register them with SQLModel metadata
    import db_models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
