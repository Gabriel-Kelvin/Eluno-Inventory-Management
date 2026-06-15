import requests
import time
import sys

BASE_URL = "http://localhost:3000"

def test_page(path):
    url = f"{BASE_URL}{path}"
    try:
        response = requests.get(url, timeout=30)
        print(f"GET {path} - Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error reading {path}")
    except Exception as e:
        print(f"GET {path} - Exception: {e}")

if __name__ == "__main__":
    print("Testing Frontend Pages... This might take a bit for initial compilation.")
    # Give the dev server a couple seconds to be ready
    time.sleep(2)
    test_page("/")
    test_page("/inventory")
    test_page("/forecasting")
    test_page("/copilot")
