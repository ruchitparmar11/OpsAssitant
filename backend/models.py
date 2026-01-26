from pydantic import BaseModel
from typing import List, Optional

class EmailRequest(BaseModel):
    sender: str
    subject: str
    body: str

class ActionItem(BaseModel):
    description: str
    priority: str  # High, Medium, Low

class EmailAnalysis(BaseModel):
    category: str  # e.g., "Lead", "Invoice", "Support", "Spam"
    summary: str
    sentiment: str # Positive, Neutral, Negative
    urgency: int   # 1-10
    action_items: List[ActionItem]
    suggested_reply: Optional[str] = None

class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    email_id: Optional[int] = None

class GmailMessage(BaseModel):
    id: str
    sender: str
    subject: str
    body: str
