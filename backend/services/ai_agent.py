import os
import json
import requests
import time
from dotenv import load_dotenv
from models import EmailAnalysis
from pathlib import Path

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configure OpenRouter
api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    print("Warning: OPENROUTER_API_KEY not found in environment variables.")

# List of free models to try (in priority order)
FREE_MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "microsoft/phi-4:free",
    "google/gemini-exp-1206:free",
    "meta-llama/llama-3.3-70b-instruct:free", 
    "mistralai/mistral-7b-instruct:free",
    "huggingfaceh4/zephyr-7b-beta:free",
]

def analyze_email_with_openrouter(sender: str, subject: str, body: str, context: str = "", tone: str = "Professional", signature: str = "") -> EmailAnalysis:
    """
    Uses OpenRouter (with free models) to analyze an email and return structured JSON data.
    Tries multiple models if one fails due to rate limits.
    """
    
    prompt = f"""
    You are an expert Operations Assistant for a small business. 
    Analyze the following email and extract structured data.
    
    Preferences:
    - Tone: {tone}
    - Signature to use: {signature}
    
    Business Knowledge Base (Use this to answer questions/draft replies):
    {context}
    
    Email Details:
    - Sender: {sender}
    - Subject: {subject}
    - Body: {body}
    
    Return the response in pure JSON format (no markdown code blocks) matching this schema:
    {{
        "category": "Lead" | "Invoice" | "Support" | "Spam" | "Other",
        "summary": "One sentence summary",
        "sentiment": "Positive" | "Neutral" | "Negative",
        "urgency": 1-10 (integer),
        "action_items": [
            {{ "description": "Action 1", "priority": "High" | "Medium" | "Low" }}
        ],
        "suggested_reply": "Draft a reply using the specified Tone ({tone}) and Signature. Use Knowledge Base info if relevant."
    }}
    """
    
    last_error = None
    
    # Try each model in sequence
    for model_name in FREE_MODELS:
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_name,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                },
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"❌ Model {model_name} failed with {response.status_code}: {response.text}")
                last_error = f"{response.status_code}: {response.text}"
                
                # If rate limited (429), try next model
                if response.status_code == 429:
                    print(f"Model {model_name} rate limited, trying next...")
                    time.sleep(1)  # Brief delay before trying next model
                continue
                
            result = response.json()
            if 'choices' not in result or not result['choices']:
                 print(f"❌ Invalid response from {model_name}: {result}")
                 continue
                 
            text_response = result['choices'][0]['message']['content']
            
            # Clean up potential markdown formatting
            if text_response.startswith("```"):
                text_response = text_response.strip("`").replace("json", "").strip()
                
            data = json.loads(text_response)
            print(f"Successfully analyzed with model: {model_name}")
            return EmailAnalysis(**data)
            
        except requests.exceptions.RequestException as e:
            print(f"Error with model {model_name}: {e}")
            last_error = str(e)
            continue
        except Exception as e:
            print(f"Error parsing response from {model_name}: {e}")
            last_error = str(e)
            continue
    
    # If all models failed, return error response
    print(f"All models failed. Last error: {last_error}")
    return EmailAnalysis(
        category="Error", 
        summary=f"All AI models unavailable. Please try again later.", 
        sentiment="Neutral", 
        urgency=5, 
        action_items=[{"description": "Retry email analysis later", "priority": "Medium"}],
        suggested_reply="Thank you for your email. We'll review it and get back to you shortly."
    )

# Keep the old function name for backward compatibility
analyze_email_with_gemini = analyze_email_with_openrouter
