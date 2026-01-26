from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

class LoggedEmail(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    gmail_message_id: Optional[str] = Field(default=None, index=True) # Unique ID from Gmail
    sender: str
    subject: str
    body: str  # We might store just the first 500 chars if it's huge
    
    # Analysis results
    category: str
    summary: str
    sentiment: str
    urgency: int
    suggested_reply: Optional[str] = None
    
    # JSON string for list of action items
    action_items_json: str = "[]"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_replied: bool = Field(default=False)

class KnowledgeBase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    topic: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AISettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tone: str = "Professional"  # Professional, Friendly, Urgent, Concise
    signature: str = ""       # e.g., "Best,\nRuchit"
    hourly_rate: float = Field(default=50.0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
