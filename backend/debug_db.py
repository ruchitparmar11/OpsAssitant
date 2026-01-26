from sqlmodel import Session, select, create_engine
from db_models import AISettings

# Adjust connection string if needed (assuming sqlite:///database.db)
engine = create_engine("sqlite:///database.db")

try:
    with Session(engine) as session:
        print("Querying settings...")
        settings = session.exec(select(AISettings)).first()
        print(f"Settings found: {settings}")
        if settings:
             print(f"Hourly rate: {settings.hourly_rate}")
except Exception as e:
    import traceback
    traceback.print_exc()
