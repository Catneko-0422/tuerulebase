from flask import Flask
from flask_cors import CORS
from src.config import Config
from src.extensions import db, migrate, cors, jwt

def create_app(config_class=Config):
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    # 設定 CORS，允許前端存取並攜帶 Cookie (supports_credentials=True)
    cors.init_app(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}}, supports_credentials=True)
    jwt.init_app(app)

    # 註冊UserModel
    from src.models.user import User

    # 註冊TokenBlocklistModel 用於JWT登出
    from src.models.token_blocklist import TokenBlocklist

    # 註冊CodingRule Model
    from src.models.coding_rule import CodingRule, CodingNode

    # 註冊路由
    from src.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')

    from src.routes.user import user_bp
    app.register_blueprint(user_bp, url_prefix='/api/v1/users')

    from src.routes.coding_rules import coding_rules_bp
    app.register_blueprint(coding_rules_bp, url_prefix='/api/v1/coding-rules')

    # 註冊flask cli命令
    from src.commands import create_admin
    app.cli.add_command(create_admin)

    # 註冊JWT檢查邏輯，確保被封鎖的Token無法使用
    import src.utils.jwt_check

    

    return app