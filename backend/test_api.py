import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(method, path, data=None):
    url = f"{BASE_URL}{path}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        else:
            response = requests.post(url, json=data, timeout=10)
        
        print(f"[{method}] {path} - Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"[{method}] {path} - Exception: {e}")

if __name__ == "__main__":
    print("Testing Endpoints...")
    test_endpoint("GET", "/api/inventory")
    test_endpoint("GET", "/api/inventory/stats")
    test_endpoint("GET", "/api/forecast")
    test_endpoint("POST", "/api/chat", data={"message": "hello", "context": ""})
