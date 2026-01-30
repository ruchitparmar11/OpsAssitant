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
import re
import logging

# Configure logging
logging.basicConfig(
    filename='ai_debug.log', 
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# List of free models to try (in priority order)
# List of free models to try (in priority order)
FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
    "qwen/qwen-2.5-vl-7b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "google/gemma-3-12b-it:free", # Smaller fallback
    "meta-llama/llama-3.2-3b-instruct:free", # Tiny/Fast
    "qwen/qwen3-coder:free", # Good for structured data
    "deepseek/deepseek-r1-0528:free" # Experimental
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
        "category": "Work" | "Lead" | "Invoice" | "Support" | "Spam" | "Personal" | "Other",
        "summary": "Provide a concise, one-sentence summary of the main point of the email.",
        "sentiment": "Positive" | "Neutral" | "Negative",
        "urgency": 1-10 (integer),
        "action_items": [
            {{ "description": "Action 1", "priority": "High" | "Medium" | "Low" }}
        ],
        "suggested_reply": "Draft a reply using the specified Tone ({tone}) and Signature. Use Knowledge Base info if relevant."
    }}
    """
    
    last_error = None
    logging.info(f"Starting analysis for email: {subject}")
    
    # Try each model in sequence
    for model_name in FREE_MODELS:
        try:
            logging.info(f"Trying model: {model_name}")
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000", # OpenRouter requirement
                    "X-Title": "AI Operations Assistant", # OpenRouter requirement
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
                timeout=45 # Increased timeout
            )
            
            if response.status_code != 200:
                error_msg = f"❌ Model {model_name} failed with {response.status_code}: {response.text}"
                print(error_msg)
                logging.error(error_msg)
                last_error = f"{response.status_code}: {response.text}"
                
                # If rate limited (429), try next model
                if response.status_code == 429:
                    print(f"Model {model_name} rate limited, trying next...")
                    time.sleep(1)
                continue
                
            result = response.json()
            if 'choices' not in result or not result['choices']:
                 error_msg = f"❌ Invalid response from {model_name}: {result}"
                 print(error_msg)
                 logging.error(error_msg)
                 continue
                 
            text_response = result['choices'][0]['message']['content']
            logging.info(f"Raw response from {model_name}: {text_response[:200]}...") # Log first 200 chars
            
            # Robust JSON extraction using regex
            # Looks for the first occurrence of '{' and the last occurrence of '}'
            try:
                json_match = re.search(r'(\{[\s\S]*\})', text_response)
                if json_match:
                    text_response = json_match.group(1)
                else:
                    logging.warning("No JSON block found in response, attempting raw parse")
                
                data = json.loads(text_response)
                print(f"Successfully analyzed with model: {model_name}")
                logging.info("Successfully parsed JSON")
                return EmailAnalysis(**data)
            except json.JSONDecodeError as e:
                logging.error(f"JSON Parse Error for {model_name}: {e}. Content: {text_response}")
                print(f"JSON Parse Error: {e}")
                continue # Try next model if this one returned garbage
            
        except requests.exceptions.RequestException as e:
            print(f"Error with model {model_name}: {e}")
            logging.error(f"Request Error: {e}")
            last_error = str(e)
            continue
        except Exception as e:
            print(f"Error parsing response from {model_name}: {e}")
            logging.error(f"General Error: {e}")
            last_error = str(e)
            continue
    
    # If all models failed, return error response
    print(f"All models failed. Last error: {last_error}")
    logging.critical(f"All models failed. Last error: {last_error}")
    return EmailAnalysis(
        category="Other", 
        summary=f"Analysis failed. Please check logs. Last error: {str(last_error)[:100]}", 
        sentiment="Neutral", 
        urgency=5, 
        action_items=[{"description": "Check API Keys and network", "priority": "High"}],
        suggested_reply="Analysis unavailable."
    )

# Keep the old function name for backward compatibility
analyze_email_with_gemini = analyze_email_with_openrouter
