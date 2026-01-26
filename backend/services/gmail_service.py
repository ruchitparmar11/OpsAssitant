import os.path
import base64
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from bs4 import BeautifulSoup
from email.mime.text import MIMEText
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
# If modifying these scopes, delete the file token.json.
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose'
]

def get_gmail_service():
    """Shows basic usage of the Gmail API.
    Lists the user's Gmail labels.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                raise FileNotFoundError("credentials.json not found. Please download it from Google Cloud Console.")
                
            print("Starting OAuth flow...")
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
            print("OAuth flow completed.")
            
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    service = build('gmail', 'v1', credentials=creds)
    return service

def fetch_recent_emails(limit=5):
    """
    Fetches the most recent 'limit' emails from the inbox.
    """
    service = get_gmail_service()
    
    # Call the Gmail API
    # Modified to fetch 'full' format to ensure we get body snippet if standard parsing fails
    results = service.users().messages().list(userId='me', maxResults=limit, labelIds=['INBOX']).execute()
    messages = results.get('messages', [])
    
    email_data = []
    
    if not messages:
        print('No labels found.')
        return []

    for message in messages:
        try:
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            
            # Extract headers
            headers = msg['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")
            sender = next((h['value'] for h in headers if h['name'] == 'From'), "Unknown Sender")
            
            # Extract Body
            body = ""
            if 'parts' in msg['payload']:
                for part in msg['payload']['parts']:
                    if part['mimeType'] == 'text/plain':
                         if 'data' in part['body']:
                            data = part['body']['data']
                            body += base64.urlsafe_b64decode(data).decode()
            elif 'body' in msg['payload']:
                 if 'data' in msg['payload']['body']:
                    data = msg['payload']['body']['data']
                    body = base64.urlsafe_b64decode(data).decode()
            
            # Simple cleanup
            if not body:
                body = msg.get('snippet', "") # Fallback to snippet
                
            email_data.append({
                "id": message['id'],            
                "sender": sender,
                "subject": subject,
                "body": body
            })
        except Exception as e:
            print(f"Error fetching email {message['id']}: {e}")
            continue

    return email_data

def create_message(sender, to, subject, message_text):
    """Create a message for an email."""
    message = MIMEText(message_text)
    message['to'] = to
    message['from'] = sender
    message['subject'] = subject
    return {'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()}

def send_message(to, subject, message_text):
    """Send an email message."""
    service = get_gmail_service()
    try:
        message = create_message("me", to, subject, message_text)
        sent_message = service.users().messages().send(userId="me", body=message).execute()
        return sent_message
    except HttpError as error:
        print(f'An error occurred: {error}')
        raise error

def create_draft(to, subject, message_text):
    """Create a draft email."""
    service = get_gmail_service()
    try:
        message = create_message("me", to, subject, message_text)
        draft = {'message': message}
        draft_response = service.users().drafts().create(userId="me", body=draft).execute()
        print(f'Draft id: {draft_response["id"]}')
        return draft_response
    except HttpError as error:
        print(f'An error occurred: {error}')
        raise error
