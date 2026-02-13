from src.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # 角色控制
    role = db.Column(db.String(20), default='staff') # 'admin' or 'staff'

    reset_password_requested = db.Column(db.Boolean, default=False)
    
    # 是否為上帝帳號 (Root)
    is_superuser = db.Column(db.Boolean, default=False)
    
    # 強制改密碼 (首次登入用)
    is_password_changed = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'