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
        print("DEBUG: token.json found.")
        try:
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        except Exception as e:
            print(f"DEBUG: Error loading token.json: {e}")
            creds = None
    else:
        print("DEBUG: token.json NOT found.")
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("DEBUG: Token expired, attempting refresh...")
            try:
                creds.refresh(Request())
                print("DEBUG: Token refreshed successfully.")
            except Exception as e:
                print(f"DEBUG: Token refresh failed: {e}")
                creds = None

        if not creds or not creds.valid:
            # Check if running on Render
            if os.environ.get("RENDER") or os.environ.get("on_render"): # Render sets 'RENDER' usually, checking generic
                 print("CRITICAL: Authentication failed on Render. Cannot open local browser.")
                 print("ACTION REQUIRED: Please update the GOOGLE_TOKEN_JSON environment variable with a fresh local token.")
                 raise RuntimeError("Authentication failed on Cloud Server. Check server logs.")

            if not os.path.exists('credentials.json'):
                raise FileNotFoundError("credentials.json not found. Please download it from Google Cloud Console.")
                
            print("Starting OAuth flow (Local)...")
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            success_message = """
            <html>
                <head>
                    <title>Authentication Successful</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            background-color: #f8fafc; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            margin: 0; 
                        }
                        .card { 
                            background: white; 
                            padding: 3rem; 
                            border-radius: 16px; 
                            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
                            text-align: center; 
                            max-width: 400px;
                        }
                        h1 { color: #059669; font-size: 1.5rem; margin-top: 0; margin-bottom: 0.5rem; }
                        p { color: #64748b; margin-bottom: 2rem; line-height: 1.5; }
                        .btn {
                            background-color: #0f172a;
                            color: white;
                            padding: 0.75rem 1.5rem;
                            border-radius: 0.5rem;
                            text-decoration: none;
                            font-weight: 500;
                            border: none;
                            cursor: pointer;
                            transition: all 0.2s;
                        }
                        .btn:hover { background-color: #334155; transform: translateY(-1px); }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
                        <h1>Connected Successfully!</h1>
                        <p>Your Gmail account has been linked.<br>You can now close this tab and return to the application.</p>
                        <button onclick="window.close()" class="btn">Close Tab</button>
                    </div>
                    <script>
                        function closeWindow() {
                            // Specialized hacks for different browsers
                            try {
                                window.opener = null;
                                window.open('', '_self');
                                window.close();
                                // Double check for some older browser versions
                                open(location, '_self').close();
                            } catch (e) {
                                console.log("Auto-close blocked by browser", e);
                            }
                        }
                        
                        // Attempt immediately
                        closeWindow();
                        
                        // Attempt again after a short delay
                        setTimeout(closeWindow, 1000);
                        setTimeout(closeWindow, 3000);
                    </script>
                </body>
            </html>
            """
            creds = flow.run_local_server(port=0, success_message=success_message)
            print("OAuth flow completed.")
            
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    service = build('gmail', 'v1', credentials=creds)
    return service

def fetch_recent_emails(limit=5, next_page_token=None):
    """
    Fetches the most recent 'limit' emails from the inbox.
    Supports pagination.
    """
    service = get_gmail_service()
    
    # Call the Gmail API
    # Modified to fetch 'full' format to ensure we get body snippet if standard parsing fails
    kwargs = {'userId': 'me', 'maxResults': limit, 'labelIds': ['INBOX']}
    if next_page_token:
        kwargs['pageToken'] = next_page_token
        
    results = service.users().messages().list(**kwargs).execute()
    messages = results.get('messages', [])
    new_next_page_token = results.get('nextPageToken', None)
    
    email_data = []
    
    if not messages:
        print('No labels found.')
        return [], None

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

    return email_data, new_next_page_token

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
