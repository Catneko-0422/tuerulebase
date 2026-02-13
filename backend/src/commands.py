import click
from flask.cli import with_appcontext
from src.extensions import db
from src.models.user import User

@click.command('create-admin')
@click.argument('username')
@click.argument('password')
@with_appcontext
def create_admin(username, password):
    """建立最高權限的 Root Admin (ISO 27001)"""
    
    # 檢查是否已經存在
    if User.query.filter_by(username=username).first():
        click.echo(f'Error: User {username} already exists!')
        return

    user = User(
        username=username, 
        role='admin',
        is_superuser=True,     # 標記為上帝
        is_password_changed=True # Root 不需要強制改密碼
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    click.echo(f'✅ Successfully created Superuser: {username}')