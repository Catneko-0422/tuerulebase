from flask import Blueprint, request, jsonify
from src.models.user import User
from src.extensions import db
from src.utils.decorators import admin_required
from werkzeug.security import generate_password_hash
from flask_jwt_extended import get_jwt_identity
from src.utils.validators import validate_password_strength

user_bp = Blueprint('user', __name__)

def verify_admin_password(password):
    """驗證當前登入的管理員密碼"""
    admin_id = get_jwt_identity()
    admin_user = User.query.get(admin_id)
    if not admin_user or not password or not admin_user.check_password(password):
        return False
    return True

@user_bp.route('', methods=['GET'])
@admin_required()
def get_users():
    try:
        # 取得查詢參數
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        sort_by = request.args.get('sort_by', 'id')
        sort_order = request.args.get('sort_order', 'asc')
        show_only_requested = request.args.get('show_only_requested', 'false').lower() == 'true'

        query = User.query

        # 搜尋 (Username 或 Email)
        if search:
            search_term = f"%{search}%"
            query = query.filter(or_(User.username.ilike(search_term), User.email.ilike(search_term)))
        
        # 篩選 (只顯示請求重設密碼)
        if show_only_requested:
            query = query.filter(User.reset_password_requested == True)

        # 排序
        sort_column = getattr(User, sort_by, None)
        # 確保該屬性存在且具有 asc/desc 方法 (避免 User.query 或其他方法被誤用導致 500 錯誤)
        if sort_column and hasattr(sort_column, 'asc'):
            if sort_order == 'desc':
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(User.id.asc()) # 預設排序

        # 分頁
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        users = pagination.items

        users = User.query.all()
        return jsonify({
            "data": {
                "users": [
                    {
                        "id": u.id,
                        "username": u.username,
                        "role": u.role,
                        "is_superuser": u.is_superuser,
                        "email": u.email,
                        "reset_password_requested": u.reset_password_requested
                    } for u in users
                ],
                "pagination": {
                    "total": pagination.total,
                    "pages": pagination.pages,
                    "page": page,
                    "per_page": per_page
                }
            }
        }), 200
    except Exception as e:
        return jsonify({"message": f"Server Error: {str(e)}"}), 500

@user_bp.route('', methods=['POST'])
@admin_required()
def create_user():
    try:
        data = request.get_json()
        if not data:
             return jsonify({"message": "No input data provided"}), 400
             
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'staff')
        email = data.get('email')
        current_password = data.get('current_password')

        # 驗證管理員密碼
        if not verify_admin_password(current_password):
            return jsonify({"message": "Invalid admin password"}), 401

        if not username or not password:
            return jsonify({"message": "Username and password are required"}), 400

        if not validate_password_strength(password):
            return jsonify({"message": "Password must be at least 8 characters long and contain both uppercase and lowercase letters"}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"message": "Username already exists"}), 400

        if email and User.query.filter_by(email=email).first():
            return jsonify({"message": "Email already exists"}), 400

        new_user = User(username=username, role=role, email=email, is_password_changed=False)
        
        # 處理密碼雜湊
        if hasattr(new_user, 'set_password'):
            new_user.set_password(password)
        else:
            new_user.password_hash = generate_password_hash(password)
            
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create user error: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500
        return jsonify({"message": f"Server Error: {str(e)}"}), 500

@user_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@admin_required()
def reset_password(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        data = request.get_json()
        new_password = data.get('password')
        current_password = data.get('current_password')

        # 驗證管理員密碼
        if not verify_admin_password(current_password):
            return jsonify({"message": "Invalid admin password"}), 401
        
        if not new_password or not validate_password_strength(new_password):
            return jsonify({"message": "Password must be at least 8 characters long and contain both uppercase and lowercase letters"}), 400

        if hasattr(user, 'set_password'):
            user.set_password(new_password)
        else:
            user.password_hash = generate_password_hash(new_password)
        
        user.is_password_changed = False
        user.reset_password_requested = False
        db.session.commit()

        return jsonify({"message": "Password reset successfully"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Reset password error: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500
        return jsonify({"message": f"Server Error: {str(e)}"}), 500

@user_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required()
def delete_user(user_id):
    try:
        # 刪除操作也需要驗證管理員密碼
        data = request.get_json() or {}
        current_password = data.get('current_password')

        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        if user.is_superuser:
            return jsonify({"message": "Cannot delete superuser"}), 403
        
        # Prevent self-deletion
        if str(user.id) == str(get_jwt_identity()):
            return jsonify({"message": "Cannot delete yourself"}), 403

        if not verify_admin_password(current_password):
            return jsonify({"message": "Invalid admin password"}), 401

        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete user error: {str(e)}")
        return jsonify({"message": "Internal Server Error"}), 500
        return jsonify({"message": f"Server Error: {str(e)}"}), 500