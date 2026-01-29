from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
import json
import asyncio
import os
from pydantic import BaseModel

from models import EmailRequest, EmailAnalysis
from services.ai_agent import analyze_email_with_gemini
from database import create_db_and_tables, get_session
from db_models import LoggedEmail, KnowledgeBase, AISettings

app = FastAPI(title="AI Operations Assistant API", version="1.0.0")

# CORS - Allow the frontend to call us
origins = [
    "http://localhost:3000", 
    "http://localhost:3001",
]

# Add production frontend URL
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)
    # Also allow variants like https/http if user puts one
    if "https://" in frontend_url:
        origins.append(frontend_url.replace("https://", "http://"))

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins.extend(allowed_origins_env.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Restore credentials from Env Vars if files don't exist (for Cloud Deployment)
    if not os.path.exists("credentials.json"):
        creds_content = os.environ.get("GOOGLE_CREDENTIALS_JSON")
        if creds_content:
            print("Writing credentials.json from environment variable...")
            with open("credentials.json", "w") as f:
                f.write(creds_content)
                
    if not os.path.exists("token.json"):
        token_content = os.environ.get("GOOGLE_TOKEN_JSON")
        if token_content:
            print("Writing token.json from environment variable...")
            with open("token.json", "w") as f:
                f.write(token_content)

    create_db_and_tables()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/gmail-status")
def gmail_status():
    """Check if Gmail is connected by checking if token.json exists"""
    import os
    token_exists = os.path.exists("token.json")
    return {"connected": token_exists}

@app.post("/api/logout")
def logout():
    """Deletes token.json to disconnect Gmail"""
    import os
    try:
        if os.path.exists("token.json"):
            os.remove("token.json")
            return {"status": "success", "message": "Logged out successfully"}
        else:
            return {"status": "success", "message": "Already logged out"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/history", response_model=List[LoggedEmail])
def get_history(session: Session = Depends(get_session)):
    """
    Fetch recent analyzed emails from the database.
    """
    statement = select(LoggedEmail).order_by(LoggedEmail.id.desc())
    results = session.exec(statement).all()
    return results

from services.gmail_service import fetch_recent_emails, send_message, create_draft
from models import SendEmailRequest, GmailMessage

@app.post("/api/send-reply")
def api_send_reply(request: SendEmailRequest, session: Session = Depends(get_session)):
    """
    Sends an email reply.
    """
    try:
        print(f"📧 Sending reply to {request.to}...")
        send_message(request.to, request.subject, request.body)
        
        # Update database if email_id is provided
        if request.email_id:
            email_record = session.get(LoggedEmail, request.email_id)
            if email_record:
                email_record.is_replied = True
                email_record.suggested_reply = request.body # Update with actual sent body
                session.add(email_record)
                session.commit()
                
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/create-draft")
def api_create_draft(request: SendEmailRequest):
    """
    Creates a draft email in Gmail.
    """
    try:
        print(f"📝 Creating draft for {request.to}...")
        create_draft(request.to, request.subject, request.body)
        return {"status": "success", "message": "Draft created successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/gmail-inbox", response_model=List[GmailMessage])
def get_gmail_inbox(limit: int = 10):
    """
    Fetches recent emails from Gmail (raw, without analysis).
    """
    try:
        print(f"📥 Fetching {limit} emails from Gmail...")
        emails = fetch_recent_emails(limit=limit)
        return emails
    except Exception as e:
        import traceback
        traceback.print_exc()
        return []

@app.post("/api/analyze-email", response_model=EmailAnalysis)
async def analyze_email_api(request: EmailRequest, session: Session = Depends(get_session)):
    """
    Analyzes a single email.
    """
    try:
        # Get Context & Settings
        context = get_knowledge_context(session)
        tone, signature = get_current_settings(session)

        print(f"🤖 Analyzing single email: {request.subject}")
        analysis = await asyncio.to_thread(
            analyze_email_with_gemini,
            sender=request.sender,
            subject=request.subject,
            body=request.body,
            context=context,
            tone=tone,
            signature=signature
        )
        return analysis
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-batch")
async def analyze_batch(messages: List[GmailMessage], session: Session = Depends(get_session)):
    """
    Analyzes a specific list of Gmail messages in parallel.
    """
    try:
        # 0. Get Context & Settings
        context = get_knowledge_context(session)
        tone, signature = get_current_settings(session)
        
        analyzed_count = 0
        
        if not messages:
            return {"status": "success", "message": "No messages to analyze."}

        # Definition helper for parallel execution
        async def analyze_and_return(email_data):
            # Check if already processed
            existing_email = session.exec(
                select(LoggedEmail).where(LoggedEmail.gmail_message_id == email_data.id)
            ).first()
            
            if existing_email:
                 print(f"⏩ Email {email_data.id} already exists. Deleting pending re-analysis.")
                 session.delete(existing_email)
                 session.commit() # Commit deletion immediately so we can re-add it cleanly later
                 # return None # Don't skip anymore

            print(f"🤖 Analyzing email: {email_data.subject}")
            analysis = await asyncio.to_thread(
                analyze_email_with_gemini,
                sender=email_data.sender,
                subject=email_data.subject,
                body=email_data.body,
                context=context,
                tone=tone,
                signature=signature
            )
            return email_data, analysis

        # Run analysis in parallel
        print(f"🚀 Starting batch analysis for {len(messages)} emails...")
        tasks = [analyze_and_return(msg) for msg in messages]
        results = await asyncio.gather(*tasks)
        
        # Save results (Sequentially)
        for result in results:
            if not result: continue
            
            email_data, analysis = result
            
            db_email = LoggedEmail(
                gmail_message_id=email_data.id,
                sender=email_data.sender,
                subject=email_data.subject,
                body=email_data.body,
                category=analysis.category,
                summary=analysis.summary,
                sentiment=analysis.sentiment,
                urgency=analysis.urgency,
                suggested_reply=analysis.suggested_reply,
                action_items_json=json.dumps([item.dict() for item in analysis.action_items])
            )
            session.add(db_email)
            analyzed_count += 1
            
        session.commit()
        
        return {"status": "success", "message": f"Successfully analyzed {analyzed_count} emails."}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.get("/api/analytics")
def get_analytics(session: Session = Depends(get_session)):
    """
    Returns dashboard analytics data based on processed emails.
    """
    try:
        print("DEBUG: Fetching emails")
        emails = session.exec(select(LoggedEmail)).all()
        
        total_emails = len(emails)
        
        # Heuristics for "saved" metrics
        # Assume automated processing saves ~5 mins (0.083 hrs) per email
        time_saved_hours = total_emails * 0.083
        
        # Get hourly rate setting
        print("DEBUG: Fetching settings")
        settings = session.exec(select(AISettings)).first()
        # Handle case where settings might be None or hourly_rate might be missing/None
        hourly_rate = 50.0
        if settings:
             # Ensure we don't crash if hourly_rate is None (e.g. schema migration issue)
             hourly_rate = getattr(settings, 'hourly_rate', 50.0) 
             if hourly_rate is None: hourly_rate = 50.0

        print(f"DEBUG: Hourly rate: {hourly_rate}")
        money_saved = time_saved_hours * hourly_rate
        
        # Collect all action items
        print("DEBUG: Processing actions")
        all_pending_actions = []
        for email in emails:
            try:
                actions = json.loads(email.action_items_json)
                for action in actions:
                    all_pending_actions.append({
                        "title": action.get('description', 'Untitled Task'),
                        "desc": f"From: {email.sender}",
                        "priority": action.get('priority', 'Medium'),
                        "email_id": email.id
                    })
            except Exception as e:
                # print(f"DEBUG: Error parsing actions for email {email.id}: {e}")
                continue
                
        # Filter to show mostly High/Medium priority
        pending_actions = [a for a in all_pending_actions if a['priority'] in ['High', 'Medium']][:5]
        if not pending_actions:
            pending_actions = all_pending_actions[:5]
            
        return {
            "time_saved_hours": round(time_saved_hours, 1),
            "money_saved": int(money_saved),
            "tasks_automated": total_emails,
            "efficiency_score_percent": min(15 + total_emails, 99),  # Dynamic score
            "pending_actions": pending_actions
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "time_saved_hours": 0,
            "money_saved": 0,
            "tasks_automated": 0,
            "efficiency_score_percent": 0,
            "pending_actions": [],
            "error": str(e)
        }


# Knowledge Base Endpoints
# Knowledge Base Endpoints
# Triger Reload 2
class KnowledgeBaseRequest(BaseModel):
    topic: str
    content: str
    

    
@app.get("/api/knowledge", response_model=List[KnowledgeBase])
def get_knowledge(session: Session = Depends(get_session)):
    return session.exec(select(KnowledgeBase)).all()

@app.post("/api/knowledge")
def add_knowledge(item: KnowledgeBaseRequest, session: Session = Depends(get_session)):
    kb_item = KnowledgeBase(topic=item.topic, content=item.content)
    session.add(kb_item)
    session.commit()
    return {"status": "success", "message": "Added to knowledge base"}

@app.delete("/api/knowledge/{item_id}")
def delete_knowledge(item_id: int, session: Session = Depends(get_session)):
    item = session.get(KnowledgeBase, item_id)
    if not item:
        return {"status": "error", "message": "Item not found"}
    session.delete(item)
    session.commit()
    return {"status": "success", "message": "Deleted"}

# Settings Endpoints
class SettingsRequest(BaseModel):
    tone: str
    signature: str
    hourly_rate: float = 50.0

@app.get("/api/settings")
def get_settings(session: Session = Depends(get_session)):
    settings = session.exec(select(AISettings)).first()
    settings = session.exec(select(AISettings)).first()
    if not settings:
        return {"tone": "Professional", "signature": "", "hourly_rate": 50.0}
    return settings

@app.post("/api/settings")
def update_settings(request: SettingsRequest, session: Session = Depends(get_session)):
    settings = session.exec(select(AISettings)).first()
    if not settings:
        settings = AISettings(tone=request.tone, signature=request.signature, hourly_rate=request.hourly_rate)
        session.add(settings)
    else:
        settings.tone = request.tone
        settings.signature = request.signature
        settings.hourly_rate = request.hourly_rate
        session.add(settings)
    
    session.commit()
    session.refresh(settings)
    return {"status": "success", "settings": settings}

def get_current_settings(session: Session):
    settings = session.exec(select(AISettings)).first()
    if not settings:
        return "Professional", ""
    return settings.tone, settings.signature

# Helper to get knowledge context
def get_knowledge_context(session: Session) -> str:
    limit = 20 # Limit to avoid context overflow
    items = session.exec(select(KnowledgeBase).limit(limit)).all()
    context = ""
    for item in items:
        context += f"Topic: {item.topic}\nInfo: {item.content}\n\n"
    return context
