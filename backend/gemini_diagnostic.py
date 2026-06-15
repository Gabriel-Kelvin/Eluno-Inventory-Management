import os
import sys
import traceback
import importlib.metadata
from dotenv import load_dotenv

print("--- GEMINI DIAGNOSTIC SCRIPT ---")

packages_to_check = ["google-generativeai", "google-genai", "google-cloud-aiplatform"]
print("\n[1] PACKAGE VERSIONS:")
for pkg in packages_to_check:
    try:
        version = importlib.metadata.version(pkg)
        print(f"  - {pkg}: {version}")
    except importlib.metadata.PackageNotFoundError:
        print(f"  - {pkg}: NOT INSTALLED")

print("\n[2] LOADING ENVIRONMENT:")
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY", "")
if not api_key:
    print("  - GEMINI_API_KEY is EMPTY")
else:
    print(f"  - Key format: {api_key[:3]}...{api_key[-3:]} | Length: {len(api_key)}")

print("\n[3] TESTING AUTHENTICATION (Using google.genai):")
try:
    from google import genai
    print("  - SDK Loaded: google.genai")
    
    client = genai.Client(api_key=api_key)
    print("  - Configuration applied. Attempting API call...")
    
    response = client.models.generate_content(
        model='gemini-2.5-flash-lite',
        contents='Hello'
    )
    print("  - SUCCESS! Model responded:", response.text)
except Exception as e:
    print("\n[X] AUTHENTICATION FAILED. FULL EXCEPTION TRACE:")
    traceback.print_exc()

print("\n--- DIAGNOSTIC COMPLETE ---")
