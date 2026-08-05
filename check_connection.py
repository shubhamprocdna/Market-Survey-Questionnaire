import sys
import requests

def test_connection():
    print("==================================================")
    print("      MARKET SURVEY QUESTIONNAIRE CONNECTION TEST  ")
    print("==================================================")
    
    # 1. Test Backend Server
    backend_url = "http://127.0.0.1:8000"
    print(f"\n1. Testing Backend Server at {backend_url}...")
    try:
        res = requests.get(f"{backend_url}/health", timeout=3)
        if res.status_code == 200:
            data = res.json()
            if data.get("status") == "healthy":
                print("   [OK] Backend is running and healthy!")
                print(f"        Message: \"{data.get('message')}\"")
            else:
                print("   [WARNING] Backend returned an unexpected response format:")
                print(f"             {data}")
        else:
            print(f"   [ERROR] Backend returned HTTP status code {res.status_code}.")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("   [ERROR] Cannot connect to Backend server.")
        print("           Make sure uvicorn is running on port 8000:")
        print("           uvicorn app.main:app --reload")
        sys.exit(1)

    # 2. Test Integration (Chat Endpoint)
    print(f"\n2. Testing Chat Endpoint integration...")
    try:
        payload = {"message": "Hello Backend!"}
        res = requests.post(f"{backend_url}/chat", json=payload, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if "reply" in data:
                print("   [OK] Integration check passed successfully!")
                print(f"        Response: \"{data.get('reply')}\"")
            else:
                print("   [WARNING] Chat endpoint returned unexpected JSON keys:")
                print(f"             {data}")
        else:
            print(f"   [ERROR] Chat endpoint returned HTTP status code {res.status_code}.")
            sys.exit(1)
    except Exception as e:
        print(f"   [ERROR] Chat endpoint test failed: {e}")
        sys.exit(1)

    # 3. Test Frontend Next.js Server
    frontend_url = "http://localhost:3000"
    print(f"\n3. Testing Frontend Next.js Server at {frontend_url}...")
    try:
        res = requests.get(frontend_url, timeout=3)
        if res.status_code == 200:
            print("   [OK] Frontend dev server is running and accessible!")
        else:
            print(f"   [WARNING] Frontend returned HTTP status code {res.status_code}.")
    except requests.exceptions.ConnectionError:
        print("   [ERROR] Cannot connect to Frontend server.")
        print("           Make sure the Next.js dev server is running on port 3000:")
        print("           npm run dev")
        sys.exit(1)

    print("\n==================================================")
    print("  STATUS: ALL CONNECTIONS WORK CORRECTLY!")
    print("==================================================")

if __name__ == "__main__":
    test_connection()
