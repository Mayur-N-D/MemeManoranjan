from flask import Blueprint, request, jsonify
from models.user import User
import jwt
import datetime
import os
from google.oauth2 import id_token
from google.auth.transport import requests

auth_bp = Blueprint('auth', __name__)
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret-key')
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    data = request.get_json()
    token = data.get('token')
    
    if not token:
        return jsonify({"error": "No token provided"}), 400
        
    try:
        # Verify the ID token from Google
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        
        # ID token is valid. Get user's Google ID, Email, and Name.
        google_user_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        
        # Check if user exists
        user = User.find_by_email(email)
        
        if not user:
            # Create a new user (with an empty password or random one)
            User.create_user(name, email, "GOOGLE_AUTH_" + google_user_id)
            user = User.find_by_email(email)
            
        # Generate JWT Token
        jwt_token = jwt.encode({
            'user_id': str(user['_id']),
            'username': user.get('username', ''),
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, JWT_SECRET, algorithm="HS256")
        
        return jsonify({
            "token": jwt_token,
            "user": {
                "username": user.get('username', ''),
                "email": user['email']
            }
        }), 200
        
    except ValueError as e:
        # Invalid token
        return jsonify({"error": f"Invalid Google token: {str(e)}"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Check if user already exists
    if User.find_by_email(data['email']):
        return jsonify({"error": "Email already registered"}), 400
    
    try:
        User.create_user(data['username'], data['email'], data['password'])
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400
    
    user = User.find_by_email(data['email'])
    
    if user and User.verify_password(data['password'], user['password']):
        # Generate JWT Token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'username': user.get('username', ''),
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, JWT_SECRET, algorithm="HS256")
        
        return jsonify({
            "token": token,
            "user": {
                "username": user.get('username', ''),
                "email": user['email']
            }
        }), 200
    
    return jsonify({"error": "Invalid email or password"}), 401
