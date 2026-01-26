import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")

print(f"1. Checking API Key...")
if not api_key:
    print("❌ OPENROUTER_API_KEY is missing in .env file!")
    exit()
else:
    print(f"✅ API Key found: {api_key[:5]}...{api_key[-4:]}")

print("\n2. Testing OpenRouter Connection...")
try:
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Operations Assistant",
        },
        json={
            "model": "google/gemini-2.0-flash-exp:free",
            "messages": [
                {"role": "user", "content": "Say hello!"}
            ]
        },
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ Success! Response: {response.json()['choices'][0]['message']['content']}")
    else:
        print(f"❌ Failed! Log this error:\n{response.text}")
        
except Exception as e:
    print(f"❌ Connection Error: {e}")
