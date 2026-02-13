from src.extensions import jwt, db
from src.models.token_blocklist import TokenBlocklist

@jwt.token_in_blocklist_loader
def check_if_token_in_blocklist(jwt_header, jwt_payload):
    jti = jwt_payload["jti"] # 拿出這張 Token 的身分證號
    
    # 去資料庫查，如果有找到，代表這張 Token 被封鎖了
    token = db.session.query(TokenBlocklist.id).filter_by(jti=jti).scalar()
    
    return token is not None