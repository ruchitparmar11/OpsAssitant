import requests
import json
print("Starting check_models...")

def get_free_models():
    try:
        response = requests.get("https://openrouter.ai/api/v1/models")
        if response.status_code == 200:
            data = response.json()
            # Filter for models that have 'free' in their ID or pricing
            free_models = []
            for model in data['data']:
                # Check for explicit :free tag or 0 pricing
                if ':free' in model['id'] or (
                    float(model.get('pricing', {}).get('prompt', 1)) == 0 and 
                    float(model.get('pricing', {}).get('completion', 1)) == 0
                ):
                    free_models.append(model['id'])
            
            # Sort and write to file
            free_models.sort()
            with open("valid_models.txt", "w") as f:
                for m in free_models:
                    f.write(f"{m}\n")
            print("Written to valid_models.txt")
        else:
            print(f"Failed to fetch models: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_free_models()
