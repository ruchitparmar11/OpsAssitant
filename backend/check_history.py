import requests
try:
    r = requests.get("http://localhost:8000/api/history", timeout=5)
    print(f"Status: {r.status_code}")
    print(r.text[:200])
except Exception as e:
    print(f"Error: {e}")
