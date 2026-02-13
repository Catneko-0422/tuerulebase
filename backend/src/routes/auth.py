from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, set_access_cookies, unset_jwt_cookies, get_jwt_identity
from src.services.auth import login_service, logout_service
from src.models.user import User
from src.extensions import db
from werkzeug.security import generate_password_hash
from src.utils.validators import validate_password_strength

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "No input data provided"}), 400

        result = login_service(data)

        if result:
            access_token, user_info = result
            
            response = jsonify({
                "message": "Login successful",
                "data": { "user": user_info }
            })
            set_access_cookies(response, access_token)
            return response, 200
        else:
            return jsonify({"message": "Invalid username or password"}), 401

    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500
    
@auth_bp.route('/logout', methods=['POST'])
@jwt_required() # 必須帶 Token 才能呼叫
def logout():
    try:
        jti = get_jwt()["jti"]
        
        # 呼叫 Service 將已使用的 Token 加入黑名單
        logout_service(jti)
        
        response = jsonify({"message": "Successfully logged out"})
        unset_jwt_cookies(response)
        return response, 200
        
    except Exception as e:
        response = jsonify({"message": "Logout failed"})
        unset_jwt_cookies(response)
        current_app.logger.error(f"Logout error: {str(e)}")
        return response, 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    try:
        # 從 Token 中取得 User ID
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404

        user_info = {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "is_superuser": user.is_superuser,
            "is_password_changed": user.is_password_changed,
            "email": user.email
        }
        return jsonify({
            "message": "User info retrieved",
            "data": {"user": user_info}
        }), 200
    except Exception as e:
        current_app.logger.error(f"Me endpoint error: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not user.check_password(current_password):
            return jsonify({"message": "Invalid current password"}), 401

        if not validate_password_strength(new_password):
            return jsonify({"message": "Password must be at least 8 characters long and contain both uppercase and lowercase letters"}), 400

        if hasattr(user, 'set_password'):
            user.set_password(new_password)
        else:
            user.password_hash = generate_password_hash(new_password)
        
        user.is_password_changed = True
        db.session.commit()

        return jsonify({"message": "Password changed successfully"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Change password error: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        username = data.get('username')
        
        if not username:
             return jsonify({"message": "Username is required"}), 400

        user = User.query.filter_by(username=username).first()
        if user:
            user.reset_password_requested = True
            db.session.commit()
        
        return jsonify({"message": "Request submitted"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Forgot password error: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500