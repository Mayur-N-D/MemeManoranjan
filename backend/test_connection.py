import os
from dotenv import load_dotenv
from pymongo import MongoClient
import sys

def test():
    print("Testing connection...")
    load_dotenv()
    uri = os.getenv('MONGO_URI')
    if not uri:
        print("Error: MONGO_URI not found in .env")
        return
    
    try:
        client = MongoClient(uri)
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster')
        print("✅ Successfully connected to MongoDB!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    test()
