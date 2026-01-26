import requests
try:
    r = requests.get("http://localhost:8000/api/analytics", timeout=5)
    print(f"Status: {r.status_code}")
    print(r.text) # Print full response to see traceback
except Exception as e:
    print(f"Error: {e}")
