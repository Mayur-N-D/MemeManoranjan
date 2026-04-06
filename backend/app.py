import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from routes.auth import auth_bp
from pymongo import MongoClient

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Config
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-secret-key')
MONGO_URI = os.getenv('MONGO_URI')

# Database connection
try:
    client = MongoClient(MONGO_URI)
    # Explicitly specify the database name
    db = client.get_database('mememanoranjan')
    print("✅ Successfully connected to MongoDB Atlas (mememanoranjan)")
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {e}")
    db = None

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')

@app.route('/')
def home():
    return jsonify({"message": "MemeManoranjan Auth API is running!"})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
