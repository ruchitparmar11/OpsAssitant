import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load .env
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GEMINI_API_KEY")

with open("test_result.txt", "w") as f:
    if not api_key:
        f.write("ERROR: No API Key found in environment variables.")
    else:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-flash-latest')
            response = model.generate_content("Say 'Hello' if you can hear me.")
            f.write(f"SUCCESS: {response.text}")
        except Exception as e:
            f.write(f"ERROR: {str(e)}")
