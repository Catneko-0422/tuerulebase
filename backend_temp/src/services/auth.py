import logging
from src.extensions import db
from src.models.user import User
from flask_jwt_extended import create_access_token
from src.models.token_blocklist import TokenBlocklist

logger = logging.getLogger(__name__)

def login_service(data):
    """
    處理登入邏輯：
    1. 驗證帳密
    2. 簽發 JWT
    3. 回傳使用者資訊
    """
    username = data.get('username')
    password = data.get('password')

    # 0. 基礎輸入驗證 (防止非字串或過長輸入導致的 DoS)
    if not username or not password or not isinstance(username, str) or not isinstance(password, str):
        return None
    if len(username) > 255 or len(password) > 128:
        return None

    # 1. 找人
    user = User.query.filter_by(username=username).first()

    # 2. 驗證密碼 (如果人不存在 or 密碼錯，統一回傳 False 避免被猜帳號)
    if not user or not user.check_password(password):
        return None

    # 3. 簽發 Token (把 User ID 和 Role 藏在 Token 裡)
    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})

    # 4. 回傳 Token 與使用者資訊 (Token 交由 Controller 設定 Cookie，User 資訊回傳 JSON)
    user_info = {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "is_superuser": user.is_superuser,
        "is_password_changed": user.is_password_changed
    }
    return access_token, user_info

def logout_service(jti):
    """
    將 Token 的 JTI 加入黑名單
    """
    try:
        # 建立一筆掛失紀錄
        blocked_token = TokenBlocklist(jti=jti)
        db.session.add(blocked_token)
        db.session.commit()
        return True
    except Exception as e:
        logger.error(f"Error revoking token {jti}: {str(e)}")
        db.session.rollback()
        return False