import requests
try:
    print("Testing connection to Backend...")
    resp = requests.get("http://localhost:8000/api/history", timeout=5)
    print(f"Status: {resp.status_code}")
    import json
    data = resp.json()
    print(f"Items found: {len(data)}")
    if len(data) > 0:
        print(f"Last Item Category: {data[0].get('category')}")
except Exception as e:
    print(f"FAILED: {e}")
