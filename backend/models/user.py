from pymongo import MongoClient
import os
from datetime import datetime
import bcrypt

# Database initialization
MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    print("❌ CRITICAL: MONGO_URI not found in environment!")
    client = None
    db = None
    users_collection = None
else:
    try:
        client = MongoClient(MONGO_URI)
        # Explicitly specify the database name or it will default to 'test'
        db = client.get_database('mememanoranjan')
        users_collection = db.users
        print("✅ User Model initialized with MongoDB")
    except Exception as e:
        print(f"❌ Error connecting to MongoDB in User model: {e}")
        client = None
        db = None
        users_collection = None

class User:
    @staticmethod
    def create_user(username, email, password):
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user_data = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "created_at": datetime.utcnow()
        }
        
        return users_collection.insert_one(user_data)

    @staticmethod
    def find_by_email(email):
        return users_collection.find_one({"email": email})

    @staticmethod
    def verify_password(plain_password, hashed_password):
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)
