from database import get_session
from db_models import LoggedEmail
from sqlmodel import select

# Test if we can query the database
with next(get_session()) as session:
    statement = select(LoggedEmail).order_by(LoggedEmail.id.desc())
    results = session.exec(statement).all()
    print(f"Found {len(results)} emails")
    for email in results:
        print(f"- {email.id}: {email.sender}")
