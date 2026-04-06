import os
from flask import Flask, jsonify
from flask_cors import CORS
from routes.auth import auth_bp
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-secret-key')

MONGO_URI = os.getenv('MONGO_URI')
print("MONGO_URI:", MONGO_URI)

db = None

if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI)
        db = client.get_database('mememanoranjan')
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"❌ MongoDB error: {e}")
else:
    print("❌ MONGO_URI not found")

app.register_blueprint(auth_bp, url_prefix='/api/auth')

@app.route('/')
def home():
    return jsonify({"message": "MemeManoranjan Auth API is running!"})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)